/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react';
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
import type { UsageMetrics, TierContextValue } from './TierContext.types';

export const TierContext = createContext<TierContextValue | undefined>(undefined);

export function TierProvider({ children }: { children: ReactNode }) {
    const { userProfile, loading: authLoading, isSuperAdmin: authIsSuperAdmin } = useAuth();
    const queryClient = useQueryClient();

    // Super admin status from database role
    const isSuperAdmin = authIsSuperAdmin;

    const orgId = userProfile?.organization_id;

    const { data: orgData, isLoading: orgLoading } = useQuery({
        queryKey: ['organization', orgId, 'tier'],
        queryFn: async () => {
            if (!orgId || isSuperAdmin) return null;
            const { data, error } = await supabase
                .from('organizations')
                .select('tier, tier_limits, current_usage, trial_ends_at, trial_started_at')
                .eq('id', orgId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!orgId && !isSuperAdmin,
        staleTime: 60 * 1000,
    });

    const value = useMemo(() => {
        if (isSuperAdmin) {
            return {
                tier: 'premium' as Tier,
                effectiveTier: 'premium' as Tier,
                loading: false,
                canAccess: () => true,
                hasQuota: () => true,
                usage: null,
                limits: {
                    events_per_year: -1,
                    participants_per_event: -1,
                    messages_per_month: -1,
                    ai_chat_messages_per_month: -1
                },
                trialDaysRemaining: null,
                refreshQuota: async () => {}
            };
        }

        const tier: Tier = (orgData?.tier as Tier) || 'base';
        const usage: UsageMetrics | null = orgData?.current_usage as UsageMetrics || null;
        const limits: TierLimits = (orgData?.tier_limits as TierLimits) || getTierLimits(tier);
        
        const now = new Date();
        const trialEndsAt = orgData?.trial_ends_at ? new Date(orgData.trial_ends_at) : null;
        const isInTrial = trialEndsAt && trialEndsAt > now;
        const effectiveTier: Tier = isInTrial ? 'premium' : tier;

        return {
            tier: effectiveTier,
            effectiveTier,
            loading: authLoading || orgLoading,
            canAccess: (feature: Feature) => hasFeature(effectiveTier, feature),
            hasQuota: (quotaType: keyof TierLimits) => {
                if (!usage) return true;
                const limit = limits[quotaType];
                if (limit === -1) return true;
                let used = 0;
                switch (quotaType) {
                    case 'events_per_year': used = usage.events_count; break;
                    case 'participants_per_event': used = usage.participants_count; break;
                    case 'messages_per_month': used = usage.messages_sent; break;
                    case 'ai_chat_messages_per_month': used = usage.ai_messages_sent; break;
                }
                return used < limit;
            },
            usage,
            limits,
            trialDaysRemaining: isInTrial && trialEndsAt
                ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                : null,
            refreshQuota: async () => {
                await queryClient.invalidateQueries({ queryKey: ['organization', orgId, 'tier'] });
            }
        };
    }, [isSuperAdmin, authLoading, orgLoading, orgData, orgId, queryClient]);

    return (
        <TierContext.Provider value={value}>
            {children}
        </TierContext.Provider>
    );
}

export function useTier(): TierContextValue {
    const context = useContext(TierContext);
    if (context === undefined) {
        throw new Error('useTier must be used within a TierProvider');
    }
    return context;
}