import type { ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export type { EmptyStateProps }

export function EmptyState({
  title,
  description,
  icon,
  action,
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16'
  }

  return (
    <div className={`text-center ${sizeClasses[size]} text-zinc-400`}>
      {icon || (
        <div className="mb-4">
          <BarChart3 className="w-16 h-16 mx-auto text-gray-300" />
        </div>
      )}
      <h3 className="text-lg font-medium mb-2 text-zinc-500">
        {title}
      </h3>
      {description && (
        <p className="text-base mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  )
}
