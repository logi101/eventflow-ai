import { useMutation } from '@tanstack/react-query'
import { analyzeVendor } from '../services/vendorAnalysisService'

export function useVendorAnalysis() {
  return useMutation({
    mutationFn: ({
      checklistItemId,
      eventId
    }: {
      checklistItemId: string
      eventId: string
    }) => analyzeVendor(checklistItemId, eventId)
  })
}
