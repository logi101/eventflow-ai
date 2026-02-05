import type { Tier, TierLimits, Feature } from '../config/tiers';

export interface UsageMetrics {
    events_count: number;
    participants_count: number;
    messages_sent: number;
    ai_messages_sent: number;
    period_start: string;
    period_end: string;
    warned_this_month: boolean;
}

export interface TierContextValue {
    tier: Tier;
    effectiveTier: Tier;
    loading: boolean;
    canAccess: (feature: Feature) => boolean;
    hasQuota: (quotaType: keyof TierLimits) => boolean;
    usage: UsageMetrics | null;
    limits: TierLimits;
    trialDaysRemaining: number | null;
    refreshQuota: () => Promise<void>;
}
