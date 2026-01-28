// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Event Settings Types
// ═══════════════════════════════════════════════════════════════════════════

export interface EventSettingsPanelProps {
  event: {
    id: string
    name: string
    settings: Record<string, boolean> | null
  }
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
  status: string
}

export interface Event {
  id: string
  name: string
  description: string | null
  status: string
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
  created_at: string
  participants_count?: number
  checklist_progress?: number
  vendors_count?: number
}

export interface EventType {
  id: string
  name: string
  name_en: string | null
  icon: string | null
  description: string | null
  is_system: boolean
}