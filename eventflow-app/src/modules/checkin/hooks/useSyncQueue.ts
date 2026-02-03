import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export function useSyncQueue(eventId?: string) {
  // Live query - updates automatically when IndexedDB changes
  const pendingCount = useLiveQuery(
    async () => {
      if (eventId) {
        return db.checkIns
          .where({ synced: 0, eventId })
          .count()
      }
      return db.checkIns.where('synced').equals(0).count()
    },
    [eventId],
    0  // Default value while loading
  )

  const pendingCheckIns = useLiveQuery(
    async () => {
      const query = db.checkIns.where('synced').equals(0)
      if (eventId) {
        const all = await query.toArray()
        return all.filter(c => c.eventId === eventId)
      }
      return query.toArray()
    },
    [eventId],
    []
  )

  return {
    pendingCount: pendingCount ?? 0,
    pendingCheckIns: pendingCheckIns ?? [],
    hasPending: (pendingCount ?? 0) > 0
  }
}
