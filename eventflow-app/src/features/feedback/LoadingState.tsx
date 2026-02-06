import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'inline' | 'full' | 'card'
}

export type { LoadingStateProps }

export function LoadingState({
  message = 'טוען...',
  size = 'md',
  variant = 'full'
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  const variantClasses = {
    inline: 'flex items-center gap-2 text-zinc-400',
    full: 'flex flex-col items-center justify-center py-12 text-zinc-400',
    card: 'flex flex-col items-center justify-center py-12 text-zinc-400'
  }

  return (
    <div className={variantClasses[variant]} role="status" aria-busy="true" aria-live="polite">
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} aria-hidden="true" />
      {message && (
        <p className="mt-4 text-sm">
          {message}
        </p>
      )}
    </div>
  )
}
