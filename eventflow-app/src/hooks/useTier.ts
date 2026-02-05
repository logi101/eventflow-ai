import { useContext } from 'react';
import { TierContext } from '../contexts/TierContext';
import type { TierContextValue } from '../contexts/TierContext.types';

export function useTier(): TierContextValue {
    const context = useContext(TierContext);
    if (context === undefined) {
        throw new Error('useTier must be used within a TierProvider');
    }
    return context;
}
