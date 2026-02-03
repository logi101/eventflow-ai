import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SimulationInput,
  ScheduleData,
  ParticipantScheduleData,
  VendorScheduleData,
  EquipmentData,
} from '../types'

// Supabase query result types - arrays for foreign key relationships without !inner
type ScheduleRow = {
  id: string
  event_id: string
  title: string
  start_time: string
  end_time: string
  session_type: string
  expected_attendance: number | null
  equipment_required: string[] | null
  backup_speaker_id: string | null
  room_id: string | null
  speaker_id: string | null
  rooms: { id: string; name: string; capacity: number }[] | null
  speakers: { id: string; name: string }[] | null
}

type ParticipantScheduleRow = {
  participant_id: string
  schedule_id: string
  participants: { id: string; first_name: string; last_name: string; is_vip: boolean }[] | null
  schedules: {
    id: string
    title: string
    start_time: string
    end_time: string
    room_id: string | null
    rooms: { id: string; name: string }[] | null
  }[] | null
}

type VendorRow = {
  vendor_id: string
  service_start: string | null
  service_end: string | null
  vendors: { id: string; name: string; category: string }[] | null
}

/**
 * Fetches all event data needed for simulation in parallel.
 * Orders all results consistently for deterministic simulation.
 */
export async function fetchSimulationData(
  supabase: SupabaseClient,
  eventId: string
): Promise<SimulationInput> {
  // Fetch all data in parallel
  const [
    schedulesResult,
    participantSchedulesResult,
    vendorsResult,
  ] = await Promise.all([
    // 1. Schedules with room and speaker info
    supabase
      .from('schedules')
      .select(`
        id,
        event_id,
        title,
        start_time,
        end_time,
        session_type,
        expected_attendance,
        equipment_required,
        backup_speaker_id,
        room_id,
        speaker_id,
        rooms(id, name, capacity),
        speakers(id, name)
      `)
      .eq('event_id', eventId)
      .eq('is_deleted', false)
      .order('start_time', { ascending: true })
      .order('id', { ascending: true }), // Tie-breaker for determinism

    // 2. Participant schedules for transition checking
    supabase
      .from('participant_schedules')
      .select(`
        participant_id,
        schedule_id,
        participants(id, first_name, last_name, is_vip),
        schedules(id, title, start_time, end_time, room_id, rooms(id, name))
      `)
      .eq('schedules.event_id', eventId)
      .order('participant_id', { ascending: true })
      .order('schedules.start_time', { ascending: true }),

    // 3. Vendors for catering gap checking
    supabase
      .from('event_vendors')
      .select(`
        vendor_id,
        service_start,
        service_end,
        vendors(id, name, category)
      `)
      .eq('event_id', eventId)
      .order('vendor_id', { ascending: true }),
  ])

  // Transform schedules data
  const schedules: ScheduleData[] = (schedulesResult.data as ScheduleRow[] || []).map(s => {
    const room = s.rooms?.[0]
    const speaker = s.speakers?.[0]
    return {
      id: s.id,
      event_id: s.event_id,
      title: s.title,
      start_time: s.start_time,
      end_time: s.end_time,
      room_id: s.room_id || null,
      room_name: room?.name || null,
      room_capacity: room?.capacity || null,
      speaker_id: s.speaker_id || null,
      speaker_name: speaker?.name || null,
      backup_speaker_id: s.backup_speaker_id,
      session_type: s.session_type,
      expected_attendance: s.expected_attendance,
      equipment_required: s.equipment_required || [],
    }
  })

  // Transform participant schedules
  const participantSchedules: ParticipantScheduleData[] = (participantSchedulesResult.data as ParticipantScheduleRow[] || [])
    .filter(ps => ps.participants && ps.participants.length > 0 && ps.schedules && ps.schedules.length > 0)
    .map(ps => {
      const participant = ps.participants![0]
      const schedule = ps.schedules![0]
      const room = schedule.rooms?.[0]
      return {
        participant_id: ps.participant_id,
        participant_name: `${participant.first_name} ${participant.last_name}`,
        is_vip: participant.is_vip || false,
        schedule_id: ps.schedule_id,
        schedule_title: schedule.title,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        room_id: schedule.room_id || null,
        room_name: room?.name || null,
      }
    })

  // Transform vendors
  const vendors: VendorScheduleData[] = (vendorsResult.data as VendorRow[] || [])
    .filter(v => v.vendors && v.vendors.length > 0)
    .map(v => {
      const vendor = v.vendors![0]
      return {
        vendor_id: v.vendor_id,
        vendor_name: vendor.name,
        category: vendor.category,
        schedule_id: null, // Vendors aren't tied to specific schedules
        service_start: v.service_start,
        service_end: v.service_end,
      }
    })

  // Equipment data derived from schedules
  const equipment: EquipmentData[] = schedules
    .filter(s => s.equipment_required && s.equipment_required.length > 0)
    .map(s => ({
      schedule_id: s.id,
      required: s.equipment_required || [],
      assigned: [], // TODO: Load from equipment_assignments table if exists
    }))

  return {
    event_id: eventId,
    schedules,
    participantSchedules,
    vendors,
    equipment,
  }
}
