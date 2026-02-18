import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'
import {
  getOrganizationData,
  hasPremiumAccess,
  createPremiumRequiredResponse
} from '../_shared/quota-check.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authenticated user
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiKey = Deno.env.get('GEMINI_API_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const genAI = new GoogleGenerativeAI(geminiKey)

    const { checklistItemId, eventId } = await req.json()

    if (!checklistItemId) {
      return new Response(JSON.stringify({ error: 'checklistItemId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Phase 2.1: Premium feature check — vendor analysis requires Premium tier
    if (eventId) {
      const { data: event } = await supabase
        .from('events')
        .select('organization_id')
        .eq('id', eventId)
        .single()

      if (event?.organization_id) {
        const org = await getOrganizationData(supabase, event.organization_id)
        if (org && !hasPremiumAccess(org.tier)) {
          console.log(`Vendor analysis blocked for org ${event.organization_id}, tier: ${org.tier}`)
          return createPremiumRequiredResponse('vendor_analysis')
        }
      }
    }

    // Fetch checklist item with budget and assigned vendor
    const { data: item, error: itemError } = await supabase
      .from('checklist_items')
      .select(`
        id,
        title,
        budget_allocation,
        event_vendors!assigned_vendor_id (
          id,
          vendor_id,
          quoted_amount,
          approved_amount,
          status,
          vendors (
            id,
            name,
            rating,
            category_id,
            vendor_categories (name)
          )
        )
      `)
      .eq('id', checklistItemId)
      .single()

    if (itemError || !item) {
      throw new Error('Checklist item not found')
    }

    const vendorData = item.event_vendors as any
    const currentVendor = vendorData?.vendors as any
    const categoryId = currentVendor?.category_id

    // Fetch alternative vendors in same category
    const { data: alternatives } = await supabase
      .from('vendors')
      .select(`
        id,
        name,
        rating,
        phone,
        city,
        event_vendors (
          event_id,
          quoted_amount,
          approved_amount,
          status,
          events (name, start_date)
        )
      `)
      .eq('category_id', categoryId)
      .neq('id', currentVendor?.id)
      .order('rating', { ascending: false })
      .limit(5)

    // Build past usage context for alternatives
    const alternativesWithHistory = (alternatives || []).map(v => {
      const pastEvents = v.event_vendors
        ?.filter((ev: any) => ev.status === 'confirmed')
        .map((ev: any) => ({
          eventName: ev.events?.name,
          date: ev.events?.start_date,
          amount: ev.approved_amount || ev.quoted_amount
        }))
        .slice(0, 3) || []

      return {
        name: v.name,
        rating: v.rating,
        city: v.city,
        pastEvents
      }
    })

    // Build prompt for Gemini
    const currentAmount = vendorData?.approved_amount || vendorData?.quoted_amount || 0
    const budgetPercent = item.budget_allocation
      ? Math.round((currentAmount / item.budget_allocation) * 100)
      : null

    const prompt = `אתה יועץ הפקת אירועים מומחה. נא לנתח את הנתונים הבאים ולספק המלצה בעברית:

## פרטי הפריט
- שם: ${item.title}
- תקציב: ${item.budget_allocation?.toLocaleString() || 'לא הוגדר'} ₪

## הצעה נוכחית
- ספק: ${currentVendor?.name || 'לא נבחר'}
- מחיר: ${currentAmount.toLocaleString()} ₪
- דירוג: ${currentVendor?.rating || 'אין'}/5
${budgetPercent ? `- ניצול תקציב: ${budgetPercent}%` : ''}

## ספקים חלופיים באותה קטגוריה
${alternativesWithHistory.map((v, i) => `
${i + 1}. ${v.name}
   - דירוג: ${v.rating || 'אין'}/5
   - עיר: ${v.city || 'לא ידוע'}
   ${v.pastEvents.length > 0 ? `- היסטוריה: ${v.pastEvents.map((e: any) => `${e.eventName} (${e.amount?.toLocaleString()} ₪)`).join(', ')}` : '- אין היסטוריה קודמת'}
`).join('')}

## משימה
1. האם ההצעה הנוכחית סבירה ביחס לתקציב?
2. אם התקציב חורג, הצע חלופה עם הסבר
3. אם יש ספק עם דירוג גבוה יותר במחיר דומה - ציין
4. התייחס להיסטוריה קודמת אם רלוונטית

ענה בפורמט:
📊 **סיכום:** [משפט אחד]
💡 **המלצה:** [2-3 משפטים]
🔄 **חלופות מומלצות:** [אם יש]`

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    const result = await model.generateContent(prompt)
    const analysis = result.response.text()

    return new Response(JSON.stringify({
      analysis,
      currentVendor: {
        name: currentVendor?.name,
        rating: currentVendor?.rating,
        amount: currentAmount,
        budgetPercent
      },
      alternatives: alternativesWithHistory,
      budgetAllocation: item.budget_allocation
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Vendor analysis error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
