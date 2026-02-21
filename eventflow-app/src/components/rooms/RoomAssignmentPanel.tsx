// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Room Assignment Panel Component
// Beautiful, intuitive room assignment for conference participants
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import {
  Building2, DoorOpen, Bed, User, Search,
  Check, X, Edit2, Save, Loader2, Hotel,
  ChevronDown, Grid3x3, List
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Participant, ParticipantRoom, RoomType, BedConfiguration } from '../../types'
import { RoomGridView } from './RoomGridView'
import { RoomListView } from './RoomListView'

interface RoomAssignmentPanelProps {
  eventId: string
  onClose?: () => void
}

interface ParticipantWithRoom extends Participant {
  room?: ParticipantRoom
}

interface RoomGridItem {
  id: string
  room_number: string
  building?: string
  floor?: string
  participant?: {
    id: string
    first_name: string
    last_name: string
    is_vip: boolean
  }
}

interface RoomGridItem {
  id: string
  room_number: string
  building?: string
  floor?: string
  participant?: {
    id: string
    first_name: string
    last_name: string
    is_vip: boolean
  }
}

export function RoomAssignmentPanel({ eventId, onClose }: RoomAssignmentPanelProps) {
  const [participants, setParticipants] = useState<ParticipantWithRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'participant' | 'list' | 'grid'>('participant')

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

  // Convert participants to room-centric view
  const roomsData: RoomGridItem[] = filtered
    .filter(p => p.room?.room_number) // Only participants with assigned rooms
    .map(p => ({
      id: p.id,
      room_number: p.room!.room_number,
      building: p.room!.building || undefined,
      floor: p.room!.floor || undefined,
      participant: {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        is_vip: p.is_vip
      }
    }))

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
          <Loader2 size={32} className="animate-spin text-blue-400" />
          <p className="text-zinc-400">טוען משתתפים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900/30">
      {/* Header */}
      <div className="bg-zinc-900/50 border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Hotel size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                שיוך חדרים
              </h2>
              <p className="text-sm text-zinc-400">
                {assignedCount} משויכים מתוך {participants.length}
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-zinc-700 rounded-lg transition-colors">
              <X size={20} className="text-zinc-400" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-emerald-500/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{assignedCount}</p>
            <p className="text-xs text-emerald-500">משויכים</p>
          </div>
          <div className="flex-1 bg-amber-500/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{unassignedCount}</p>
            <p className="text-xs text-amber-500">ממתינים</p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 border border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <List size={16} />
            רשימה
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 border border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Grid3x3 size={16} />
            רשת
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="חיפוש לפי שם או טלפון..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-white/10 bg-zinc-900 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | 'assigned' | 'unassigned')}
              className="appearance-none px-4 py-2.5 pr-10 rounded-xl border border-white/10 bg-zinc-900 text-white text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">הכל</option>
              <option value="assigned">משויכים</option>
              <option value="unassigned">ממתינים</option>
            </select>
            <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Content Area - Conditional Rendering */}
      <div className="flex-1 overflow-auto p-4">
        {/* Grid View */}
        {viewMode === 'grid' && (
          <RoomGridView
            rooms={roomsData}
            onRoomClick={(roomId: string) => {
              const participant = filtered.find(p => p.id === roomId)
              if (participant) startEditing(participant)
            }}
          />
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <RoomListView
            rooms={roomsData}
            onRoomClick={(roomId: string) => {
              const participant = filtered.find(p => p.id === roomId)
              if (participant) startEditing(participant)
            }}
          />
        )}

        {/* Participant Assignment View (default) */}
        {viewMode === 'participant' && (
        <div className="space-y-2">
          {filtered.map(participant => (
            <div
              key={participant.id}
              className={`bg-zinc-800/50 rounded-xl border transition-all ${
                editingId === participant.id
                  ? 'border-blue-500'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Participant Header */}
              <div className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-zinc-200">
                    {participant.first_name[0]}{participant.last_name[0]}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">
                      {participant.first_name} {participant.last_name}
                    </h3>
                    {participant.is_vip && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/15 text-amber-400">
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400">{participant.phone}</p>
                </div>

                {/* Room Status */}
                {participant.room ? (
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">
                        חדר {participant.room.room_number}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {participant.room.building && `${participant.room.building} • `}
                        קומה {participant.room.floor || '-'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <Check size={16} className="text-emerald-400" />
                    </div>
                  </div>
                ) : (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-400">
                    ממתין לשיוך
                  </span>
                )}

                {/* Edit Button */}
                <button
                  onClick={() => editingId === participant.id ? setEditingId(null) : startEditing(participant)}
                  className={`p-2 rounded-lg transition-colors ${
                    editingId === participant.id
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {editingId === participant.id ? <X size={18} /> : <Edit2 size={18} />}
                </button>
              </div>

              {/* Expanded Edit Form */}
              {editingId === participant.id && (
                <div className="border-t border-white/10 p-4 bg-zinc-900/50 rounded-b-xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {/* Room Number */}
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        <DoorOpen size={14} className="inline ml-1" />
                        מספר חדר *
                      </label>
                      <input
                        type="text"
                        value={roomForm.room_number}
                        onChange={e => setRoomForm({ ...roomForm, room_number: e.target.value })}
                        placeholder="101"
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-zinc-900 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Building */}
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        <Building2 size={14} className="inline ml-1" />
                        בניין
                      </label>
                      <input
                        type="text"
                        value={roomForm.building}
                        onChange={e => setRoomForm({ ...roomForm, building: e.target.value })}
                        placeholder="מגדל A"
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-zinc-900 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Floor */}
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        קומה
                      </label>
                      <input
                        type="text"
                        value={roomForm.floor}
                        onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })}
                        placeholder="3"
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-zinc-900 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Room Type */}
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        סוג חדר
                      </label>
                      <select
                        value={roomForm.room_type}
                        onChange={e => setRoomForm({ ...roomForm, room_type: e.target.value as RoomType })}
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-zinc-900 text-white text-sm focus:outline-none focus:border-blue-500"
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
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        <Bed size={14} className="inline ml-1" />
                        סוג מיטה
                      </label>
                      <select
                        value={roomForm.bed_configuration}
                        onChange={e => setRoomForm({ ...roomForm, bed_configuration: e.target.value as BedConfiguration })}
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-zinc-900 text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        {Object.entries(bedLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Check-in Date */}
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        צ׳ק-אין
                      </label>
                      <input
                        type="date"
                        value={roomForm.check_in_date}
                        onChange={e => setRoomForm({ ...roomForm, check_in_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-zinc-900 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Check-out Date */}
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        צ׳ק-אאוט
                      </label>
                      <input
                        type="date"
                        value={roomForm.check_out_date}
                        onChange={e => setRoomForm({ ...roomForm, check_out_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-zinc-900 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Special Requests */}
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        בקשות מיוחדות
                      </label>
                      <input
                        type="text"
                        value={roomForm.special_requests}
                        onChange={e => setRoomForm({ ...roomForm, special_requests: e.target.value })}
                        placeholder="קומה גבוהה, נוף לים..."
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-zinc-900 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={() => saveRoomAssignment(participant.id)}
                      disabled={!roomForm.room_number || saving}
                      className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              <User size={40} className="mx-auto text-zinc-600 mb-3" />
              <p className="text-zinc-500">לא נמצאו משתתפים</p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}

export default RoomAssignmentPanel
