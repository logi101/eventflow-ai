import type { ProgramDay, Speaker, ExtendedSchedule } from '../../../types'

interface EventOverviewTabProps {
  description?: string | null
  programDays: ProgramDay[]
  sessions: ExtendedSchedule[]
  speakers: Speaker[]
}

export function EventOverviewTab({
  description,
  programDays,
  sessions,
  speakers
}: EventOverviewTabProps) {
  return (
    <div className="space-y-6">
      {description && (
        <div className="card">
          <h2 className="text-xl font-bold mb-2">תיאור</h2>
          <p className="text-zinc-400">{description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-orange-500">{programDays.length}</p>
          <p className="text-zinc-400">ימי תוכנית</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-500">{sessions.length}</p>
          <p className="text-zinc-400">מפגשים</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-500">{speakers.length}</p>
          <p className="text-zinc-400">דוברים</p>
        </div>
      </div>
    </div>
  )
}
