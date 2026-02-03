// ═══════════════════════════════════════════════════════════════════════════
// TrackChip Component - Color-coded track badge
// ═══════════════════════════════════════════════════════════════════════════

import type { Track } from '@/types'

interface TrackChipProps {
  track: Track
  onRemove?: () => void
  size?: 'xs' | 'sm' | 'md'
}

export function TrackChip({ track, onRemove, size = 'sm' }: TrackChipProps) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  }

  // Convert hex color to rgba with 20% opacity for background
  const backgroundColor = `${track.color}20`
  const borderColor = track.color
  const textColor = track.color

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor,
        color: textColor,
        borderColor,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      {track.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="hover:opacity-70 transition-opacity ml-1"
          aria-label={`הסר מסלול ${track.name}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
