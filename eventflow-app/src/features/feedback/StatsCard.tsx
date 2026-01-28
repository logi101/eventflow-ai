import type { ReactNode } from 'react'
import { Loader2, Calendar, Users, CheckSquare } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number | string
  loading?: boolean
  subtitle?: string
  color?: 'orange' | 'yellow' | 'white'
  icon?: ReactNode
  to?: string
}

export type { StatsCardProps }

export function StatsCard({
  title,
  value,
  loading = false,
  subtitle,
  color = 'white',
  icon,
  to
}: StatsCardProps) {
  const Wrapper = to ? 'a' : 'div'
  const wrapperProps = to ? { href: to } : {}

  const colorClasses = {
    orange: 'group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden text-center',
    yellow: 'group relative premium-stats-card yellow hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden text-center',
    white: 'group relative premium-stats-card white hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden text-center'
  }

  return (
    <Wrapper
      {...wrapperProps}
      className={`${colorClasses[color]} ${to ? 'block' : ''}`}
    >
      {icon || (
        <div className="mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {color === 'orange' && <Calendar size={32} className="mx-auto text-orange-500" />}
          {color === 'yellow' && <Users size={32} className="mx-auto text-yellow-500" />}
          {color === 'white' && <CheckSquare size={32} className="mx-auto text-white" />}
        </div>
      )}
      <h2 className="text-base font-medium mb-4 text-zinc-400 tracking-wide">
        {title}
      </h2>
      <p className="text-5xl font-bold transition-transform duration-300 group-hover:scale-105">
        {loading ? <Loader2 className="animate-spin" size={20} /> : value}
      </p>
      {subtitle && (
        <p className="text-xs text-zinc-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {subtitle}
        </p>
      )}
    </Wrapper>
  )
}
