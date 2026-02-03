import { supabase } from '../../../lib/supabase'

export interface VendorAlternative {
  name: string
  rating: number | null
  city: string | null
  pastEvents: Array<{
    eventName: string
    date: string
    amount: number
  }>
}

export interface VendorAnalysisResult {
  analysis: string
  currentVendor: {
    name: string
    rating: number | null
    amount: number
    budgetPercent: number | null
  } | null
  alternatives: VendorAlternative[]
  budgetAllocation: number | null
}

export async function analyzeVendor(
  checklistItemId: string,
  eventId: string
): Promise<VendorAnalysisResult> {
  const { data, error } = await supabase.functions.invoke('vendor-analysis', {
    body: { checklistItemId, eventId }
  })

  if (error) throw error
  return data as VendorAnalysisResult
}
