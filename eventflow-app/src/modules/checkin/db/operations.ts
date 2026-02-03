import { db } from './db'
import { type OfflineCheckIn, type CachedParticipant, PARTICIPANT_TTL_MS } from './schema'

// ============== Check-In Operations ==============

export async function addOfflineCheckIn(
  participantId: string,
  eventId: string
): Promise<number> {
  const checkIn: OfflineCheckIn = {
    participantId,
    eventId,
    checkedInAt: new Date(),
    synced: false,
    syncRetries: 0
  }

  // Check for existing unsynced check-in (dedup)
  const existing = await db.checkIns
    .where({ participantId, eventId, synced: false })
    .first()

  if (existing) {
    // Last-wins: update timestamp
    await db.checkIns.update(existing.id!, { checkedInAt: new Date() })
    return existing.id!
  }

  return db.checkIns.add(checkIn)
}

export async function getPendingCheckIns(eventId?: string): Promise<OfflineCheckIn[]> {
  const query = db.checkIns.where('synced').equals(0)

  if (eventId) {
    const results = await query.toArray()
    return results.filter(c => c.eventId === eventId)
  }

  return query.toArray()
}

export async function markCheckInSynced(localId: number): Promise<void> {
  await db.checkIns.update(localId, { synced: true })
}

export async function incrementSyncRetry(localId: number): Promise<void> {
  const checkIn = await db.checkIns.get(localId)
  if (checkIn) {
    await db.checkIns.update(localId, {
      syncRetries: checkIn.syncRetries + 1,
      lastSyncAttempt: new Date()
    })
  }
}

// ============== Participant Cache Operations ==============

export async function cacheParticipants(
  participants: CachedParticipant[],
  eventId: string
): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + PARTICIPANT_TTL_MS)

  const withTTL = participants.map(p => ({
    ...p,
    eventId,
    cachedAt: now,
    expiresAt
  }))

  // Bulk upsert - Dexie handles conflicts
  await db.participants.bulkPut(withTTL)
}

export async function getCachedParticipants(
  eventId: string
): Promise<CachedParticipant[]> {
  const now = new Date()

  return db.participants
    .where('eventId')
    .equals(eventId)
    .filter(p => p.expiresAt > now)  // Filter expired
    .toArray()
}

export async function updateCachedParticipantStatus(
  participantId: string,
  status: string
): Promise<void> {
  await db.participants.update(participantId, { status })
}

export async function clearExpiredCache(): Promise<number> {
  const now = new Date()
  return db.participants
    .where('expiresAt')
    .below(now)
    .delete()
}

export async function clearEventCache(eventId: string): Promise<void> {
  await db.participants.where('eventId').equals(eventId).delete()
  await db.checkIns.where('eventId').equals(eventId).delete()
}
