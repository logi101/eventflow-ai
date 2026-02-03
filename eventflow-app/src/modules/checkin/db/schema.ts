// IndexedDB schema for offline check-in support
// Uses Dexie.js for browser storage with 24h TTL

export interface OfflineCheckIn {
  id?: number                    // Auto-increment local ID
  participantId: string          // Supabase participant UUID
  eventId: string                // Event UUID
  checkedInAt: Date              // Timestamp of check-in
  synced: boolean                // Has been synced to Supabase
  syncRetries: number            // Number of sync attempts
  lastSyncAttempt?: Date         // Last sync attempt timestamp
}

export interface CachedParticipant {
  id: string                     // Supabase participant UUID (primary key)
  eventId: string                // Event UUID
  firstName: string
  lastName: string
  phone: string
  status: string                 // 'confirmed' | 'checked_in' etc
  isVip: boolean
  hasCompanion: boolean
  qrCode: string                 // Generated QR code (EF-XXXXXXXX)
  cachedAt: Date                 // When this record was cached
  expiresAt: Date                // 24h TTL for Safari ITP compliance
}

// Database version history for migrations
export const DB_VERSION = 1
export const DB_NAME = 'EventFlowCheckIn'

// TTL constants
export const PARTICIPANT_TTL_MS = 24 * 60 * 60 * 1000  // 24 hours
