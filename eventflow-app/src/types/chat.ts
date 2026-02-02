// EventFlow AI Chat System - Type Definitions

import type { LucideIcon } from 'lucide-react'

// ============================================================================
// Core Message Types
// ============================================================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  actions?: ChatAction[]
  metadata?: MessageMetadata
  isLoading?: boolean
}

export interface MessageMetadata {
  page?: PageType
  command?: string
  agentType?: AgentType
  skillUsed?: string
  processingTime?: number
}

// ============================================================================
// Action Types
// ============================================================================

export type ActionType =
  // Entity creation
  | 'create_event'
  | 'create_guest'
  | 'create_vendor'
  | 'create_task'
  | 'create_session'
  // Entity management
  | 'update_event'
  | 'update_guest'
  | 'update_vendor'
  | 'delete_entity'
  // Communication
  | 'send_message'
  | 'send_whatsapp'
  | 'send_email'
  // Navigation
  | 'navigate'
  | 'open_modal'
  | 'filter_data'
  // Data operations
  | 'export_data'
  | 'import_data'
  | 'generate_report'
  // AI operations
  | 'run_skill'
  | 'switch_agent'
  | 'run_automation'
  // AI agent results (from Gemini function calling)
  | 'event_created'
  | 'event_creation_failed'
  | 'checklist_added'
  | 'vendors_assigned'
  | 'events_found'
  | 'vendors_found'
  | 'schedule_suggested'
  | 'identify_event_type'
  | 'set_date'
  | 'set_participants'
  | 'suggest_create_event'
  // New event-scoped actions
  | 'participants_added'
  | 'participants_listed'
  | 'event_updated'
  | 'checklist_completed'
  | 'whatsapp_sent'
  // Schedule actions
  | 'schedule_items_added'
  | 'schedule_item_updated'
  // AI write operations (Phase 6)
  | 'ai_write_pending'
  | 'ai_write_approved'
  | 'ai_write_rejected'
  | 'ai_write_executed'
  | 'ai_write_failed'

export interface ChatAction {
  id: string
  type: ActionType
  label: string
  labelHebrew: string
  icon?: string
  data?: Record<string, unknown>
  targetPage?: PageType
  completed?: boolean
  disabled?: boolean
}

// ============================================================================
// Slash Command Types
// ============================================================================

export interface SlashCommand {
  command: string
  description: string
  descriptionHebrew: string
  icon: LucideIcon
  availableOn: PageType[]
  category: CommandCategory
  handler: (params: string, context: PageContext) => Promise<ChatAction | null>
}

export type CommandCategory =
  | 'events'
  | 'guests'
  | 'vendors'
  | 'tasks'
  | 'messages'
  | 'program'
  | 'navigation'
  | 'skills'
  | 'system'

// ============================================================================
// Page Context Types
// ============================================================================

export type PageType =
  | 'dashboard'
  | 'events'
  | 'event-detail'
  | 'guests'
  | 'vendors'
  | 'checklist'
  | 'messages'
  | 'program'
  | 'budget'
  | 'settings'
  | 'timeline'

export interface PageContext {
  currentPage: PageType
  eventId?: string
  eventName?: string
  selectedItems?: string[]
  filterState?: Record<string, unknown>
  availableCommands: SlashCommand[]
}

// ============================================================================
// Settings Types
// ============================================================================

export type ChatPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
export type ChatSize = 'small' | 'medium' | 'large'
export type ChatTheme = 'default' | 'minimal' | 'custom'

export interface ChatSettings {
  position: ChatPosition
  size: ChatSize
  theme: ChatTheme
  accentColor: string
  soundEnabled: boolean
  shortcutKey: string
  autoMinimize: boolean
  showNotifications: boolean
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  position: 'bottom-left', // RTL default
  size: 'medium',
  theme: 'default',
  accentColor: '#f97316', // Orange accent
  soundEnabled: true,
  shortcutKey: 'ctrl+/',
  autoMinimize: false,
  showNotifications: true
}

// Window size dimensions
export const CHAT_SIZES: Record<ChatSize, { width: number; height: number }> = {
  small: { width: 320, height: 400 },
  medium: { width: 384, height: 500 },
  large: { width: 448, height: 600 }
}

// ============================================================================
// Agent Types
// ============================================================================

export type AgentType =
  | 'event-planner'
  | 'guest-manager'
  | 'vendor-coordinator'
  | 'task-assistant'
  | 'budget-advisor'
  | 'general'

export interface AgentProfile {
  id: AgentType
  name: string
  nameHebrew: string
  icon: string
  description: string
  descriptionHebrew: string
  specialties: string[]
  systemPrompt: string
  availableSkills: SkillType[]
}

// ============================================================================
// Skill Types
// ============================================================================

export type SkillType =
  | 'pdf-export'
  | 'excel-import'
  | 'excel-export'
  | 'whatsapp-send'
  | 'qr-generate'
  | 'email-send'
  | 'calendar-sync'
  | 'report-generate'

export interface Skill {
  id: SkillType
  name: string
  nameHebrew: string
  description: string
  icon: string
  requiredParams: string[]
  handler: (params: Record<string, unknown>) => Promise<SkillResult>
}

export interface SkillResult {
  success: boolean
  message: string
  data?: unknown
  downloadUrl?: string
}

// ============================================================================
// Chat State Types
// ============================================================================

export type ChatWindowState = 'closed' | 'minimized' | 'open'

export interface ChatState {
  windowState: ChatWindowState
  messages: ChatMessage[]
  isLoading: boolean
  currentAgent: AgentType
  settings: ChatSettings
  unreadCount: number
  pageContext: PageContext
}

// ============================================================================
// Service Types
// ============================================================================

export interface ChatRequest {
  message: string
  context: PageContext
  agent: AgentType
  conversationHistory: ChatMessage[]
}

export interface ChatResponse {
  content: string
  actions?: ChatAction[]
  metadata?: MessageMetadata
  suggestions?: string[]
  pendingApprovalActions?: AIWriteAction[]
}

export type AIProvider = 'claude' | 'gemini'

export interface AIRoutingResult {
  provider: AIProvider
  reason: string
  isAction: boolean
  command?: string
  skillRequired?: SkillType
}

// ============================================================================
// Event Types for Page Communication
// ============================================================================

export interface ChatActionEvent extends CustomEvent {
  detail: ChatAction
}

export interface ChatNavigateEvent extends CustomEvent {
  detail: {
    page: PageType
    params?: Record<string, string>
  }
}

// Declare global event types
declare global {
  interface WindowEventMap {
    'chat-action': ChatActionEvent
    'chat-navigate': ChatNavigateEvent
  }
}

// ============================================================================
// AI Write Action Types (Phase 6)
// ============================================================================

export interface ScheduleConflict {
  type: 'room_overlap' | 'speaker_overlap' | 'capacity_overflow'
  severity: 'error' | 'warning'
  message: string
  conflicting_item?: {
    id: string
    title: string
    start_time: string
    end_time: string
  }
}

export interface AIWriteAction {
  action_id: string
  type: 'schedule_create' | 'schedule_update' | 'schedule_delete'
  status: 'pending_approval'
  data: Record<string, unknown>
  conflicts: ScheduleConflict[]
  impact: {
    affected_participants: number
    vip_count: number
    requires_notifications: boolean
  }
  label: string
  vip_warning?: string
}

export type ActionRisk = 'low' | 'medium' | 'high' | 'critical'
