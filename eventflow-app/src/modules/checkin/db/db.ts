import Dexie, { type Table } from 'dexie'
import { type OfflineCheckIn, type CachedParticipant, DB_NAME, DB_VERSION } from './schema'

export class CheckInDatabase extends Dexie {
  checkIns!: Table<OfflineCheckIn>
  participants!: Table<CachedParticipant>

  constructor() {
    super(DB_NAME)

    this.version(DB_VERSION).stores({
      // Indexes: ++id = auto-increment, & = unique
      checkIns: '++id, participantId, eventId, synced, checkedInAt',
      participants: 'id, eventId, status, expiresAt'
    })
  }
}

// Singleton instance
export const db = new CheckInDatabase()
