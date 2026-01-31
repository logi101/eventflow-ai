// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Grace Period Context
// Manages a queue of pending changes with 60-second timers
// ═══════════════════════════════════════════════════════════════════════════

import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useCallback,
  useEffect,
  useState,
  type ReactNode
} from 'react'
import type {
  PendingChange,
  PendingChangeType,
  ConfirmationDetails,
  GracePeriodAction
} from '../types/gracePeriod'

const GRACE_PERIOD_MS = 60_000

// ────────────────────────────────────────────────────────────────────────────
// Context Value Interface
// ────────────────────────────────────────────────────────────────────────────

interface GracePeriodContextValue {
  pendingChanges: PendingChange[]
  queueChange: (change: Omit<PendingChange, 'id' | 'createdAt' | 'expiresAt'>) => string
  cancelChange: (changeId: string) => void
  cancelAllChanges: () => void
  requestConfirmation: (
    details: ConfirmationDetails,
    onConfirm: () => void,
    onCancel?: () => void
  ) => void
  dismissConfirmation: () => void
  getRemainingSeconds: (changeId: string) => number
  hasPendingChangesFor: (type: PendingChangeType, entityId?: string) => boolean
  confirmationState: {
    isOpen: boolean
    details: ConfirmationDetails | null
    onConfirm: (() => void) | null
    onCancel: (() => void) | null
  }
  tick: number
}

const GracePeriodContext = createContext<GracePeriodContextValue | null>(null)

// ────────────────────────────────────────────────────────────────────────────
// Reducer
// ────────────────────────────────────────────────────────────────────────────

interface GracePeriodState {
  pendingChanges: PendingChange[]
  tick: number
}

function gracePeriodReducer(state: GracePeriodState, action: GracePeriodAction): GracePeriodState {
  switch (action.type) {
    case 'ADD_CHANGE':
      return {
        ...state,
        pendingChanges: [...state.pendingChanges, action.payload]
      }
    case 'REMOVE_CHANGE':
      return {
        ...state,
        pendingChanges: state.pendingChanges.filter(c => c.id !== action.payload)
      }
    case 'CLEAR_ALL':
      return {
        ...state,
        pendingChanges: []
      }
    case 'TICK':
      return {
        ...state,
        tick: state.tick + 1
      }
    default:
      return state
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────────────────────

export function GracePeriodProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gracePeriodReducer, {
    pendingChanges: [],
    tick: 0
  })

  // Confirmation popup state
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean
    details: ConfirmationDetails | null
    onConfirm: (() => void) | null
    onCancel: (() => void) | null
  }>({
    isOpen: false,
    details: null,
    onConfirm: null,
    onCancel: null
  })

  // Timer refs - Map<changeId, timeoutId>
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Tick interval for countdown display
  useEffect(() => {
    if (state.pendingChanges.length === 0) return

    const interval = setInterval(() => {
      dispatch({ type: 'TICK' })
    }, 1000)

    return () => clearInterval(interval)
  }, [state.pendingChanges.length])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  // Execute a change (called when timer expires)
  const executeChange = useCallback(async (change: PendingChange) => {
    try {
      await change.executeFn()
    } catch (error) {
      console.error(`Grace period execution failed for ${change.type}:`, error)
    } finally {
      dispatch({ type: 'REMOVE_CHANGE', payload: change.id })
      timersRef.current.delete(change.id)
    }
  }, [])

  // Queue a new change
  const queueChange = useCallback((
    changeData: Omit<PendingChange, 'id' | 'createdAt' | 'expiresAt'>
  ): string => {
    const id = crypto.randomUUID()
    const now = Date.now()

    const change: PendingChange = {
      ...changeData,
      id,
      createdAt: now,
      expiresAt: now + GRACE_PERIOD_MS
    }

    dispatch({ type: 'ADD_CHANGE', payload: change })

    // Start 60-second timer
    const timer = setTimeout(() => {
      executeChange(change)
    }, GRACE_PERIOD_MS)

    timersRef.current.set(id, timer)
    return id
  }, [executeChange])

  // Cancel a specific change
  const cancelChange = useCallback(async (changeId: string) => {
    const change = state.pendingChanges.find(c => c.id === changeId)

    // Clear timer
    const timer = timersRef.current.get(changeId)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(changeId)
    }

    // Execute rollback if available
    if (change?.rollbackFn) {
      try {
        await change.rollbackFn()
      } catch (error) {
        console.error('Rollback failed:', error)
      }
    }

    dispatch({ type: 'REMOVE_CHANGE', payload: changeId })
  }, [state.pendingChanges])

  // Cancel all changes
  const cancelAllChanges = useCallback(async () => {
    // Clear all timers
    timersRef.current.forEach(timer => clearTimeout(timer))
    timersRef.current.clear()

    // Execute all rollbacks
    for (const change of state.pendingChanges) {
      if (change.rollbackFn) {
        try {
          await change.rollbackFn()
        } catch (error) {
          console.error('Rollback failed:', error)
        }
      }
    }

    dispatch({ type: 'CLEAR_ALL' })
  }, [state.pendingChanges])

  // Show confirmation popup
  const requestConfirmation = useCallback((
    details: ConfirmationDetails,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    setConfirmationState({
      isOpen: true,
      details,
      onConfirm,
      onCancel: onCancel || null
    })
  }, [])

  // Dismiss confirmation popup
  const dismissConfirmation = useCallback(() => {
    const { onCancel } = confirmationState
    if (onCancel) onCancel()
    setConfirmationState({
      isOpen: false,
      details: null,
      onConfirm: null,
      onCancel: null
    })
  }, [confirmationState])

  // Get remaining seconds for a change
  const getRemainingSeconds = useCallback((changeId: string): number => {
    const change = state.pendingChanges.find(c => c.id === changeId)
    if (!change) return 0
    const remaining = Math.max(0, Math.ceil((change.expiresAt - Date.now()) / 1000))
    return remaining
  }, [state.pendingChanges, state.tick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Check for pending changes of a type
  const hasPendingChangesFor = useCallback((type: PendingChangeType, entityId?: string): boolean => {
    return state.pendingChanges.some(c => {
      if (c.type !== type) return false
      if (entityId && c.payload.entityId !== entityId) return false
      return true
    })
  }, [state.pendingChanges])

  const value: GracePeriodContextValue = {
    pendingChanges: state.pendingChanges,
    queueChange,
    cancelChange,
    cancelAllChanges,
    requestConfirmation,
    dismissConfirmation,
    getRemainingSeconds,
    hasPendingChangesFor,
    confirmationState,
    tick: state.tick
  }

  return (
    <GracePeriodContext.Provider value={value}>
      {children}
    </GracePeriodContext.Provider>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────────────────

export function useGracePeriod() {
  const context = useContext(GracePeriodContext)
  if (!context) {
    throw new Error('useGracePeriod must be used within a GracePeriodProvider')
  }
  return context
}
