import type { SimulationIssue } from './simulation.types'

// ============================================================================
// Schedule data structure for validators
// ============================================================================

export interface ScheduleData {
  id: string
  event_id: string
  title: string
  start_time: string // ISO datetime
  end_time: string // ISO datetime
  room_id: string | null
  room_name: string | null
  room_capacity: number | null
  speaker_id: string | null
  speaker_name: string | null
  backup_speaker_id: string | null
  session_type: string | null // 'lecture', 'workshop', 'break', 'meal', 'networking'
  expected_attendance: number | null
  equipment_required: string[] | null
}

// ============================================================================
// Participant schedule for transition validation
// ============================================================================

export interface ParticipantScheduleData {
  participant_id: string
  participant_name: string
  is_vip: boolean
  schedule_id: string
  schedule_title: string
  start_time: string
  end_time: string
  room_id: string | null
  room_name: string | null
}

// ============================================================================
// Vendor data for catering validation
// ============================================================================

export interface VendorScheduleData {
  vendor_id: string
  vendor_name: string
  category: string
  schedule_id: string | null
  service_start: string | null
  service_end: string | null
}

// ============================================================================
// Equipment assignment data
// ============================================================================

export interface EquipmentData {
  schedule_id: string
  required: string[]
  assigned: string[]
}

// ============================================================================
// Validator function signature
// ============================================================================

export type ValidatorFn<T = unknown> = (data: T) => Promise<SimulationIssue[]>

// ============================================================================
// Validator metadata
// ============================================================================

export interface ValidatorMeta {
  name: string
  category: SimulationIssue['category']
  description: string
}

// ============================================================================
// Validator with metadata
// ============================================================================

export interface Validator<T = unknown> {
  meta: ValidatorMeta
  validate: ValidatorFn<T>
}

// ============================================================================
// Simulation input data (all data needed by validators)
// ============================================================================

export interface SimulationInput {
  event_id: string
  schedules: ScheduleData[]
  participantSchedules: ParticipantScheduleData[]
  vendors: VendorScheduleData[]
  equipment: EquipmentData[]
}
