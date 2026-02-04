
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTier } from '../../contexts/TierContext';
import type { TierLimits } from '../../config/tiers';

interface QuotaGuardProps {
    quotaType: keyof TierLimits;
    onQuotaExceeded?: () => void;
    children: (props: { hasQuota: boolean; remaining: number; limit: number }) => ReactNode;
}

export function QuotaGuard({
    quotaType,
    onQuotaExceeded,
    children
}: QuotaGuardProps) {
    const { hasQuota, usage, limits, loading } = useTier();

    const isAllowed = hasQuota(quotaType);
    const limit = limits[quotaType];

    let used = 0;
    if (usage) {
        switch (quotaType) {
            case 'events_per_year': used = usage.events_count; break;
            case 'participants_per_event': used = usage.participants_count; break;
            case 'messages_per_month': used = usage.messages_sent; break;
            case 'ai_chat_messages_per_month': used = usage.ai_messages_sent; break;
        }
    }

    const remaining = limit === -1 ? Number.MAX_SAFE_INTEGER : Math.max(0, limit - used);

    useEffect(() => {
        if (!loading && !isAllowed && onQuotaExceeded) {
            onQuotaExceeded();
        }
    }, [loading, isAllowed, onQuotaExceeded]);

    if (loading) return null;

    return <>{children({ hasQuota: isAllowed, remaining, limit })}</>;
}
