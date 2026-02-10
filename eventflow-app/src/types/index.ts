// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Centralized Types
// ═══════════════════════════════════════════════════════════════════════════

// Event Types
export type EventStatus = 'draft' | 'planning' | 'active' | 'completed' | 'cancelled' | 'archived'

export interface EventType {
  id: string
  name: string
  name_en: string | null
  icon: string | null
  description: string | null
  is_system: boolean
}

export interface Event {
  id: string
  name: string
  description: string | null
  status: EventStatus
  start_date: string
  end_date: string | null
  venue_name: string | null
  venue_address: string | null
  venue_city: string | null
  max_participants: number | null
  budget: number | null
  currency: string
  event_type_id: string | null
  organization_id: string | null
  settings: Record<string, boolean> | null
  event_types?: EventType
  created_at: string
  participants_count?: number
  checklist_progress?: number
  vendors_count?: number
}

export interface EventFormData {
  name: string
  description: string
  event_type_id: string
  start_date: string
  end_date: string
  venue_name: string
  venue_address: string
  venue_city: string
  max_participants: string
  budget: string
  status: EventStatus
}

// Participant Types
export type ParticipantStatus = 'invited' | 'confirmed' | 'declined' | 'maybe' | 'checked_in' | 'no_show'

export interface Participant {
  id: string
  event_id: string
  first_name: string
  last_name: string
  full_name: string | null
  email: string | null
  phone: string
  phone_normalized: string | null
  status: ParticipantStatus
  has_companion: boolean
  companion_name: string | null
  companion_phone: string | null
  dietary_restrictions: string[] | null
  accessibility_needs: string | null
  needs_transportation: boolean
  transportation_location: string | null
  notes: string | null
  internal_notes: string | null
  is_vip: boolean
  vip_notes: string | null
  networking_opt_in: boolean
  invited_at: string | null
  confirmed_at: string | null
  checked_in_at: string | null
  created_at: string
  events?: { name: string }
  custom_fields?: Record<string, unknown>
}

export interface ParticipantFormData {
  first_name: string
  last_name: string
  phone: string
  email: string
  status: ParticipantStatus
  has_companion: boolean
  companion_name: string
  companion_phone: string
  dietary_restrictions: string
  accessibility_needs: string
  needs_transportation: boolean
  transportation_location: string
  notes: string
  is_vip: boolean
  vip_notes: string
  networking_opt_in: boolean
}

export interface ParticipantWithTracks extends Participant {
  tracks: Track[]
}

// Vendor Types
export type VendorStatus = 'pending' | 'quote_requested' | 'quoted' | 'approved' | 'rejected' | 'confirmed'

export interface VendorCategory {
  id: string
  name: string
  name_en: string | null
  icon: string | null
  description: string | null
  is_active: boolean
  sort_order: number
}

export interface Vendor {
  id: string
  category_id: string | null
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  description: string | null
  notes: string | null
  rating: number | null
  status: VendorStatus
  tags: string[] | null
  created_at: string
  vendor_categories?: VendorCategory
  events_count?: number
}

export interface VendorFormData {
  name: string
  category_id: string
  contact_name: string
  email: string
  phone: string
  website: string
  address: string
  city: string
  description: string
  notes: string
  rating: string
  status: VendorStatus
  tags: string
}

// Event-Vendor relationship (event_vendors table)
export interface EventVendor {
  id: string
  event_id: string
  vendor_id: string
  category_id: string | null
  status: VendorStatus
  quote_requested_at: string | null
  quote_request_notes: string | null
  quote_received_at: string | null
  quoted_amount: number | null
  quote_valid_until: string | null
  quote_notes: string | null
  quote_document_url: string | null
  approved_amount: number | null
  approved_at: string | null
  approved_by: string | null
  contract_signed: boolean
  contract_document_url: string | null
  payment_terms: string | null
  deposit_amount: number | null
  deposit_paid: boolean
  final_amount: number | null
  final_paid: boolean
  arrival_time: string | null
  arrival_confirmed: boolean
  arrival_confirmed_at: string | null
  actual_arrival_time: string | null
  post_event_rating: number | null
  post_event_notes: string | null
  would_use_again: boolean | null
  notes: string | null
  created_at: string
  vendors?: Vendor
}

// Program Builder Types
export type SpeakerRole = 'main' | 'backup' | 'moderator' | 'panelist' | 'facilitator'
export type ContingencyType = 'speaker_unavailable' | 'room_unavailable' | 'technical_failure' | 'weather' | 'medical' | 'security' | 'other'
export type ContingencyStatus = 'draft' | 'ready' | 'activated' | 'resolved'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type BlockType = 'session' | 'break' | 'registration' | 'networking' | 'meal' | 'other'

export interface ProgramDay {
  id: string
  event_id: string
  date: string
  day_number: number
  theme: string | null
  description: string | null
  start_time: string | null
  end_time: string | null
  created_at: string
}

export interface Track {
  id: string
  event_id: string
  name: string
  description: string | null
  color: string
  icon: string | null
  sort_order: number
  is_active: boolean
  sessions_count?: number
  created_at: string
}

export interface Room {
  id: string
  event_id: string
  name: string
  capacity: number | null
  floor: string | null
  building: string | null
  equipment: string[] | null
  notes: string | null
  is_active: boolean
  backup_room_id: string | null
  backup_room?: Room
  created_at: string
}

export interface Speaker {
  id: string
  event_id: string
  name: string
  title: string | null
  bio: string | null
  photo_url: string | null
  email: string | null
  phone: string | null
  company: string | null
  linkedin_url: string | null
  is_confirmed: boolean
  backup_speaker_id: string | null
  backup_speaker?: Speaker
  notes: string | null
  sessions_count?: number
  created_at: string
}

export interface SessionSpeaker {
  id: string
  schedule_id: string
  speaker_id: string
  role: SpeakerRole
  is_confirmed: boolean
  speaker?: Speaker
  created_at: string
}

export interface Contingency {
  id: string
  event_id: string
  schedule_id: string | null
  contingency_type: ContingencyType
  risk_level: RiskLevel
  probability: number | null
  impact: number | null
  description: string
  trigger_conditions: string | null
  action_plan: string
  responsible_person: string | null
  backup_speaker_id: string | null
  backup_room_id: string | null
  status: ContingencyStatus
  activated_at: string | null
  resolved_at: string | null
  notes: string | null
  backup_speaker?: Speaker
  backup_room?: Room
  created_at: string
}

export interface TimeBlock {
  id: string
  event_id: string
  program_day_id: string
  block_type: BlockType
  title: string
  start_time: string
  end_time: string
  description: string | null
  location: string | null
  is_global: boolean
  created_at: string
}

export interface Schedule {
  id: string
  event_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  location: string | null
  room: string | null
  track: string | null
  track_color: string | null
  speaker_name: string | null
  speaker_title: string | null
  is_break: boolean
  is_mandatory: boolean
  send_reminder: boolean
  reminder_minutes_before: number
  sort_order: number
  program_day_id: string | null
  track_id: string | null
  room_id: string | null
  max_participants: number | null
  is_published: boolean
  requires_registration: boolean
  session_type: string | null
  program_day?: ProgramDay
  track_ref?: Track
  room_ref?: Room
  session_speakers?: SessionSpeaker[]
  created_at: string
}

// Schedule Form Data
export interface ScheduleFormData {
  title: string
  description: string
  start_time: string
  end_time: string
  location: string
  room: string
  max_capacity: string
  is_mandatory: boolean
  is_break: boolean
  track: string
  track_color: string
  speaker_name: string
  speaker_title: string
  send_reminder: boolean
  reminder_minutes_before: string
}

// Checklist Types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface ChecklistItem {
  id: string
  event_id: string
  parent_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
  estimated_hours: number | null
  actual_hours: number | null
  estimated_cost: number | null
  actual_cost: number | null
  currency: string
  notes: string | null
  tags: string[] | null
  sort_order: number
  is_milestone: boolean
  milestone_date: string | null
  budget_allocation: number | null
  created_at: string
  events?: { name: string }
}

export interface ChecklistFormData {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string
  estimated_hours: string
  estimated_cost: string
  is_milestone: boolean
  notes: string
}

// Budget Alert Types
export const BudgetAlertThreshold = {
  WARNING: 80,
  CRITICAL: 100
} as const

export type BudgetAlertType = 'warning' | 'critical'
export type AlertSentVia = 'app' | 'whatsapp' | 'both'

export interface BudgetAlert {
  id: string
  checklistItemId: string
  eventId: string
  organizationId: string
  alertType: BudgetAlertType
  thresholdPercentage: number
  currentAmount: number
  budgetAmount: number
  sentAt: string
  sentVia: AlertSentVia
  acknowledgedAt?: string
  acknowledgedBy?: string
  acknowledgmentNotes?: string
  createdAt: string
}

// Checkin Types
export interface CheckinParticipant extends Participant {
  qr_code?: string
}

// Report Types
export interface ReportStats {
  totalEvents: number
  activeEvents: number
  completedEvents: number
  totalParticipants: number
  checkedInParticipants: number
  totalVendors: number
  totalBudget: number
  totalChecklistItems: number
  completedChecklistItems: number
  totalMessages: number
  totalSurveys: number
  totalResponses: number
}

// Feedback Types
export interface FeedbackSurvey {
  id: string
  event_id: string
  title: string
  description: string | null
  is_active: boolean
  anonymous: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  events?: { name: string }
  response_count?: number
}

export interface SimpleEvent {
  id: string
  name: string
}

export interface FeedbackResponse {
  id: string
  survey_id: string
  participant_id: string | null
  submitted_at: string
  answers: Record<string, unknown>
  participants?: { first_name: string; last_name: string }
}

export interface SurveyFormData {
  title: string
  description: string
  event_id: string
  is_active: boolean
  anonymous: boolean
  starts_at: string
  ends_at: string
}

// Program Management Types
export interface ParticipantSchedule {
  id: string
  participant_id: string
  schedule_id: string
  reminder_sent: boolean
  reminder_sent_at: string | null
  created_at: string
  participants?: Participant
  schedules?: Schedule
}

export interface UpcomingReminder {
  schedule: Schedule
  participants: {
    id: string
    first_name: string
    last_name: string
    phone: string
    reminder_sent: boolean
  }[]
  minutesUntil: number
}

// Event Detail Page Types
export interface ExtendedSchedule extends Schedule {
  program_days?: ProgramDay
  tracks?: Track
  rooms?: Room
}

export interface ScheduleChange {
  id: string
  schedule_id: string
  change_type: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  reason: string | null
  changed_by: string | null
  notification_sent: boolean
  notification_sent_at: string | null
  created_at: string
}

// Auth Types
export type UserRole = 'super_admin' | 'admin' | 'member'

export interface User {
  id: string
  email: string
  full_name: string | null
  organization_id: string | null
  role: UserRole
  created_at: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

// Room Assignment Types
export type RoomType = 'standard' | 'suite' | 'accessible' | 'vip'
export type BedConfiguration = 'single' | 'double' | 'twin' | 'king'

export interface ParticipantRoom {
  id: string
  participant_id: string
  event_id: string
  room_number: string
  building: string | null
  floor: string | null
  room_type: RoomType
  check_in_date: string | null
  check_out_date: string | null
  bed_configuration: BedConfiguration | null
  special_requests: string | null
  notes: string | null
  is_confirmed: boolean
  confirmed_at: string | null
  created_at: string
  updated_at: string
  participants?: Participant
}

export interface ParticipantRoomFormData {
  room_number: string
  building: string
  floor: string
  room_type: RoomType
  check_in_date: string
  check_out_date: string
  bed_configuration: string
  special_requests: string
  notes: string
}
