// EventFlow AI Chat - Chat Actions Hook

import { useEffect, useCallback } from 'react'
import type { ChatAction, ChatActionEvent, ChatNavigateEvent, PageType } from '../types/chat'

// ============================================================================
// Types
// ============================================================================

export interface ChatActionHandlers {
  // Entity creation
  onCreateEvent?: (data: Record<string, unknown>) => void
  onCreateGuest?: (data: Record<string, unknown>) => void
  onCreateVendor?: (data: Record<string, unknown>) => void
  onCreateTask?: (data: Record<string, unknown>) => void
  onCreateSession?: (data: Record<string, unknown>) => void
  // Entity updates
  onUpdateEvent?: (data: Record<string, unknown>) => void
  onUpdateGuest?: (data: Record<string, unknown>) => void
  onUpdateVendor?: (data: Record<string, unknown>) => void
  onDeleteEntity?: (data: Record<string, unknown>) => void
  // Communication
  onSendMessage?: (data: Record<string, unknown>) => void
  onSendWhatsApp?: (data: Record<string, unknown>) => void
  onSendEmail?: (data: Record<string, unknown>) => void
  // Navigation
  onNavigate?: (page: PageType, params?: Record<string, string>) => void
  onOpenModal?: (modalName: string, data?: Record<string, unknown>) => void
  onFilterData?: (filter: Record<string, unknown>) => void
  // Data operations
  onExportData?: (format: string, dataType: string) => void
  onImportData?: (format: string) => void
  onGenerateReport?: (reportType: string) => void
  // AI operations
  onRunSkill?: (skillId: string, params: Record<string, unknown>) => void
  onSwitchAgent?: (agentId: string) => void
  onRunAutomation?: (automationId: string) => void
}

// ============================================================================
// Hook
// ============================================================================

export function useChatActions(handlers: ChatActionHandlers) {
  // Handle chat action events
  const handleChatAction = useCallback((event: ChatActionEvent) => {
    const action = event.detail

    switch (action.type) {
      // Entity creation
      case 'create_event':
        handlers.onCreateEvent?.(action.data || {})
        break
      case 'create_guest':
        handlers.onCreateGuest?.(action.data || {})
        break
      case 'create_vendor':
        handlers.onCreateVendor?.(action.data || {})
        break
      case 'create_task':
        handlers.onCreateTask?.(action.data || {})
        break
      case 'create_session':
        handlers.onCreateSession?.(action.data || {})
        break

      // Entity updates
      case 'update_event':
        handlers.onUpdateEvent?.(action.data || {})
        break
      case 'update_guest':
        handlers.onUpdateGuest?.(action.data || {})
        break
      case 'update_vendor':
        handlers.onUpdateVendor?.(action.data || {})
        break
      case 'delete_entity':
        handlers.onDeleteEntity?.(action.data || {})
        break

      // Communication
      case 'send_message':
        handlers.onSendMessage?.(action.data || {})
        break
      case 'send_whatsapp':
        handlers.onSendWhatsApp?.(action.data || {})
        break
      case 'send_email':
        handlers.onSendEmail?.(action.data || {})
        break

      // Navigation
      case 'navigate':
        if (action.targetPage) {
          handlers.onNavigate?.(action.targetPage, action.data as Record<string, string>)
        }
        break
      case 'open_modal':
        if (action.data?.modal) {
          handlers.onOpenModal?.(action.data.modal as string, action.data)
        }
        break
      case 'filter_data':
        handlers.onFilterData?.(action.data || {})
        break

      // Data operations
      case 'export_data':
        handlers.onExportData?.(
          (action.data?.format as string) || 'excel',
          (action.data?.dataType as string) || 'data'
        )
        break
      case 'import_data':
        handlers.onImportData?.((action.data?.format as string) || 'excel')
        break
      case 'generate_report':
        handlers.onGenerateReport?.((action.data?.reportType as string) || 'summary')
        break

      // AI operations
      case 'run_skill':
        handlers.onRunSkill?.(
          (action.data?.skill as string) || '',
          action.data || {}
        )
        break
      case 'switch_agent':
        handlers.onSwitchAgent?.((action.data?.agentId as string) || 'general')
        break
      case 'run_automation':
        handlers.onRunAutomation?.((action.data?.automationId as string) || '')
        break

      default:
        console.warn('Unknown chat action type:', action.type)
    }
  }, [handlers])

  // Handle navigation events
  const handleNavigate = useCallback((event: ChatNavigateEvent) => {
    const { page, params } = event.detail
    handlers.onNavigate?.(page, params)
  }, [handlers])

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('chat-action', handleChatAction as EventListener)
    window.addEventListener('chat-navigate', handleNavigate as EventListener)

    return () => {
      window.removeEventListener('chat-action', handleChatAction as EventListener)
      window.removeEventListener('chat-navigate', handleNavigate as EventListener)
    }
  }, [handleChatAction, handleNavigate])
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Dispatch a chat action programmatically
 */
export function dispatchChatAction(action: ChatAction) {
  const event = new CustomEvent('chat-action', { detail: action })
  window.dispatchEvent(event)
}

/**
 * Dispatch a navigation event programmatically
 */
export function dispatchChatNavigate(page: PageType, params?: Record<string, string>) {
  const event = new CustomEvent('chat-navigate', {
    detail: { page, params }
  })
  window.dispatchEvent(event)
}

export default useChatActions
