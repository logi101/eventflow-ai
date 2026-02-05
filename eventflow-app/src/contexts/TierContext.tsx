
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import {
    hasFeature,
    getTierLimits
} from '../config/tiers';
import type {
    Tier,
    TierLimits,
    Feature
} from '../config/tiers';

// Interface for Usage Metrics
export interface UsageMetrics {
    events_count: number;
    participants_count: number;
    messages_sent: number;
    ai_messages_sent: number;
    period_start: string;
    period_end: string;
    warned_this_month: boolean;
}

// Interface for TierContext
interface TierContextValue {
    tier: Tier;
    effectiveTier: Tier; // Trial treated as premium
    loading: boolean;
    canAccess: (feature: Feature) => boolean;
    hasQuota: (quotaType: keyof TierLimits) => boolean;
    usage: UsageMetrics | null;
    limits: TierLimits;
    trialDaysRemaining: number | null; // Days remaining in trial
    refreshQuota: () => Promise<void>;
}

const TierContext = createContext<TierContextValue | undefined>(undefined);

export function TierProvider({ children }: { children: ReactNode }) {
    const { userProfile, loading: authLoading } = useAuth();
    const queryClient = useQueryClient();

    const orgId = userProfile?.organization_id;

    const { data: orgData, isLoading: orgLoading } = useQuery({
        queryKey: ['organization', orgId, 'tier'],
        queryFn: async () => {
            if (!orgId) return null;

            const { data, error } = await supabase
                .from('organizations')
                .select('tier, tier_limits, current_usage, trial_ends_at, trial_started_at')
                .eq('id', orgId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!orgId,
        staleTime: 60 * 1000, // 1 minute stale time as requested
        refetchInterval: 60 * 1000, // Auto refresh every minute
    });

    const tier: Tier = (orgData?.tier as Tier) || 'base';

    // Parse usage and limits, handling defaults
    const usage: UsageMetrics | null = orgData?.current_usage as UsageMetrics || null;

    // Prefer limits from DB if they exist (custom overrides), otherwise use config defaults
    const limits: TierLimits = (orgData?.tier_limits as TierLimits) || getTierLimits(tier);

    // Check if user is in trial mode (has active trial)
    const now = new Date();
    const trialEndsAt = orgData?.trial_ends_at ? new Date(orgData.trial_ends_at) : null;
    const isInTrial = trialEndsAt && trialEndsAt > now;

    // Effective tier: if in trial, treat as premium; otherwise use actual tier
    const effectiveTier: Tier = isInTrial ? 'premium' : tier;

    const canAccess = (feature: Feature): boolean => {
        return hasFeature(effectiveTier, feature);
    };

    const hasQuota = (quotaType: keyof TierLimits): boolean => {
        if (!usage) return true; // Fail open if no usage data? Or closed?
        // P3.3 requirement says: Calculate remaining: limit - used.

        // Unlimited check
        const limit = limits[quotaType];
        if (limit === -1) return true;

        // Map quotaType to usage key
        // Mapping:
        // events_per_year -> events_count
        // participants_per_event -> participants_count
        // messages_per_month -> messages_sent
        // ai_chat_messages_per_month -> ai_messages_sent

        let used = 0;
        switch (quotaType) {
            case 'events_per_year': used = usage.events_count; break;
            case 'participants_per_event': used = usage.participants_count; break;
            case 'messages_per_month': used = usage.messages_sent; break;
            case 'ai_chat_messages_per_month': used = usage.ai_messages_sent; break;
        }

        return used < limit;
    };

    const refreshQuota = async () => {
        await queryClient.invalidateQueries({ queryKey: ['organization', orgId, 'tier'] });
    };

    // Calculate remaining trial days
    const trialDaysRemaining = isInTrial && trialEndsAt
        ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

    const value: TierContextValue = {
        tier: effectiveTier,
        effectiveTier,
        loading: authLoading || orgLoading,
        canAccess,
        hasQuota,
        usage,
        limits,
        trialDaysRemaining,
        refreshQuota
    };

    return (
        <TierContext.Provider value={value}>
            {children}
        </TierContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTier() {
    const context = useContext(TierContext);
    if (context === undefined) {
        throw new Error('useTier must be used within a TierProvider');
    }
    return context;
}
