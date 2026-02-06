import { describe, it, expect } from 'vitest'
import { messagesKeys } from './useMessages'

// ============================================================================
// Query key factory tests (pure functions, no mocking needed)
// ============================================================================

describe('messagesKeys', () => {
  describe('all', () => {
    it('returns the base query key', () => {
      expect(messagesKeys.all).toEqual(['messages'])
    })

    it('returns a stable reference (readonly tuple)', () => {
      expect(messagesKeys.all).toBe(messagesKeys.all)
    })
  })

  describe('lists', () => {
    it('extends the base key with list segment', () => {
      expect(messagesKeys.lists()).toEqual(['messages', 'list'])
    })

    it('starts with the all key', () => {
      const lists = messagesKeys.lists()
      expect(lists[0]).toBe(messagesKeys.all[0])
    })
  })

  describe('list', () => {
    it('appends filter object to lists key', () => {
      const filters = { event_id: 'e1', status: 'sent' as const }
      const key = messagesKeys.list(filters)

      expect(key).toEqual(['messages', 'list', filters])
      expect(key[2]).toBe(filters)
    })

    it('produces different keys for different filters', () => {
      const key1 = messagesKeys.list({ event_id: 'e1' })
      const key2 = messagesKeys.list({ event_id: 'e2' })

      expect(key1).not.toEqual(key2)
    })

    it('produces identical keys for identical filters', () => {
      const filters = { status: 'pending' as const }
      const key1 = messagesKeys.list(filters)
      const key2 = messagesKeys.list(filters)

      expect(key1).toEqual(key2)
    })

    it('works with empty filters', () => {
      const key = messagesKeys.list({})

      expect(key).toEqual(['messages', 'list', {}])
    })

    it('works with all filter fields set', () => {
      const filters = {
        event_id: 'e1',
        status: 'delivered' as const,
        channel: 'whatsapp' as const,
        direction: 'outgoing' as const,
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        search: 'hello',
      }
      const key = messagesKeys.list(filters)

      expect(key).toHaveLength(3)
      expect(key[2]).toEqual(filters)
    })
  })

  describe('details', () => {
    it('extends the base key with detail segment', () => {
      expect(messagesKeys.details()).toEqual(['messages', 'detail'])
    })
  })

  describe('detail', () => {
    it('appends message id to details key', () => {
      const key = messagesKeys.detail('msg-123')

      expect(key).toEqual(['messages', 'detail', 'msg-123'])
    })

    it('produces different keys for different ids', () => {
      const key1 = messagesKeys.detail('msg-1')
      const key2 = messagesKeys.detail('msg-2')

      expect(key1).not.toEqual(key2)
    })
  })

  describe('stats', () => {
    it('extends the base key with stats segment', () => {
      expect(messagesKeys.stats()).toEqual(['messages', 'stats'])
    })
  })

  describe('key hierarchy', () => {
    it('all keys share the same root prefix', () => {
      const root = messagesKeys.all[0]

      expect(messagesKeys.lists()[0]).toBe(root)
      expect(messagesKeys.list({})[0]).toBe(root)
      expect(messagesKeys.details()[0]).toBe(root)
      expect(messagesKeys.detail('x')[0]).toBe(root)
      expect(messagesKeys.stats()[0]).toBe(root)
    })

    it('list keys are prefixed by lists key', () => {
      const listsKey = messagesKeys.lists()
      const listKey = messagesKeys.list({ event_id: 'e1' })

      expect(listKey.slice(0, 2)).toEqual(listsKey)
    })

    it('detail keys are prefixed by details key', () => {
      const detailsKey = messagesKeys.details()
      const detailKey = messagesKeys.detail('msg-1')

      expect(detailKey.slice(0, 2)).toEqual(detailsKey)
    })
  })
})
