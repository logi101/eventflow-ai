import { useState } from 'react'
import { Sparkles, Loader2, AlertTriangle, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { useVendorAnalysis } from '../hooks/useVendorAnalysis'
import type { VendorAlternative } from '../services/vendorAnalysisService'
import { FeatureGuard } from '../../../components/guards'

interface VendorIntelligenceProps {
  checklistItemId: string
  eventId: string
  itemTitle: string
  currentVendorName?: string
  budgetPercent?: number
}

export function VendorIntelligence({
  checklistItemId,
  eventId,
  itemTitle,
  budgetPercent
}: VendorIntelligenceProps) {
  const [expanded, setExpanded] = useState(false)
  const analysis = useVendorAnalysis()

  const handleAnalyze = async () => {
    setExpanded(true)
    analysis.mutate({ checklistItemId, eventId })
  }

  const isOverBudget = budgetPercent && budgetPercent >= 80

  return (
    <FeatureGuard feature="vendor_analysis">
      <div className="bg-[#1a1d27] rounded-xl border border-white/10 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={expanded ? () => setExpanded(!expanded) : handleAnalyze}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isOverBudget
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-purple-500/20 text-purple-400'
          }`}>
            {isOverBudget ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-white">ניתוח ספקים AI</p>
            <p className="text-xs text-zinc-400">{itemTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis.isPending && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </button>

      {/* Analysis Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5">
          {analysis.isPending && (
            <div className="py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">מנתח נתוני ספקים...</p>
            </div>
          )}

          {analysis.error && (
            <div className="py-4 text-center text-red-400">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">שגיאה בניתוח: {analysis.error.message}</p>
              <button
                onClick={() => analysis.mutate({ checklistItemId, eventId })}
                className="mt-2 text-xs text-purple-400 hover:underline"
              >
                נסה שוב
              </button>
            </div>
          )}

          {analysis.data && (
            <div className="space-y-4 pt-4">
              {/* AI Analysis */}
              <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-4">
                <div
                  className="prose prose-invert prose-sm max-w-none text-zinc-300 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formatAnalysis(analysis.data.analysis) }}
                />
              </div>

              {/* Alternatives */}
              {analysis.data.alternatives.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">ספקים חלופיים</h4>
                  <div className="space-y-2">
                    {analysis.data.alternatives.slice(0, 3).map((alt, i) => (
                      <AlternativeCard key={i} vendor={alt} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!analysis.isPending && !analysis.data && !analysis.error && (
            <div className="py-4 text-center">
              <button
                onClick={() => analysis.mutate({ checklistItemId, eventId })}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium text-sm hover:shadow-lg transition-shadow"
              >
                <Sparkles className="w-4 h-4 inline-block ml-2" />
                נתח עכשיו
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </FeatureGuard>
  )
}

function AlternativeCard({ vendor }: { vendor: VendorAlternative }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white">{vendor.name}</p>
        {vendor.city && (
          <p className="text-xs text-zinc-400">{vendor.city}</p>
        )}
        {vendor.pastEvents.length > 0 && (
          <p className="text-xs text-emerald-400 mt-1">
            שימוש קודם: {vendor.pastEvents[0].eventName}
          </p>
        )}
      </div>
      {vendor.rating && (
        <div className="flex items-center gap-1 text-amber-400">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span className="text-sm">{vendor.rating}</span>
        </div>
      )}
    </div>
  )
}

// Format AI analysis with bold/emoji support
function formatAnalysis(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />')
}
