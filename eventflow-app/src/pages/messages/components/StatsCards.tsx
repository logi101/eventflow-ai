import type { useMessageStats } from '../../../hooks/useMessages'

interface StatsCardsProps {
  stats: ReturnType<typeof useMessageStats>['data']
  isLoading: boolean
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg p-4 bg-zinc-800 border border-zinc-700 animate-pulse">
            <div className="h-8 bg-zinc-700 rounded mb-2"></div>
            <div className="h-4 bg-zinc-700 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    { label: 'סה"כ', value: stats.total, color: 'bg-zinc-700/50 text-zinc-300' },
    { label: 'יוצאות', value: stats.byDirection.outgoing, color: 'bg-blue-900/40 text-blue-300' },
    { label: 'נכנסות', value: stats.byDirection.incoming, color: 'bg-purple-900/40 text-purple-300' },
    { label: 'נמסרו', value: stats.delivered, color: 'bg-green-900/40 text-green-300' },
    { label: 'נקראו', value: stats.read, color: 'bg-emerald-900/40 text-emerald-300' },
    { label: 'נכשלו', value: stats.failed, color: 'bg-red-900/40 text-red-300' }
  ]

  return (
    <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map(card => (
        <div key={card.label} className={`relative rounded-lg p-4 border border-zinc-700 ${card.color}`}>
          <div className="text-2xl font-bold relative z-10">{card.value}</div>
          <div className="text-sm relative z-10">{card.label}</div>
        </div>
      ))}
    </div>
  )
}
