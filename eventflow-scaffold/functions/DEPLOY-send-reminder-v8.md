# Deploy send-reminder v8 with Test Mode

## Context

Task 04-02 requires updating the deployed send-reminder Edge Function (currently v7) to support test mode.

**Problem**: The GSD executor does not have access to MCP tools (`get_edge_function`, `deploy_edge_function`) needed to fetch and deploy Edge Functions.

**Solution**: Manual deployment required.

## Deployment Steps

### Option 1: Via MCP (if available in your environment)

```bash
# 1. Get current deployed v7 function
mcp get_edge_function --project_id byhohetafnhlakqbydbj --function_name send-reminder

# 2. Add test mode handler at the top of request processing (after body = await req.json())
# See: send-reminder-v8-with-test.ts for the test mode handler code

# 3. Deploy updated function
mcp deploy_edge_function --project_id byhohetafnhlakqbydbj --function_name send-reminder --verify_jwt true
```

### Option 2: Via Supabase CLI

```bash
# 1. Get current deployed function from Supabase Dashboard
# Navigate to: Edge Functions > send-reminder > View code

# 2. Add test mode handler (lines 94-170 from send-reminder-v8-with-test.ts)
# Insert after: const body = await req.json()
# Before: const { type }: ReminderJob = body

# 3. Deploy
supabase functions deploy send-reminder --project-ref byhohetafnhlakqbydbj
```

### Option 3: Via Supabase Dashboard

1. Go to Supabase Dashboard > Project: byhohetafnhlakqbydbj
2. Navigate to Edge Functions > send-reminder
3. Click "Edit function"
4. Add the test mode handler code block from `send-reminder-v8-with-test.ts` (lines 94-170)
5. Place it after `const body = await req.json()` and before `const { type }: ReminderJob = body`
6. Click "Deploy"

## Test Mode Handler Code Block

Insert this code after parsing the request body:

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// TEST MODE HANDLER
// ═══════════════════════════════════════════════════════════════════════════
if (body.mode === 'test') {
  const { event_id, test_phone, type: reminderType } = body

  if (!event_id || !test_phone) {
    return new Response(JSON.stringify({ success: false, message: 'Missing event_id or test_phone' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }

  // Fetch event data
  const { data: event } = await supabase
    .from('events')
    .select('id, name, start_date, venue_name, venue_address, organization_id')
    .eq('id', event_id)
    .single()

  if (!event) {
    return new Response(JSON.stringify({ success: false, message: 'Event not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    })
  }

  // Fetch template (same as production)
  const template = await getMessageTemplate(supabase, event.organization_id, `reminder_${reminderType || 'activation'}`)

  // Build test message
  const testParticipant = { first_name: 'בדיקה' }
  const variableMap = buildEventVariableMap(event, testParticipant)
  const message = template
    ? substituteVariables(template, variableMap)
    : `הודעת בדיקה עבור אירוע: ${event.name}`

  // Send via send-whatsapp function
  const whatsappResponse = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        to: test_phone,
        message: message,
        organization_id: event.organization_id
      })
    }
  )

  // Log test message to messages table with is_test flag
  await supabase.from('messages').insert({
    event_id: event.id,
    participant_id: null,
    message_type: `reminder_${reminderType || 'activation'}`,
    subject: `test_reminder_${reminderType || 'activation'}`,
    content: message,
    recipient_phone: test_phone,
    status: whatsappResponse.ok ? 'sent' : 'failed',
    channel: 'whatsapp',
    metadata: { is_test: true }
  })

  return new Response(JSON.stringify({
    success: whatsappResponse.ok,
    message: whatsappResponse.ok ? 'Test message sent' : 'Failed to send test message'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
```

## Verification

After deployment:

1. Open EventFlow app: http://localhost:5173
2. Navigate to any event detail page
3. Go to "הגדרות תזכורות" tab
4. Scroll to "בדיקת תזכורות" section
5. Enter phone number (format: 05X-XXXXXXX)
6. Click "שלח הודעת בדיקה"
7. Verify WhatsApp message received

## Critical Notes

- **DO NOT** remove any existing v7 code
- **DO NOT** modify the template utility functions (already exist in v7)
- **ONLY ADD** the test mode handler block at the top
- Test mode handler must come BEFORE the production `const { type }: ReminderJob = body` line
- Uses `message_type` column (NOT `type`) for messages table insert
- Test messages have `metadata: { is_test: true }` to keep them separate from production
