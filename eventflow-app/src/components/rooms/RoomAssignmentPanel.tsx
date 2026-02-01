// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Room Assignment Panel Component
// Beautiful, intuitive room assignment for conference participants
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import {
  Building2, DoorOpen, Bed, User, Search,
  Check, X, Edit2, Save, Loader2, Hotel,
  ChevronDown
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Participant, ParticipantRoom, RoomType, BedConfiguration } from '../../types'

interface RoomAssignmentPanelProps {
  eventId: string
  onClose?: () => void
}

interface ParticipantWithRoom extends Participant {
  room?: ParticipantRoom
}

export function RoomAssignmentPanel({ eventId, onClose }: RoomAssignmentPanelProps) {
  const [participants, setParticipants] = useState<ParticipantWithRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state for room assignment
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    building: '',
    floor: '',
    room_type: 'standard' as RoomType,
    bed_configuration: 'double' as BedConfiguration,
    check_in_date: '',
    check_out_date: '',
    special_requests: ''
  })

  useEffect(() => {
    fetchParticipantsWithRooms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function fetchParticipantsWithRooms() {
    setLoading(true)
    try {
      // Fetch participants
      const { data: participantsData, error: pError } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .order('last_name', { ascending: true })

      if (pError) throw pError

      // Fetch room assignments
      const { data: roomsData, error: rError } = await supabase
        .from('participant_rooms')
        .select('*')
        .eq('event_id', eventId)

      if (rError && rError.code !== 'PGRST116') throw rError // Ignore "table doesn't exist" error

      // Merge data
      const merged = (participantsData || []).map(p => ({
        ...p,
        room: (roomsData || []).find(r => r.participant_id === p.id)
      }))

      setParticipants(merged)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveRoomAssignment(participantId: string) {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('participant_rooms')
        .upsert({
          participant_id: participantId,
          event_id: eventId,
          ...roomForm,
          is_confirmed: true,
          confirmed_at: new Date().toISOString()
        }, {
          onConflict: 'participant_id,event_id'
        })

      if (error) throw error

      // Update local state
      setParticipants(prev => prev.map(p => {
        if (p.id === participantId) {
          return { ...p, room: { ...roomForm, participant_id: participantId, event_id: eventId } as ParticipantRoom }
        }
        return p
      }))

      setEditingId(null)
    } catch (error) {
      console.error('Error saving room:', error)
    } finally {
      setSaving(false)
    }
  }

  function startEditing(participant: ParticipantWithRoom) {
    setEditingId(participant.id)
    if (participant.room) {
      setRoomForm({
        room_number: participant.room.room_number || '',
        building: participant.room.building || '',
        floor: participant.room.floor || '',
        room_type: participant.room.room_type || 'standard',
        bed_configuration: participant.room.bed_configuration || 'double',
        check_in_date: participant.room.check_in_date || '',
        check_out_date: participant.room.check_out_date || '',
        special_requests: participant.room.special_requests || ''
      })
    } else {
      setRoomForm({
        room_number: '',
        building: '',
        floor: '',
        room_type: 'standard',
        bed_configuration: 'double',
        check_in_date: '',
        check_out_date: '',
        special_requests: ''
      })
    }
  }

  // Filter participants
  const filtered = participants.filter(p => {
    const matchesSearch =
      p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm)

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'assigned' && p.room) ||
      (filterStatus === 'unassigned' && !p.room)

    return matchesSearch && matchesFilter
  })

  const assignedCount = participants.filter(p => p.room).length
  const unassignedCount = participants.length - assignedCount

  const roomTypeLabels: Record<RoomType, string> = {
    standard: 'סטנדרט',
    suite: 'סוויטה',
    accessible: 'נגיש',
    vip: 'VIP'
  }

  const bedLabels: Record<BedConfiguration, string> = {
    single: 'יחיד',
    double: 'זוגי',
    twin: 'שתי מיטות',
    king: 'קינג'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#C4704B]" />
          <p className="text-[#8B8680]">טוען משתתפים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--ef-cream, #FAF8F5)' }}>
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DD] px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4704B]/10 flex items-center justify-center">
              <Hotel size={20} className="text-[#C4704B]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1F1D1A]" style={{ fontFamily: 'Rubik, sans-serif' }}>
                שיוך חדרים
              </h2>
              <p className="text-sm text-[#8B8680]">
                {assignedCount} משויכים מתוך {participants.length}
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-[#E8E4DD] rounded-lg transition-colors">
              <X size={20} className="text-[#8B8680]" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-[#6B9B7A]/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#6B9B7A]">{assignedCount}</p>
            <p className="text-xs text-[#6B9B7A]">משויכים</p>
          </div>
          <div className="flex-1 bg-[#D4A853]/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#9A7A30]">{unassignedCount}</p>
            <p className="text-xs text-[#9A7A30]">ממתינים</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8680]" />
            <input
              type="text"
              placeholder="חיפוש לפי שם או טלפון..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-[#E8E4DD] text-sm focus:outline-none focus:border-[#C4704B] transition-colors"
              style={{ background: 'white' }}
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | 'assigned' | 'unassigned')}
              className="appearance-none px-4 py-2.5 pr-10 rounded-xl border border-[#E8E4DD] text-sm focus:outline-none focus:border-[#C4704B] cursor-pointer"
              style={{ background: 'white' }}
            >
              <option value="all">הכל</option>
              <option value="assigned">משויכים</option>
              <option value="unassigned">ממתינים</option>
            </select>
            <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8680] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Participant List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {filtered.map(participant => (
            <div
              key={participant.id}
              className={`bg-white rounded-xl border transition-all ${
                editingId === participant.id
                  ? 'border-[#C4704B] shadow-lg'
                  : 'border-[#E8E4DD] hover:border-[#D4CFC6]'
              }`}
            >
              {/* Participant Header */}
              <div className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-[#E8E4DD] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-[#3D3A36]">
                    {participant.first_name[0]}{participant.last_name[0]}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-[#1F1D1A]">
                      {participant.first_name} {participant.last_name}
                    </h3>
                    {participant.is_vip && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#D4A853]/15 text-[#9A7A30]">
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#8B8680]">{participant.phone}</p>
                </div>

                {/* Room Status */}
                {participant.room ? (
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="text-sm font-medium text-[#1F1D1A]">
                        חדר {participant.room.room_number}
                      </p>
                      <p className="text-xs text-[#8B8680]">
                        {participant.room.building && `${participant.room.building} • `}
                        קומה {participant.room.floor || '-'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#6B9B7A]/15 flex items-center justify-center">
                      <Check size={16} className="text-[#6B9B7A]" />
                    </div>
                  </div>
                ) : (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#D4A853]/10 text-[#9A7A30]">
                    ממתין לשיוך
                  </span>
                )}

                {/* Edit Button */}
                <button
                  onClick={() => editingId === participant.id ? setEditingId(null) : startEditing(participant)}
                  className={`p-2 rounded-lg transition-colors ${
                    editingId === participant.id
                      ? 'bg-[#C4704B] text-white'
                      : 'hover:bg-[#E8E4DD] text-[#8B8680]'
                  }`}
                >
                  {editingId === participant.id ? <X size={18} /> : <Edit2 size={18} />}
                </button>
              </div>

              {/* Expanded Edit Form */}
              {editingId === participant.id && (
                <div className="border-t border-[#E8E4DD] p-4 bg-[#FAF8F5] rounded-b-xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {/* Room Number */}
                    <div>
                      <label className="block text-xs font-medium text-[#8B8680] mb-1.5">
                        <DoorOpen size={14} className="inline ml-1" />
                        מספר חדר *
                      </label>
                      <input
                        type="text"
                        value={roomForm.room_number}
                        onChange={e => setRoomForm({ ...roomForm, room_number: e.target.value })}
                        placeholder="101"
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E4DD] text-sm focus:outline-none focus:border-[#C4704B]"
                      />
                    </div>

                    {/* Building */}
                    <div>
                      <label className="block text-xs font-medium text-[#8B8680] mb-1.5">
                        <Building2 size={14} className="inline ml-1" />
                        בניין
                      </label>
                      <input
                        type="text"
                        value={roomForm.building}
                        onChange={e => setRoomForm({ ...roomForm, building: e.target.value })}
                        placeholder="מגדל A"
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E4DD] text-sm focus:outline-none focus:border-[#C4704B]"
                      />
                    </div>

                    {/* Floor */}
                    <div>
                      <label className="block text-xs font-medium text-[#8B8680] mb-1.5">
                        קומה
                      </label>
                      <input
                        type="text"
                        value={roomForm.floor}
                        onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })}
                        placeholder="3"
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E4DD] text-sm focus:outline-none focus:border-[#C4704B]"
                      />
                    </div>

                    {/* Room Type */}
                    <div>
                      <label className="block text-xs font-medium text-[#8B8680] mb-1.5">
                        סוג חדר
                      </label>
                      <select
                        value={roomForm.room_type}
                        onChange={e => setRoomForm({ ...roomForm, room_type: e.target.value as RoomType })}
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E4DD] text-sm focus:outline-none focus:border-[#C4704B]"
                      >
                        {Object.entries(roomTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {/* Bed Configuration */}
                    <div>
                      <label className="block text-xs font-medium text-[#8B8680] mb-1.5">
                        <Bed size={14} className="inline ml-1" />
                        סוג מיטה
                      </label>
                      <select
                        value={roomForm.bed_configuration}
                        onChange={e => setRoomForm({ ...roomForm, bed_configuration: e.target.value as BedConfiguration })}
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E4DD] text-sm focus:outline-none focus:border-[#C4704B]"
                      >
                        {Object.entries(bedLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Check-in Date */}
                    <div>
                      <label className="block text-xs font-medium text-[#8B8680] mb-1.5">
                        צ׳ק-אין
                      </label>
                      <input
                        type="date"
                        value={roomForm.check_in_date}
                        onChange={e => setRoomForm({ ...roomForm, check_in_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E4DD] text-sm focus:outline-none focus:border-[#C4704B]"
                      />
                    </div>

                    {/* Check-out Date */}
                    <div>
                      <label className="block text-xs font-medium text-[#8B8680] mb-1.5">
                        צ׳ק-אאוט
                      </label>
                      <input
                        type="date"
                        value={roomForm.check_out_date}
                        onChange={e => setRoomForm({ ...roomForm, check_out_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E4DD] text-sm focus:outline-none focus:border-[#C4704B]"
                      />
                    </div>

                    {/* Special Requests */}
                    <div>
                      <label className="block text-xs font-medium text-[#8B8680] mb-1.5">
                        בקשות מיוחדות
                      </label>
                      <input
                        type="text"
                        value={roomForm.special_requests}
                        onChange={e => setRoomForm({ ...roomForm, special_requests: e.target.value })}
                        placeholder="קומה גבוהה, נוף לים..."
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E4DD] text-sm focus:outline-none focus:border-[#C4704B]"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 text-sm text-[#8B8680] hover:bg-white rounded-lg transition-colors"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={() => saveRoomAssignment(participant.id)}
                      disabled={!roomForm.room_number || saving}
                      className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{
                        background: '#C4704B',
                        boxShadow: '0 2px 8px rgba(196, 112, 75, 0.25)'
                      }}
                    >
                      {saving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          שומר...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          שמור
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <User size={40} className="mx-auto text-[#D4CFC6] mb-3" />
              <p className="text-[#8B8680]">לא נמצאו משתתפים</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoomAssignmentPanel
