import { useState } from 'react'
import { Wand2, CheckCircle, AlertTriangle, XCircle, Loader2, Users, BedDouble, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { useEvent } from '@/contexts/EventContext'
import { toast } from 'sonner'
import { autoAssignRooms } from '../services/roomAssignmentAlgorithm'
import type { AlgoParticipant, AlgoRoom, AlgoGroup, AssignmentResult, AssignmentSuggestion } from '../services/roomAssignmentAlgorithm'
import { useRoomAssignments, useParticipantGroups } from '../hooks/useRoomAssignments'
import type { RoomPolicy } from '@/types'

export function AutoAssignmentPanel() {
  const { selectedEvent } = useEvent()
  const eventId = selectedEvent?.id
  const [preview, setPreview] = useState<AssignmentResult | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  const { roomPolicy, saveAssignments } = useRoomAssignments()
  const { groups } = useParticipantGroups()

  // Fetch participants
  const { data: participants = [] } = useQuery({
    queryKey: ['participants-for-rooms', eventId],
    queryFn: async () => {
      if (!eventId) return []
      const { data, error } = await supabase
        .from('participants')
        .select('id, first_name, last_name, gender, has_companion, companion_name, companion_phone, is_vip, accessibility_needs')
        .eq('event_id', eventId)
        .eq('status', 'confirmed')
      if (error) throw error
      return data as AlgoParticipant[]
    },
    enabled: !!eventId,
  })

  // Fetch available rooms inventory
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms-inventory', eventId],
    queryFn: async () => {
      if (!eventId) return []
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, floor, building, room_type, bed_configuration, capacity, is_available')
        .eq('event_id', eventId)
        .eq('is_active', true)
      if (error) throw error
      return (data ?? []).map(r => ({
        id: r.id,
        room_number: r.name,
        building: r.building,
        floor: r.floor,
        room_type: (r.room_type ?? 'standard') as AlgoRoom['room_type'],
        bed_configuration: (r.bed_configuration ?? 'double') as AlgoRoom['bed_configuration'],
        capacity: r.capacity ?? 2,
        is_available: r.is_available ?? true,
      })) as AlgoRoom[]
    },
    enabled: !!eventId,
  })

  const defaultPolicy: RoomPolicy = {
    gender_separation: 'mixed',
    couple_same_room: true,
    vip_priority: true,
    accessible_priority: true,
  }
  const policy = roomPolicy ?? defaultPolicy

  const algoGroups: AlgoGroup[] = groups.map(g => ({
    id: g.id,
    prefer_same_room: g.prefer_same_room,
    prefer_adjacent: g.prefer_adjacent,
    participant_ids: (g.participant_group_members ?? []).map((m: { participant_id: string }) => m.participant_id),
  }))

  function handleCompute() {
    if (participants.length === 0) {
      toast.warning('אין משתתפים מאושרים לשיבוץ')
      return
    }
    if (rooms.length === 0) {
      toast.warning('אין חדרים במלאי — הוסף חדרים בטאב "מלאי חדרים"')
      return
    }
    setIsComputing(true)
    setTimeout(() => {
      const result = autoAssignRooms(participants, rooms, policy, algoGroups)
      setPreview(result)
      setIsComputing(false)
    }, 400)
  }

  async function handleApply() {
    if (!preview || !eventId) return
    setIsApplying(true)
    try {
      const rows = preview.assignments.map(a => ({
        participant_id: a.participant_id,
        event_id: eventId,
        room_number: a.room_number,
        building: a.building,
        floor: a.floor,
        room_type: a.room_type,
        bed_configuration: a.bed_configuration,
        roommate_participant_id: a.roommate_participant_id,
        assigned_by: 'auto' as const,
        is_confirmed: false,
      }))
      await saveAssignments.mutateAsync(rows)
      toast.success(`שובצו ${preview.stats.assigned} משתתפים בהצלחה`)
      setPreview(null)
    } catch {
      toast.error('שגיאה בשמירת השיבוצים')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + trigger */}
      <div className="bg-gradient-to-l from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wand2 size={20} className="text-blue-400" />
              שיבוץ אוטומטי חכם
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              האלגוריתם יחשב את השיבוץ האופטימלי לפי המדיניות שהגדרת.
              תקבל תצוגה מקדימה לפני האישור.
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><Users size={12} />{participants.length} משתתפים מאושרים</span>
              <span className="flex items-center gap-1"><Building2 size={12} />{rooms.length} חדרים במלאי</span>
            </div>
          </div>
          <button
            onClick={handleCompute}
            disabled={isComputing || participants.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 font-medium text-sm transition-all whitespace-nowrap"
          >
            {isComputing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {isComputing ? 'מחשב...' : 'חשב שיבוץ'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="שובצו" value={preview.stats.assigned} color="emerald" />
            <StatCard label="לא שובצו" value={preview.stats.unassigned} color={preview.stats.unassigned > 0 ? 'red' : 'zinc'} />
            <StatCard label="חדרים בשימוש" value={preview.stats.rooms_used} color="blue" />
          </div>

          {/* Conflicts */}
          {preview.conflicts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                <AlertTriangle size={15} />
                אזהרות ({preview.conflicts.length})
              </h4>
              {preview.conflicts.map((c, i) => (
                <p key={i} className={`text-xs flex items-start gap-2 ${c.severity === 'error' ? 'text-red-300' : 'text-amber-300'}`}>
                  {c.severity === 'error' ? <XCircle size={12} className="mt-0.5 shrink-0" /> : <AlertTriangle size={12} className="mt-0.5 shrink-0" />}
                  {c.message}
                </p>
              ))}
            </div>
          )}

          {/* Assignment list */}
          <div className="bg-zinc-800/50 border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <h4 className="text-sm font-semibold text-white">תצוגה מקדימה של השיבוץ</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="px-3 py-1.5 border border-zinc-600 text-zinc-300 rounded-lg hover:bg-zinc-700 text-xs transition-colors"
                >
                  בטל
                </button>
                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-xs font-medium transition-colors"
                >
                  {isApplying ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  אשר שיבוץ
                </button>
              </div>
            </div>
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {preview.assignments.map((a, i) => (
                <AssignmentRow key={i} assignment={a} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    zinc: 'text-zinc-400 bg-zinc-700/50 border-white/10',
  }
  return (
    <div className={`rounded-xl border p-4 text-center ${colors[color] ?? colors.zinc}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1 opacity-80">{label}</p>
    </div>
  )
}

function AssignmentRow({ assignment }: { assignment: AssignmentSuggestion }) {
  const roomTypeColors: Record<string, string> = {
    vip: 'text-amber-400',
    suite: 'text-purple-400',
    accessible: 'text-emerald-400',
    standard: 'text-zinc-400',
  }
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200">
          {assignment.participant_name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{assignment.participant_name}</p>
          {assignment.roommate_name && (
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <BedDouble size={10} />
              עם {assignment.roommate_name}
            </p>
          )}
          <p className="text-xs text-zinc-600 mt-0.5">{assignment.reason}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-medium text-white">חדר {assignment.room_number}</p>
        {assignment.building && <p className="text-xs text-zinc-500">{assignment.building}{assignment.floor ? ` · קומה ${assignment.floor}` : ''}</p>}
        <p className={`text-xs mt-0.5 ${roomTypeColors[assignment.room_type] ?? 'text-zinc-400'}`}>
          {assignment.room_type} · {assignment.bed_configuration}
        </p>
      </div>
    </div>
  )
}
