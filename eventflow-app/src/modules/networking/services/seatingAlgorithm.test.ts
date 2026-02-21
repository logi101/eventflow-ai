import { describe, it, expect } from 'vitest'
import { greedyTableSeating, type SeatingConstraints } from './seatingAlgorithm'
import type { ParticipantWithTracks } from '@/types'

// Mock participant factory
const createParticipant = (id: string, isVip = false, tracks: string[] = [], companionId?: string): ParticipantWithTracks => ({
  id,
  event_id: 'evt-1',
  first_name: `User ${id}`,
  last_name: 'Test',
  full_name: `User ${id} Test`,
  email: `user${id}@test.com`,
  phone: '0501234567',
  phone_normalized: '972501234567',
  status: 'confirmed',
  has_companion: !!companionId,
  companion_name: null,
  companion_phone: null,
  dietary_restrictions: [],
  accessibility_needs: null,
  needs_transportation: false,
  transportation_location: null,
  notes: null,
  internal_notes: null,
  is_vip: isVip,
  gender: null,
  vip_notes: null,
  networking_opt_in: true,
  invited_at: null,
  confirmed_at: null,
  checked_in_at: null,
  created_at: new Date().toISOString(),
  companion_id: companionId,
  tracks: tracks.map(tId => ({ 
    id: tId, 
    name: tId, 
    color: '#000', 
    event_id: 'evt-1', 
    sort_order: 0, 
    is_active: true, 
    created_at: '',
    description: '',
    icon: null
  }))
} as ParticipantWithTracks)

describe('greedyTableSeating', () => {
  const constraints: SeatingConstraints = {
    maxTableSize: 4,
    minSharedInterests: 0,
    maxSameTrack: 10,
    companionsTogether: true,
    vipSpread: true,
  }

  it('should seat participants in tables respecting capacity', () => {
    const participants = Array.from({ length: 10 }, (_, i) => createParticipant(`${i + 1}`))
    
    const tables = greedyTableSeating(participants, constraints)
    
    // 10 people, max 4 per table -> should be 3 tables (4, 4, 2)
    expect(tables.size).toBe(3)
    expect(tables.get(1)?.length).toBe(4)
    expect(tables.get(2)?.length).toBe(4)
    expect(tables.get(3)?.length).toBe(2)
  })

  it('should keep companions together', () => {
    // P1 and P2 are companions
    const p1 = createParticipant('1', false, [], '2')
    const p2 = createParticipant('2', false, [], '1')
    const others = Array.from({ length: 6 }, (_, i) => createParticipant(`${i + 3}`))
    
    const participants = [p1, ...others, p2] // P2 is last in list
    
    const tables = greedyTableSeating(participants, constraints)
    
    // Find table with P1
    let tableWithP1 = -1
    for (const [tNum, parts] of tables.entries()) {
      if (parts.find(p => p.id === '1')) tableWithP1 = tNum
    }
    
    // Check if P2 is in same table
    const p2Table = tables.get(tableWithP1)
    expect(p2Table?.find(p => p.id === '2')).toBeDefined()
  })

  it('should spread VIPs if vipSpread is true', () => {
    // 4 VIPs, 4 Regulars. Max table size 4.
    // Without spread, VIPs (priority) might fill Table 1.
    // With spread, they should be distributed.
    
    const vips = Array.from({ length: 4 }, (_, i) => createParticipant(`v${i}`, true))
    const regulars = Array.from({ length: 4 }, (_, i) => createParticipant(`r${i}`, false))
    
    const participants = [...vips, ...regulars]
    
    const tables = greedyTableSeating(participants, { ...constraints, maxTableSize: 4, vipSpread: true })
    
    // Expect VIPs to be distributed. Ideally 2 per table (since max 2 per table constraint in alg)
    const t1Vips = tables.get(1)?.filter(p => p.is_vip).length || 0
    const t2Vips = tables.get(2)?.filter(p => p.is_vip).length || 0
    
    expect(t1Vips).toBeLessThanOrEqual(2)
    expect(t2Vips).toBeLessThanOrEqual(2)
  })

  it('should group by shared interests', () => {
    // 4 people like "Tech", 4 people like "Art"
    const techFans = Array.from({ length: 4 }, (_, i) => createParticipant(`t${i}`, false, ['Tech']))
    const artFans = Array.from({ length: 4 }, (_, i) => createParticipant(`a${i}`, false, ['Art']))
    
    const participants = [...techFans, ...artFans]
    
    // Run algo
    const tables = greedyTableSeating(participants, constraints)
    
    // Table 1 should be mostly Tech or mostly Art
    const t1 = tables.get(1) || []
    const t1TechCount = t1.filter(p => p.tracks.some(t => t.id === 'Tech')).length
    const t1ArtCount = t1.filter(p => p.tracks.some(t => t.id === 'Art')).length
    
    // Either all Tech or all Art (greedy match)
    expect(Math.max(t1TechCount, t1ArtCount)).toBe(4)
  })
})
