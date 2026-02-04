
import { useTier } from '../../contexts/TierContext';
import { useNavigate } from 'react-router-dom';

export function TierBadge() {
    const { tier, loading } = useTier();
    const navigate = useNavigate();

    if (loading) return null;

    const isPremium = tier === 'premium' || tier === 'legacy_premium';

    const handleBadgeClick = () => {
        navigate('/settings/billing'); // assuming this route exists or will exist
    };

    return (
        <div
            onClick={handleBadgeClick}
            className={`
        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors
        ${isPremium
                    ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                    : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'}
      `}
            title={isPremium ? 'תוכנית פרימיום' : 'תוכנית בסיס'}
        >
            <span className="mr-1">
                {isPremium ? '💎' : '📦'}
            </span>
            <span>
                {isPremium ? 'פרימיום' : 'בסיס'}
            </span>
        </div>
    );
}
