import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { writeCsvFile } from '../../utils/csv'
import { EventSettingsPanel } from '../../modules/events/components/EventSettingsPanel'
import type { Event, ProgramDay, Track, Room, Speaker, Contingency, ScheduleChange, TimeBlock, BlockType, ContingencyType, ContingencyStatus, RiskLevel, ExtendedSchedule } from '../../types'
import { SeatingPlanView } from '../../modules/networking/components/SeatingPlanView'
import { RoomGridView } from '../../modules/rooms/components/RoomGridView'
import type { SeatingParticipant } from '../../modules/networking/types'
import { SimulationTrigger, type SuggestedFix } from '../../modules/simulation'
import { FeatureGuard } from '../../components/guards'
import type { ParticipantRoom } from '../../types'

import {
  EventDetailHeader,
  EventOverviewTab,
  ProgramBuilderToolbar,
  ProgramDaysSection,
  ProgramTracksSection,
  ProgramRoomsSection,
  ProgramSpeakersSection,
  ProgramTimeBlocksSection,
  ProgramSessionsSection,
  ContingenciesTab,
  ChangesLogTab,
  ProgramDayModal,
  TrackModal,
  RoomModal,
  SpeakerModal,
  SessionModal,
  ContingencyModal,
  TimeBlockModal,
  DeleteConfirmModal,
  ContingencyDrawer,
} from './components'

export function EventDetailPage({ initialTab = 'overview' }: { initialTab?: string }) {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(initialTab)

  // Program Builder State
  const [programDays, setProgramDays] = useState<ProgramDay[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [sessions, setSessions] = useState<ExtendedSchedule[]>([])
  const [contingencies, setContingencies] = useState<Contingency[]>([])
  const [scheduleChanges, setScheduleChanges] = useState<ScheduleChange[]>([])
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [participantRooms, setParticipantRooms] = useState<ParticipantRoom[]>([])

  // Modal State
  const [showDayModal, setShowDayModal] = useState(false)
  const [showTrackModal, setShowTrackModal] = useState(false)
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [showSpeakerModal, setShowSpeakerModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showContingencyModal, setShowContingencyModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showConflictPanel, setShowConflictPanel] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Edit State
  const [editingDay, setEditingDay] = useState<ProgramDay | null>(null)
  const [editingTrack, setEditingTrack] = useState<Track | null>(null)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null)
  const [editingSession, setEditingSession] = useState<ExtendedSchedule | null>(null)
  const [editingContingency, setEditingContingency] = useState<Contingency | null>(null)
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null)

  // View State
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'grid' | 'calendar'>('list')
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all')
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all')
  const [speakerFilter, setSpeakerFilter] = useState<string>('all')

  // Form State
  const [dayForm, setDayForm] = useState({ date: '', theme: '', description: '' })
  const [trackForm, setTrackForm] = useState({ name: '', description: '', color: '#f97316', icon: '' })
  const [roomForm, setRoomForm] = useState({ name: '', capacity: '', floor: '', equipment: [] as string[], backup_room_id: '' })
  const [speakerForm, setSpeakerForm] = useState({ name: '', title: '', bio: '', email: '', phone: '', backup_speaker_id: '' })
  const [sessionForm, setSessionForm] = useState({
    title: '', description: '', start_time: '', end_time: '',
    program_day_id: '', track_id: '', room_id: '', session_type: ''
  })
  const [contingencyForm, setContingencyForm] = useState({
    contingency_type: 'speaker_unavailable' as ContingencyType,
    risk_level: 'medium' as RiskLevel,
    description: '', action_plan: '',
    backup_speaker_id: '', backup_room_id: ''
  })
  const [blockForm, setBlockForm] = useState({
    block_type: 'break' as BlockType,
    title: '', start_time: '', end_time: '', description: '', program_day_id: ''
  })

  // Conflicts State
  const [conflicts, setConflicts] = useState<{ type: string; message: string; scheduleId: string }[]>([])

  // Seating State
  const [seatingParticipants, setSeatingParticipants] = useState<SeatingParticipant[]>([])
  const [numberOfTables, setNumberOfTables] = useState(10)

  // Memoized tables for SeatingPlanView
  const memoizedSeatingTables = useMemo(() => {
    // For now, we put everyone in table 1 if not assigned, or use existing assignments
    // This is a simplified version for the detail tab
    return Array.from({ length: numberOfTables }, (_, i) => ({
      tableNumber: i + 1,
      capacity: 8,
      isVipTable: false,
      participants: []
    }))
  }, [numberOfTables])

  // Toast State
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({
    show: false, message: '', type: 'success'
  })

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
  }

  // Contingency State
  const [showContingencyPanel, setShowContingencyPanel] = useState(false)
  const [selectedScheduleForContingency, setSelectedScheduleForContingency] = useState<ExtendedSchedule | null>(null)

  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------

  async function loadSeatingData() {
    if (!eventId) return

    const { data, error } = await supabase
      .from('participants')
      .select(`
        id, first_name, last_name, is_vip, networking_opt_in,
        participant_tracks(track_id)
      `)
      .eq('event_id', eventId)
      .eq('status', 'confirmed')

    if (error) {
      console.error('Error loading seating data:', error)
      return
    }

    const participants: SeatingParticipant[] = (data || []).map(p => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      is_vip: p.is_vip,
      networking_opt_in: p.networking_opt_in || false,
      tracks: p.participant_tracks?.map((pt: { track_id: string }) => pt.track_id) || []
    }))

    setSeatingParticipants(participants)
  }

  async function loadRoomsData() {
    if (!eventId) return
    const { data, error } = await supabase
      .from('participant_rooms')
      .select('*')
      .eq('event_id', eventId)
    
    if (error) {
      console.error('Error loading room assignments:', error)
      return
    }
    setParticipantRooms((data || []) as ParticipantRoom[])
  }

  async function loadEventData() {
    if (!eventId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('events')
      .select(`*, event_types (id, name, name_en, icon)`)
      .eq('id', eventId)
      .single()

    if (error) {
      console.error('Error loading event:', error)
      navigate('/events')
      return
    }

    setEvent(data)
    setLoading(false)
  }

  const checkForConflicts = (sessionsList: ExtendedSchedule[]) => {
    const newConflicts: { type: string; message: string; scheduleId: string }[] = []

    // Check for room conflicts
    for (let i = 0; i < sessionsList.length; i++) {
      for (let j = i + 1; j < sessionsList.length; j++) {
        const s1 = sessionsList[i]
        const s2 = sessionsList[j]

        if (!s1.room_id || !s2.room_id) continue
        if (s1.room_id !== s2.room_id) continue
        if (s1.program_day_id !== s2.program_day_id) continue

        const s1Start = new Date(s1.start_time).getTime()
        const s1End = new Date(s1.end_time).getTime()
        const s2Start = new Date(s2.start_time).getTime()
        const s2End = new Date(s2.end_time).getTime()

        if ((s1Start < s2End && s1End > s2Start)) {
          newConflicts.push({
            type: 'room',
            message: `התנגשות חדר: "${s1.title}" ו-"${s2.title}" באותו חדר ובאותו זמן`,
            scheduleId: s1.id
          })
        }
      }
    }

    setConflicts(newConflicts)
  }

  async function loadProgramData() {
    if (!eventId) return

    // Load all program-related data in parallel
    const [daysRes, tracksRes, roomsRes, speakersRes, sessionsRes, contingenciesRes, changesRes, blocksRes] = await Promise.all([
      supabase.from('program_days').select('*').eq('event_id', eventId).order('date'),
      supabase.from('tracks').select('*').eq('event_id', eventId).eq('is_active', true).order('sort_order'),
      supabase.from('rooms').select('*').eq('event_id', eventId).eq('is_active', true).order('name'),
      supabase.from('speakers').select('*').eq('event_id', eventId).order('name'),
      supabase.from('schedules').select(`
        *,
        program_days:program_day_id(*),
        tracks:track_id(*),
        rooms:room_id(*),
        session_speakers(*, speakers(*))
      `).eq('event_id', eventId).order('start_time'),
      supabase.from('contingencies').select(`*, backup_speaker:backup_speaker_id(*), backup_room:backup_room_id(*)`).eq('event_id', eventId),
      supabase.from('schedule_changes').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('time_blocks').select('*').eq('event_id', eventId).order('start_time')
    ])

    if (daysRes.data) setProgramDays(daysRes.data)
    if (tracksRes.data) setTracks(tracksRes.data)
    if (roomsRes.data) setRooms(roomsRes.data)
    if (speakersRes.data) setSpeakers(speakersRes.data)
    if (sessionsRes.data) setSessions(sessionsRes.data)
    if (contingenciesRes.data) setContingencies(contingenciesRes.data)
    if (changesRes.data) setScheduleChanges(changesRes.data)
    if (blocksRes.data) setTimeBlocks(blocksRes.data)

    // Check for conflicts
    checkForConflicts(sessionsRes.data || [])
  }

  // Load event data
  useEffect(() => {
    if (eventId) {
      loadEventData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  // Load program data when switching to program tab
  useEffect(() => {
    if (activeTab === 'program' && eventId) {
      loadProgramData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, eventId])

  // Load seating data when switching to seating tab
  useEffect(() => {
    if (activeTab === 'seating' && eventId) {
      loadSeatingData()
    }
    if (activeTab === 'rooms' && eventId) {
      loadRoomsData()
      loadProgramData() // Need rooms list from program
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, eventId])

  // ---------------------------------------------------------------------------
  // Simulation and Contingency Handlers
  // ---------------------------------------------------------------------------

  const handleSimulationFix = useCallback((fix: SuggestedFix) => {
    const scheduleId = fix.action_data.schedule_id as string | undefined
    if (!scheduleId) return

    switch (fix.type) {
      case 'reassign_room':
      case 'adjust_time':
      case 'extend_break': {
        // Navigate to schedule and highlight the item
        setActiveTab('program')
        setTimeout(() => {
          const element = document.getElementById(`schedule-${scheduleId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            element.classList.add('ring-2', 'ring-blue-500')
            setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500'), 3000)
          }
        }, 100)
        break
      }

      case 'activate_backup': {
        // Open contingency panel for the schedule
        const schedule = sessions?.find(s => s.id === scheduleId)
        if (schedule) {
          setSelectedScheduleForContingency(schedule)
          setShowContingencyPanel(true)
        }
        break
      }
    }
  }, [sessions])

  const handleScheduleClick = useCallback((scheduleId: string) => {
    setActiveTab('program')
    setTimeout(() => {
      const element = document.getElementById(`schedule-${scheduleId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.classList.add('ring-2', 'ring-blue-500', 'transition-all')
        setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500'), 3000)
      }
    }, 100)
  }, [])

  const handleOpenContingency = useCallback((schedule: ExtendedSchedule) => {
    setSelectedScheduleForContingency(schedule)
    setShowContingencyPanel(true)
  }, [])

  const handleContingencySuccess = useCallback(() => {
    setShowContingencyPanel(false)
    setSelectedScheduleForContingency(null)
    loadProgramData()
    showToast('תוכנית מגירה הופעלה בהצלחה', 'success')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  async function saveProgramDay() {
    if (!eventId || !dayForm.date) return

    const dayData = {
      event_id: eventId,
      date: dayForm.date,
      theme: dayForm.theme || null,
      description: dayForm.description || null,
      day_number: programDays.length + 1
    }

    if (editingDay) {
      const { error } = await supabase.from('program_days').update(dayData).eq('id', editingDay.id)
      if (error) { showToast('שגיאה בעדכון יום', 'error'); return }
    } else {
      const { error } = await supabase.from('program_days').insert(dayData)
      if (error) { showToast('שגיאה בהוספת יום', 'error'); return }
    }

    showToast(editingDay ? 'יום עודכן בהצלחה' : 'יום נוסף בהצלחה')
    setShowDayModal(false)
    setEditingDay(null)
    setDayForm({ date: '', theme: '', description: '' })
    loadProgramData()
  }

  async function saveTrack() {
    if (!eventId || !trackForm.name) return

    const trackData = {
      event_id: eventId,
      name: trackForm.name,
      description: trackForm.description || null,
      color: trackForm.color,
      icon: trackForm.icon || null,
      sort_order: tracks.length
    }

    if (editingTrack) {
      const { error } = await supabase.from('tracks').update(trackData).eq('id', editingTrack.id)
      if (error) { showToast('שגיאה בעדכון מסלול', 'error'); return }
    } else {
      const { error } = await supabase.from('tracks').insert(trackData)
      if (error) { showToast('שגיאה בהוספת מסלול', 'error'); return }
    }

    showToast(editingTrack ? 'מסלול עודכן בהצלחה' : 'מסלול נוסף בהצלחה')
    setShowTrackModal(false)
    setEditingTrack(null)
    setTrackForm({ name: '', description: '', color: '#f97316', icon: '' })
    loadProgramData()
  }

  async function saveRoom() {
    if (!eventId || !roomForm.name) return

    const roomData = {
      event_id: eventId,
      name: roomForm.name,
      capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null,
      floor: roomForm.floor || null,
      equipment: roomForm.equipment.length > 0 ? roomForm.equipment : null,
      backup_room_id: roomForm.backup_room_id || null
    }

    if (editingRoom) {
      const { error } = await supabase.from('rooms').update(roomData).eq('id', editingRoom.id)
      if (error) { showToast('שגיאה בעדכון חדר', 'error'); return }
    } else {
      const { error } = await supabase.from('rooms').insert(roomData)
      if (error) { showToast('שגיאה בהוספת חדר', 'error'); return }
    }

    showToast(editingRoom ? 'חדר עודכן בהצלחה' : 'חדר נוסף בהצלחה')
    setShowRoomModal(false)
    setEditingRoom(null)
    setRoomForm({ name: '', capacity: '', floor: '', equipment: [], backup_room_id: '' })
    loadProgramData()
  }

  async function saveSpeaker() {
    if (!eventId || !speakerForm.name) return

    const speakerData = {
      event_id: eventId,
      name: speakerForm.name,
      title: speakerForm.title || null,
      bio: speakerForm.bio || null,
      email: speakerForm.email || null,
      phone: speakerForm.phone || null,
      backup_speaker_id: speakerForm.backup_speaker_id || null
    }

    if (editingSpeaker) {
      const { error } = await supabase.from('speakers').update(speakerData).eq('id', editingSpeaker.id)
      if (error) { showToast('שגיאה בעדכון דובר', 'error'); return }
    } else {
      const { error } = await supabase.from('speakers').insert(speakerData)
      if (error) { showToast('שגיאה בהוספת דובר', 'error'); return }
    }

    showToast(editingSpeaker ? 'דובר עודכן בהצלחה' : 'דובר נוסף בהצלחה')
    setShowSpeakerModal(false)
    setEditingSpeaker(null)
    setSpeakerForm({ name: '', title: '', bio: '', email: '', phone: '', backup_speaker_id: '' })
    loadProgramData()
  }

  async function saveSession() {
    if (!eventId || !sessionForm.title || !sessionForm.start_time || !sessionForm.end_time) {
      showToast('נא למלא שדות חובה', 'error')
      return
    }

    const sessionData = {
      event_id: eventId,
      title: sessionForm.title,
      description: sessionForm.description || null,
      start_time: sessionForm.start_time,
      end_time: sessionForm.end_time,
      program_day_id: sessionForm.program_day_id || null,
      track_id: sessionForm.track_id || null,
      room_id: sessionForm.room_id || null,
      session_type: sessionForm.session_type || null,
      sort_order: sessions.length
    }

    // Check for conflicts before saving
    const tempSessions = editingSession
      ? sessions.map(s => s.id === editingSession.id ? { ...s, ...sessionData } : s)
      : [...sessions, sessionData as unknown as ExtendedSchedule]

    const potentialConflicts = checkSessionConflicts(sessionData, tempSessions)
    if (potentialConflicts.length > 0) {
      setConflicts(potentialConflicts)
      setShowConflictPanel(true)
      // Don't return - let user decide
    }

    if (editingSession) {
      const { error } = await supabase.from('schedules').update(sessionData).eq('id', editingSession.id)
      if (error) { showToast('שגיאה בעדכון מפגש', 'error'); return }

      // Log the change
      await supabase.from('schedule_changes').insert({
        schedule_id: editingSession.id,
        change_type: 'update',
        old_value: editingSession,
        new_value: sessionData,
        reason: 'עדכון ידני'
      })
    } else {
      const { error } = await supabase.from('schedules').insert(sessionData)
      if (error) { showToast('שגיאה בהוספת מפגש', 'error'); return }
    }

    showToast(editingSession ? 'מפגש עודכן בהצלחה' : 'מפגש נוסף בהצלחה')
    setShowSessionModal(false)
    setEditingSession(null)
    setSessionForm({ title: '', description: '', start_time: '', end_time: '', program_day_id: '', track_id: '', room_id: '', session_type: '' })
    loadProgramData()
  }

  function checkSessionConflicts(newSession: { title: string; description: string | null; start_time: string; end_time: string; program_day_id: string | null; track_id: string | null; room_id: string | null; session_type: string | null; event_id: string }, allSessions: ExtendedSchedule[]) {
    const sessionConflicts: { type: string; message: string; scheduleId: string }[] = []

    if (!newSession.room_id || !newSession.program_day_id) return sessionConflicts

    for (const existing of allSessions) {
      if (editingSession && existing.id === editingSession.id) continue
      if (existing.room_id !== newSession.room_id) continue
      if (existing.program_day_id !== newSession.program_day_id) continue

      const newStart = new Date(newSession.start_time).getTime()
      const newEnd = new Date(newSession.end_time).getTime()
      const existStart = new Date(existing.start_time).getTime()
      const existEnd = new Date(existing.end_time).getTime()

      if (newStart < existEnd && newEnd > existStart) {
        sessionConflicts.push({
          type: 'room',
          message: `התנגשות חדר עם "${existing.title}"`,
          scheduleId: existing.id
        })
      }
    }

    return sessionConflicts
  }

  async function saveContingency() {
    if (!eventId || !contingencyForm.description || !contingencyForm.action_plan) return

    const contingencyData = {
      event_id: eventId,
      contingency_type: contingencyForm.contingency_type,
      risk_level: contingencyForm.risk_level,
      description: contingencyForm.description,
      action_plan: contingencyForm.action_plan,
      backup_speaker_id: contingencyForm.backup_speaker_id || null,
      backup_room_id: contingencyForm.backup_room_id || null,
      status: 'ready' as ContingencyStatus
    }

    if (editingContingency) {
      const { error } = await supabase.from('contingencies').update(contingencyData).eq('id', editingContingency.id)
      if (error) { showToast('שגיאה בעדכון תכנית חירום', 'error'); return }
    } else {
      const { error } = await supabase.from('contingencies').insert(contingencyData)
      if (error) { showToast('שגיאה בהוספת תכנית חירום', 'error'); return }
    }

    showToast(editingContingency ? 'תכנית חירום עודכנה' : 'תכנית חירום נוספה')
    setShowContingencyModal(false)
    setEditingContingency(null)
    setContingencyForm({
      contingency_type: 'speaker_unavailable',
      risk_level: 'medium',
      description: '', action_plan: '',
      backup_speaker_id: '', backup_room_id: ''
    })
    loadProgramData()
  }

  async function saveTimeBlock() {
    if (!eventId || !blockForm.title || !blockForm.start_time || !blockForm.end_time) return

    const blockData = {
      event_id: eventId,
      program_day_id: blockForm.program_day_id,
      block_type: blockForm.block_type,
      title: blockForm.title,
      start_time: blockForm.start_time,
      end_time: blockForm.end_time,
      description: blockForm.description || null,
      is_global: !blockForm.program_day_id
    }

    if (editingBlock) {
      const { error } = await supabase.from('time_blocks').update(blockData).eq('id', editingBlock.id)
      if (error) { showToast('שגיאה בעדכון בלוק זמן', 'error'); return }
    } else {
      const { error } = await supabase.from('time_blocks').insert(blockData)
      if (error) { showToast('שגיאה בהוספת בלוק זמן', 'error'); return }
    }

    showToast(editingBlock ? 'בלוק זמן עודכן' : 'בלוק זמן נוסף')
    setShowBlockModal(false)
    setEditingBlock(null)
    setBlockForm({ block_type: 'break', title: '', start_time: '', end_time: '', description: '', program_day_id: '' })
    loadProgramData()
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    let error
    switch (deleteTarget.type) {
      case 'day':
        ({ error } = await supabase.from('program_days').delete().eq('id', deleteTarget.id))
        break
      case 'track':
        ({ error } = await supabase.from('tracks').delete().eq('id', deleteTarget.id))
        break
      case 'room':
        ({ error } = await supabase.from('rooms').delete().eq('id', deleteTarget.id))
        break
      case 'speaker':
        ({ error } = await supabase.from('speakers').delete().eq('id', deleteTarget.id))
        break
      case 'session':
        ({ error } = await supabase.from('schedules').delete().eq('id', deleteTarget.id))
        break
      case 'contingency':
        ({ error } = await supabase.from('contingencies').delete().eq('id', deleteTarget.id))
        break
      case 'block':
        ({ error } = await supabase.from('time_blocks').delete().eq('id', deleteTarget.id))
        break
    }

    if (error) {
      showToast('שגיאה במחיקה', 'error')
    } else {
      showToast('נמחק בהצלחה')
      loadProgramData()
    }

    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  async function exportToCsv() {
    const exportData = sessions.map(s => ({
      'כותרת': s.title,
      'תיאור': s.description || '',
      'שעת התחלה': new Date(s.start_time).toLocaleString('he-IL'),
      'שעת סיום': new Date(s.end_time).toLocaleString('he-IL'),
      'מסלול': tracks.find(t => t.id === s.track_id)?.name || '',
      'חדר': rooms.find(r => r.id === s.room_id)?.name || '',
      'יום': programDays.find(d => d.id === s.program_day_id)?.theme || ''
    }))

    writeCsvFile(exportData, `program-${event?.name || 'event'}.csv`)
    showToast('קובץ CSV הורד בהצלחה')
  }

  // ---------------------------------------------------------------------------
  // Callback Handlers for Sub-Components
  // ---------------------------------------------------------------------------

  const handleAddDay = () => {
    setEditingDay(null)
    setDayForm({ date: '', theme: '', description: '' })
    setShowDayModal(true)
  }

  const handleEditDay = (day: ProgramDay) => {
    setEditingDay(day)
    setDayForm({ date: day.date, theme: day.theme || '', description: day.description || '' })
    setShowDayModal(true)
  }

  const handleDeleteDay = (day: ProgramDay, index: number) => {
    setDeleteTarget({ type: 'day', id: day.id, name: day.theme || `יום ${index + 1}` })
    setShowDeleteConfirm(true)
  }

  const handleAddTrack = () => {
    setEditingTrack(null)
    setTrackForm({ name: '', description: '', color: '#f97316', icon: '' })
    setShowTrackModal(true)
  }

  const handleEditTrack = (track: Track) => {
    setEditingTrack(track)
    setTrackForm({ name: track.name, description: track.description || '', color: track.color, icon: track.icon || '' })
    setShowTrackModal(true)
  }

  const handleDeleteTrack = (track: Track) => {
    setDeleteTarget({ type: 'track', id: track.id, name: track.name })
    setShowDeleteConfirm(true)
  }

  const handleAddRoom = () => {
    setEditingRoom(null)
    setRoomForm({ name: '', capacity: '', floor: '', equipment: [], backup_room_id: '' })
    setShowRoomModal(true)
  }

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room)
    setRoomForm({
      name: room.name,
      capacity: room.capacity?.toString() || '',
      floor: room.floor || '',
      equipment: room.equipment || [],
      backup_room_id: room.backup_room_id || ''
    })
    setShowRoomModal(true)
  }

  const handleDeleteRoom = (room: Room) => {
    setDeleteTarget({ type: 'room', id: room.id, name: room.name })
    setShowDeleteConfirm(true)
  }

  const handleAddSpeaker = () => {
    setEditingSpeaker(null)
    setSpeakerForm({ name: '', title: '', bio: '', email: '', phone: '', backup_speaker_id: '' })
    setShowSpeakerModal(true)
  }

  const handleEditSpeaker = (speaker: Speaker) => {
    setEditingSpeaker(speaker)
    setSpeakerForm({
      name: speaker.name,
      title: speaker.title || '',
      bio: speaker.bio || '',
      email: speaker.email || '',
      phone: speaker.phone || '',
      backup_speaker_id: speaker.backup_speaker_id || ''
    })
    setShowSpeakerModal(true)
  }

  const handleDeleteSpeaker = (speaker: Speaker) => {
    setDeleteTarget({ type: 'speaker', id: speaker.id, name: speaker.name })
    setShowDeleteConfirm(true)
  }

  const handleAddBlock = () => {
    setEditingBlock(null)
    setBlockForm({ block_type: 'break', title: '', start_time: '', end_time: '', description: '', program_day_id: '' })
    setShowBlockModal(true)
  }

  const handleEditBlock = (block: TimeBlock) => {
    setEditingBlock(block)
    setBlockForm({
      block_type: block.block_type,
      title: block.title,
      start_time: block.start_time,
      end_time: block.end_time,
      description: block.description || '',
      program_day_id: block.program_day_id
    })
    setShowBlockModal(true)
  }

  const handleDeleteBlock = (block: TimeBlock) => {
    setDeleteTarget({ type: 'block', id: block.id, name: block.title })
    setShowDeleteConfirm(true)
  }

  const handleAddSession = () => {
    setEditingSession(null)
    setSessionForm({ title: '', description: '', start_time: '', end_time: '', program_day_id: '', track_id: '', room_id: '', session_type: '' })
    setShowSessionModal(true)
  }

  const handleEditSession = (session: ExtendedSchedule) => {
    setEditingSession(session)
    setSessionForm({
      title: session.title,
      description: session.description || '',
      start_time: session.start_time,
      end_time: session.end_time,
      program_day_id: session.program_day_id || '',
      track_id: session.track_id || '',
      room_id: session.room_id || '',
      session_type: session.session_type || ''
    })
    setShowSessionModal(true)
  }

  const handleDeleteSession = (session: ExtendedSchedule) => {
    setDeleteTarget({ type: 'session', id: session.id, name: session.title })
    setShowDeleteConfirm(true)
  }

  const handleAddContingency = () => {
    setEditingContingency(null)
    setContingencyForm({
      contingency_type: 'speaker_unavailable',
      risk_level: 'medium',
      description: '', action_plan: '',
      backup_speaker_id: '', backup_room_id: ''
    })
    setShowContingencyModal(true)
  }

  const handleEditContingency = (contingency: Contingency) => {
    setEditingContingency(contingency)
    setContingencyForm({
      contingency_type: contingency.contingency_type,
      risk_level: contingency.risk_level,
      description: contingency.description,
      action_plan: contingency.action_plan,
      backup_speaker_id: contingency.backup_speaker_id || '',
      backup_room_id: contingency.backup_room_id || ''
    })
    setShowContingencyModal(true)
  }

  const handleDeleteContingency = (contingency: Contingency) => {
    setDeleteTarget({ type: 'contingency', id: contingency.id, name: contingency.description })
    setShowDeleteConfirm(true)
  }

  // ---------------------------------------------------------------------------
  // Computed / Derived
  // ---------------------------------------------------------------------------

  const filteredSessions = sessions.filter(s => {
    if (selectedDayFilter !== 'all' && s.program_day_id !== selectedDayFilter) return false
    if (selectedTrackFilter !== 'all' && s.track_id !== selectedTrackFilter) return false
    return true
  })

  // ---------------------------------------------------------------------------
  // Loading / Error States
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-400">אירוע לא נמצא</p>
        <Link to="/events" className="text-orange-500 hover:underline">חזרה לרשימת האירועים</Link>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-8" data-testid="event-detail-page">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 left-4 z-50 p-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' :
          toast.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
        } text-white`} data-testid={`${toast.type === 'success' ? 'event-saved-toast' : toast.type === 'error' ? 'error-message' : 'conflict-warning'}`}>
          {toast.message}
        </div>
      )}

      <EventDetailHeader
        event={event}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <EventOverviewTab
          description={event.description}
          programDays={programDays}
          sessions={sessions}
          speakers={speakers}
        />
      )}

      {activeTab === 'program' && (
        <div data-testid="program-builder" role="region" aria-label="בונה תוכנית">
          <ProgramBuilderToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            conflicts={conflicts}
            showConflictPanel={showConflictPanel}
            onToggleConflictPanel={() => setShowConflictPanel(!showConflictPanel)}
            onExportCsv={exportToCsv}
          />

          <ProgramDaysSection
            programDays={programDays}
            onAddDay={handleAddDay}
            onEditDay={handleEditDay}
            onDeleteDay={handleDeleteDay}
          />

          <ProgramTracksSection
            tracks={tracks}
            sessions={sessions}
            onAddTrack={handleAddTrack}
            onEditTrack={handleEditTrack}
            onDeleteTrack={handleDeleteTrack}
          />

          <ProgramRoomsSection
            rooms={rooms}
            onAddRoom={handleAddRoom}
            onEditRoom={handleEditRoom}
            onDeleteRoom={handleDeleteRoom}
          />

          <ProgramSpeakersSection
            speakers={speakers}
            sessions={sessions}
            speakerFilter={speakerFilter}
            onSpeakerFilterChange={setSpeakerFilter}
            onAddSpeaker={handleAddSpeaker}
            onEditSpeaker={handleEditSpeaker}
            onDeleteSpeaker={handleDeleteSpeaker}
          />

          <ProgramTimeBlocksSection
            timeBlocks={timeBlocks}
            onAddBlock={handleAddBlock}
            onEditBlock={handleEditBlock}
            onDeleteBlock={handleDeleteBlock}
          />

          <ProgramSessionsSection
            sessions={sessions}
            filteredSessions={filteredSessions}
            tracks={tracks}
            programDays={programDays}
            rooms={rooms}
            viewMode={viewMode}
            selectedDayFilter={selectedDayFilter}
            selectedTrackFilter={selectedTrackFilter}
            onDayFilterChange={setSelectedDayFilter}
            onTrackFilterChange={setSelectedTrackFilter}
            onAddSession={handleAddSession}
            onEditSession={handleEditSession}
            onDeleteSession={handleDeleteSession}
            onOpenContingency={handleOpenContingency}
          />
        </div>
      )}

      {activeTab === 'contingencies' && (
        <ContingenciesTab
          contingencies={contingencies}
          onAddContingency={handleAddContingency}
          onEditContingency={handleEditContingency}
          onDeleteContingency={handleDeleteContingency}
          onActivateContingency={() => showToast('מציג ניתוח השפעה...', 'warning')}
        />
      )}

      {activeTab === 'seating' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">שיבוץ לשולחנות</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">מספר שולחנות:</label>
              <input
                type="number"
                value={numberOfTables}
                onChange={(e) => setNumberOfTables(Math.max(1, parseInt(e.target.value) || 10))}
                className="w-20 px-2 py-1 bg-zinc-800 rounded border border-white/10"
                min="1"
                max="100"
              />
            </div>
          </div>

          {seatingParticipants.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <p>אין משתתפים מאושרים לשיבוץ</p>
              <p className="text-sm mt-2">רק משתתפים עם סטטוס &quot;אישר הגעה&quot; יופיעו כאן</p>
            </div>
          ) : (
            <FeatureGuard feature="networking">
              <SeatingPlanView
                tables={memoizedSeatingTables}
                onMoveParticipant={() => {}} // Not implemented in this view yet
                onGenerateSeating={() => {}} // Not implemented in this view yet
              />
            </FeatureGuard>
          )}
        </div>
      )}

      {activeTab === 'rooms' && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">מפת חדרים ולינה</h2>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                🔵 מאוייש
              </span>
              <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                💎 VIP
              </span>
            </div>
          </div>

          <RoomGridView
            rooms={rooms}
            assignments={participantRooms}
            participants={[]} // We'd need to fetch full participants for better tooltips
            onRoomClick={(room) => showToast(`פרטי חדר: ${room.name}`)}
          />
        </div>
      )}

      {activeTab === 'simulation' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <FeatureGuard feature="simulation">
            <SimulationTrigger
              eventId={eventId!}
              onFixClick={handleSimulationFix}
              onScheduleClick={handleScheduleClick}
            />
          </FeatureGuard>
        </div>
      )}

      {activeTab === 'changes' && (
        <ChangesLogTab scheduleChanges={scheduleChanges} />
      )}

      {activeTab === 'settings' && event && (
        <EventSettingsPanel event={event} />
      )}

      {/* Modals */}
      {showDayModal && (
        <ProgramDayModal
          editingDay={editingDay}
          dayForm={dayForm}
          onFormChange={setDayForm}
          onSave={saveProgramDay}
          onClose={() => setShowDayModal(false)}
        />
      )}

      {showTrackModal && (
        <TrackModal
          editingTrack={editingTrack}
          trackForm={trackForm}
          onFormChange={setTrackForm}
          onSave={saveTrack}
          onClose={() => setShowTrackModal(false)}
        />
      )}

      {showRoomModal && (
        <RoomModal
          editingRoom={editingRoom}
          roomForm={roomForm}
          rooms={rooms}
          onFormChange={setRoomForm}
          onSave={saveRoom}
          onClose={() => setShowRoomModal(false)}
        />
      )}

      {showSpeakerModal && (
        <SpeakerModal
          editingSpeaker={editingSpeaker}
          speakerForm={speakerForm}
          speakers={speakers}
          onFormChange={setSpeakerForm}
          onSave={saveSpeaker}
          onClose={() => setShowSpeakerModal(false)}
        />
      )}

      {showSessionModal && (
        <SessionModal
          editingSession={editingSession}
          sessionForm={sessionForm}
          programDays={programDays}
          tracks={tracks}
          rooms={rooms}
          onFormChange={setSessionForm}
          onSave={saveSession}
          onClose={() => setShowSessionModal(false)}
        />
      )}

      {showContingencyModal && (
        <ContingencyModal
          editingContingency={editingContingency}
          contingencyForm={contingencyForm}
          speakers={speakers}
          rooms={rooms}
          onFormChange={setContingencyForm}
          onSave={saveContingency}
          onClose={() => setShowContingencyModal(false)}
        />
      )}

      {showBlockModal && (
        <TimeBlockModal
          editingBlock={editingBlock}
          blockForm={blockForm}
          programDays={programDays}
          onFormChange={setBlockForm}
          onSave={saveTimeBlock}
          onClose={() => setShowBlockModal(false)}
        />
      )}

      {showDeleteConfirm && deleteTarget && (
        <DeleteConfirmModal
          deleteTarget={deleteTarget}
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      {showContingencyPanel && selectedScheduleForContingency && (
        <ContingencyDrawer
          eventId={eventId!}
          selectedSchedule={selectedScheduleForContingency}
          onSuccess={handleContingencySuccess}
          onClose={() => setShowContingencyPanel(false)}
        />
      )}
    </div>
  )
}
