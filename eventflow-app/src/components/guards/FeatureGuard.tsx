
import type { ReactNode } from 'react';
import { useTier } from '../../contexts/TierContext';
import type { Feature } from '../../config/tiers';

function DefaultUpgradePrompt({ feature }: { feature: string }) {
    return (
        <div className="p-8 text-center border border-white/10 bg-white/5 rounded-2xl" dir="rtl">
            <h3 className="text-lg font-semibold text-white mb-2">
                תכונה פרימיום
            </h3>
            <p className="text-zinc-400 mb-4">
                התכונה <strong className="text-zinc-200">{feature}</strong> זמינה בתוכנית פרימיום בלבד.
            </p>
            <a href="/settings/tiers" className="inline-block px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
                שדרג לפרימיום
            </a>
        </div>
    );
}

interface FeatureGuardProps {
    feature: Feature;
    fallback?: ReactNode;
    showUpgrade?: boolean;
    children: ReactNode;
}

export function FeatureGuard({
    feature,
    fallback,
    showUpgrade = true,
    children
}: FeatureGuardProps) {
    const { canAccess, loading } = useTier();

    if (loading) {
        // Optionally render a loading skeleton
        return null;
    }

    if (canAccess(feature)) {
        return <>{children}</>;
    }

    if (showUpgrade) {
        return <DefaultUpgradePrompt feature={feature} />;
    }

    return <>{fallback}</>;
}
