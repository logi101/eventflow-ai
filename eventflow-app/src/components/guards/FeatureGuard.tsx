
import type { ReactNode } from 'react';
import { useTier } from '../../contexts/TierContext';
import type { Feature } from '../../config/tiers';

// Placeholder for UpgradePrompt until implemented
function DefaultUpgradePrompt({ feature }: { feature: string }) {
    return (
        <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
                Upgrade to Premium
            </h3>
            <p className="text-blue-600 mb-4">
                The feature <strong>{feature}</strong> requires a Premium plan.
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Upgrade Now
            </button>
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
