import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ParticipantRoom, RoomPolicy } from '@/types'
import { useEvent } from '@/contexts/EventContext'

export function useRoomAssignments() {
  const { selectedEvent } = useEvent()
  const eventId = selectedEvent?.id
  const queryClient = useQueryClient()

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['room-assignments', eventId],
    queryFn: async () => {
      if (!eventId) return []
      const { data, error } = await supabase
        .from('participant_rooms')
        .select('*, participants(id, first_name, last_name, is_vip, gender, has_companion, accessibility_needs)')
        .eq('event_id', eventId)
      if (error) throw error
      return data as ParticipantRoom[]
    },
    enabled: !!eventId,
  })

  const { data: roomPolicy } = useQuery({
    queryKey: ['room-policy', eventId],
    queryFn: async () => {
      if (!eventId) return null
      const { data, error } = await supabase
        .from('events')
        .select('room_policy')
        .eq('id', eventId)
        .single()
      if (error) throw error
      return (data?.room_policy ?? {
        gender_separation: 'mixed',
        couple_same_room: true,
        vip_priority: true,
        accessible_priority: true,
      }) as RoomPolicy
    },
    enabled: !!eventId,
  })

  const updatePolicy = useMutation({
    mutationFn: async (policy: RoomPolicy) => {
      if (!eventId) throw new Error('No event selected')
      const { error } = await supabase
        .from('events')
        .update({ room_policy: policy })
        .eq('id', eventId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room-policy', eventId] }),
  })

  const saveAssignments = useMutation({
    mutationFn: async (newAssignments: Partial<ParticipantRoom>[]) => {
      if (!eventId) throw new Error('No event selected')
      const rows = newAssignments.map(a => ({ ...a, event_id: eventId }))
      const { error } = await supabase
        .from('participant_rooms')
        .upsert(rows, { onConflict: 'participant_id,event_id' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room-assignments', eventId] }),
  })

  return { assignments, isLoading, roomPolicy, updatePolicy, saveAssignments }
}

export function useParticipantGroups() {
  const { selectedEvent } = useEvent()
  const eventId = selectedEvent?.id
  const queryClient = useQueryClient()

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['participant-groups', eventId],
    queryFn: async () => {
      if (!eventId) return []
      const { data, error } = await supabase
        .from('participant_groups')
        .select('*, participant_group_members(*, participants(id, first_name, last_name))')
        .eq('event_id', eventId)
      if (error) throw error
      return data
    },
    enabled: !!eventId,
  })

  const createGroup = useMutation({
    mutationFn: async (group: { name: string; group_type: string; prefer_same_room: boolean; prefer_adjacent: boolean; notes?: string | null }) => {
      if (!eventId) throw new Error('No event selected')
      const { data, error } = await supabase
        .from('participant_groups')
        .insert({ ...group, event_id: eventId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['participant-groups', eventId] }),
  })

  const addMember = useMutation({
    mutationFn: async ({ groupId, participantId }: { groupId: string; participantId: string }) => {
      const { error } = await supabase
        .from('participant_group_members')
        .insert({ group_id: groupId, participant_id: participantId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['participant-groups', eventId] }),
  })

  const removeMember = useMutation({
    mutationFn: async ({ groupId, participantId }: { groupId: string; participantId: string }) => {
      const { error } = await supabase
        .from('participant_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('participant_id', participantId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['participant-groups', eventId] }),
  })

  return { groups, isLoading, createGroup, addMember, removeMember }
}
