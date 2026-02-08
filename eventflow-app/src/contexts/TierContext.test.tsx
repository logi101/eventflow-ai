import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { hasFeature, getTierLimits, TIERS } from '@/config/tiers'
import type { Feature, Tier, TierLimits } from '@/config/tiers'

// ============================================================================
// Tests for the tiers config (pure functions, no mocking needed)
// ============================================================================

describe('hasFeature', () => {
  it('returns true for features included in the base tier', () => {
    expect(hasFeature('base', 'events')).toBe(true)
    expect(hasFeature('base', 'participants')).toBe(true)
    expect(hasFeature('base', 'messages')).toBe(true)
  })

  it('returns false for premium features when on base tier', () => {
    expect(hasFeature('base', 'ai')).toBe(false)
    expect(hasFeature('base', 'simulation')).toBe(false)
    expect(hasFeature('base', 'networking')).toBe(false)
    expect(hasFeature('base', 'budget_alerts')).toBe(false)
    expect(hasFeature('base', 'vendor_analysis')).toBe(false)
  })

  it('returns true for all features on premium tier', () => {
    const allFeatures: Feature[] = [
      'events', 'participants', 'messages', 'ai',
      'simulation', 'networking', 'budget_alerts', 'vendor_analysis',
    ]
    for (const feature of allFeatures) {
      expect(hasFeature('premium', feature)).toBe(true)
    }
  })

  it('returns true for all features on legacy_premium tier', () => {
    const allFeatures: Feature[] = [
      'events', 'participants', 'messages', 'ai',
      'simulation', 'networking', 'budget_alerts', 'vendor_analysis',
    ]
    for (const feature of allFeatures) {
      expect(hasFeature('legacy_premium', feature)).toBe(true)
    }
  })

  it('returns false for null/undefined tier', () => {
    expect(hasFeature(null as unknown as Tier, 'events')).toBe(false)
    expect(hasFeature(undefined as unknown as Tier, 'events')).toBe(false)
  })
})

describe('getTierLimits', () => {
  it('returns correct limits for base tier', () => {
    const limits = getTierLimits('base')
    expect(limits.events_per_year).toBe(5)
    expect(limits.participants_per_event).toBe(100)
    expect(limits.messages_per_month).toBe(200)
    expect(limits.ai_chat_messages_per_month).toBe(50)
  })

  it('returns unlimited (-1) for premium tier', () => {
    const limits = getTierLimits('premium')
    expect(limits.events_per_year).toBe(-1)
    expect(limits.participants_per_event).toBe(-1)
    expect(limits.messages_per_month).toBe(-1)
    expect(limits.ai_chat_messages_per_month).toBe(-1)
  })

  it('returns unlimited (-1) for legacy_premium tier', () => {
    const limits = getTierLimits('legacy_premium')
    expect(limits.events_per_year).toBe(-1)
    expect(limits.participants_per_event).toBe(-1)
  })

  it('falls back to base limits for null/undefined tier', () => {
    const baseLimits = getTierLimits('base')
    const nullLimits = getTierLimits(null as unknown as Tier)
    const undefinedLimits = getTierLimits(undefined as unknown as Tier)

    expect(nullLimits).toEqual(baseLimits)
    expect(undefinedLimits).toEqual(baseLimits)
  })
})

describe('TIERS config structure', () => {
  it('has base, premium, and legacy_premium tiers', () => {
    expect(Object.keys(TIERS)).toEqual(['base', 'premium', 'legacy_premium'])
  })

  it('base tier has limited features', () => {
    expect(TIERS.base.features).toEqual(['events', 'participants', 'messages'])
  })

  it('premium tier has all features', () => {
    expect(TIERS.premium.features).toHaveLength(8)
    expect(TIERS.premium.features).toContain('ai')
    expect(TIERS.premium.features).toContain('simulation')
    expect(TIERS.premium.features).toContain('networking')
  })

  it('all tier limits have the same keys', () => {
    const expectedKeys: (keyof TierLimits)[] = [
      'events_per_year',
      'participants_per_event',
      'messages_per_month',
      'ai_chat_messages_per_month',
    ]

    for (const tier of Object.values(TIERS)) {
      for (const key of expectedKeys) {
        expect(tier.limits).toHaveProperty(key)
        expect(typeof tier.limits[key]).toBe('number')
      }
    }
  })
})

// ============================================================================
// Tests for TierContext / useTier hook
// ============================================================================

// We need to mock AuthContext before importing TierContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    userProfile: null,
    loading: false,
    isSuperAdmin: false,
  }),
}))

// Import after mock setup
const { useAuth } = await import('@/contexts/AuthContext')
const { TierProvider, useTier } = await import('@/contexts/TierContext')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TierProvider>{children}</TierProvider>
      </QueryClientProvider>
    )
  }
}

describe('useTier hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when used outside TierProvider', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    // Suppress the expected error output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useTier(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      })
    }).toThrow('useTier must be used within a TierProvider')

    consoleSpy.mockRestore()
  })

  it('returns real org tier but full access for super admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      userProfile: { id: 'u1', full_name: 'Admin', email: 'admin@test.com', role: 'super_admin', organization_id: null, phone: null, avatar_url: null },
      loading: false,
      isSuperAdmin: true,
    } as ReturnType<typeof useAuth>)

    const { result } = renderHook(() => useTier(), { wrapper: createWrapper() })

    // Tier reflects real org data (base when no org data)
    expect(result.current.tier).toBe('base')
    expect(result.current.effectiveTier).toBe('base')
    expect(result.current.loading).toBe(false)
    // But canAccess/hasQuota always return true for super admins
    expect(result.current.canAccess('ai')).toBe(true)
    expect(result.current.canAccess('simulation')).toBe(true)
    expect(result.current.canAccess('networking')).toBe(true)
    expect(result.current.hasQuota('events_per_year')).toBe(true)
    expect(result.current.trialDaysRemaining).toBeNull()
  })

  it('returns base tier when no org data is available', () => {
    vi.mocked(useAuth).mockReturnValue({
      userProfile: null,
      loading: false,
      isSuperAdmin: false,
    } as ReturnType<typeof useAuth>)

    const { result } = renderHook(() => useTier(), { wrapper: createWrapper() })

    expect(result.current.tier).toBe('base')
    expect(result.current.effectiveTier).toBe('base')
  })

  it('super admin canAccess always returns true for any feature', () => {
    vi.mocked(useAuth).mockReturnValue({
      userProfile: { id: 'u1', full_name: 'Admin', email: 'admin@test.com', role: 'super_admin', organization_id: null, phone: null, avatar_url: null },
      loading: false,
      isSuperAdmin: true,
    } as ReturnType<typeof useAuth>)

    const { result } = renderHook(() => useTier(), { wrapper: createWrapper() })

    // canAccess should return true for everything when super admin
    expect(result.current.canAccess('events')).toBe(true)
    expect(result.current.canAccess('vendor_analysis')).toBe(true)
    expect(result.current.canAccess('budget_alerts')).toBe(true)
  })

  it('super admin hasQuota always returns true', () => {
    vi.mocked(useAuth).mockReturnValue({
      userProfile: { id: 'u1', full_name: 'SA', email: null, role: 'super_admin', organization_id: null, phone: null, avatar_url: null },
      loading: false,
      isSuperAdmin: true,
    } as ReturnType<typeof useAuth>)

    const { result } = renderHook(() => useTier(), { wrapper: createWrapper() })

    expect(result.current.hasQuota('events_per_year')).toBe(true)
    expect(result.current.hasQuota('messages_per_month')).toBe(true)
    expect(result.current.hasQuota('ai_chat_messages_per_month')).toBe(true)
  })

  it('super admin gets real org limits (base when no org data)', () => {
    vi.mocked(useAuth).mockReturnValue({
      userProfile: { id: 'u1', full_name: 'SA', email: null, role: 'super_admin', organization_id: null, phone: null, avatar_url: null },
      loading: false,
      isSuperAdmin: true,
    } as ReturnType<typeof useAuth>)

    const { result } = renderHook(() => useTier(), { wrapper: createWrapper() })

    // Limits reflect real org data (base defaults when no org data)
    const baseLimits = getTierLimits('base')
    expect(result.current.limits.events_per_year).toBe(baseLimits.events_per_year)
    expect(result.current.limits.participants_per_event).toBe(baseLimits.participants_per_event)
    expect(result.current.limits.messages_per_month).toBe(baseLimits.messages_per_month)
    expect(result.current.limits.ai_chat_messages_per_month).toBe(baseLimits.ai_chat_messages_per_month)
    // But hasQuota still returns true regardless
    expect(result.current.hasQuota('events_per_year')).toBe(true)
  })

  it('super admin usage is null', () => {
    vi.mocked(useAuth).mockReturnValue({
      userProfile: { id: 'u1', full_name: 'SA', email: null, role: 'super_admin', organization_id: null, phone: null, avatar_url: null },
      loading: false,
      isSuperAdmin: true,
    } as ReturnType<typeof useAuth>)

    const { result } = renderHook(() => useTier(), { wrapper: createWrapper() })

    expect(result.current.usage).toBeNull()
  })
})
