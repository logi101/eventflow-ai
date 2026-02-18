
export type Tier = 'base' | 'premium' | 'legacy_premium';

export interface TierLimits {
    events_per_year: number;
    participants_per_event: number;
    messages_per_month: number;
    ai_chat_messages_per_month: number;
}

export type Feature =
    | 'events'
    | 'participants'
    | 'messages'
    | 'ai'
    | 'simulation'
    | 'networking'
    | 'budget_alerts'
    | 'vendor_analysis';

interface TierConfig {
    features: Feature[];
    limits: TierLimits;
}

export const TIERS: Record<Tier, TierConfig> = {
    base: {
        features: ['events', 'participants', 'messages', 'ai'],
        limits: {
            events_per_year: 5,
            participants_per_event: 100,
            messages_per_month: 200,
            ai_chat_messages_per_month: 50
        }
    },
    premium: {
        features: ['events', 'participants', 'messages', 'ai', 'simulation', 'networking', 'budget_alerts', 'vendor_analysis'],
        limits: {
            events_per_year: -1,
            participants_per_event: -1,
            messages_per_month: -1,
            ai_chat_messages_per_month: -1
        }
    },
    legacy_premium: {
        features: ['events', 'participants', 'messages', 'ai', 'simulation', 'networking', 'budget_alerts', 'vendor_analysis'],
        limits: {
            events_per_year: -1,
            participants_per_event: -1,
            messages_per_month: -1,
            ai_chat_messages_per_month: -1
        }
    }
} as const;

export function hasFeature(tier: Tier, feature: Feature): boolean {
    if (!tier) return false;
    return TIERS[tier]?.features.includes(feature) ?? false;
}

export function getTierLimits(tier: Tier): TierLimits {
    if (!tier) return TIERS.base.limits;
    return TIERS[tier]?.limits ?? TIERS.base.limits;
}
