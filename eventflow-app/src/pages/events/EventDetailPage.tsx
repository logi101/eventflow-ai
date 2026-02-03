import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Calendar, Users, Plus, Edit2, Trash2, Clock, X, Loader2, Coffee, User, FileText, AlertTriangle, ArrowLeft, Grid3X3, List, CalendarDays, Mic, Monitor, Video, Building2, Save, Eye, Target, Shield, Zap, UserCheck, Download, Play } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'
import { EventSettingsPanel } from '../../modules/events/components/EventSettingsPanel'
import type { Event, ProgramDay, Track, Room, Speaker, Contingency, ScheduleChange, TimeBlock, BlockType, ContingencyType, ContingencyStatus, RiskLevel, ExtendedSchedule } from '../../types'
import { formatDate, getStatusColor, getStatusLabel } from '../../utils'
import { SeatingPlanView } from '../../components/networking/SeatingPlanView'
import type { SeatingParticipant } from '../../modules/networking/types'
import { SimulationTrigger, type SuggestedFix } from '../../modules/simulation'
import { ContingencyPanel } from '../../modules/contingency'

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, eventId])

  // Simulation and Contingency Handlers
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

  // CRUD Operations for Program Days
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

  // CRUD Operations for Tracks
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

  // CRUD Operations for Rooms
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

  // CRUD Operations for Speakers
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

  // CRUD Operations for Sessions
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
    const conflicts: { type: string; message: string; scheduleId: string }[] = []

    if (!newSession.room_id || !newSession.program_day_id) return conflicts

    for (const existing of allSessions) {
      if (editingSession && existing.id === editingSession.id) continue
      if (existing.room_id !== newSession.room_id) continue
      if (existing.program_day_id !== newSession.program_day_id) continue

      const newStart = new Date(newSession.start_time).getTime()
      const newEnd = new Date(newSession.end_time).getTime()
      const existStart = new Date(existing.start_time).getTime()
      const existEnd = new Date(existing.end_time).getTime()

      if (newStart < existEnd && newEnd > existStart) {
        conflicts.push({
          type: 'room',
          message: `התנגשות חדר עם "${existing.title}"`,
          scheduleId: existing.id
        })
      }
    }

    return conflicts
  }

  // CRUD Operations for Contingencies
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

  // CRUD Operations for Time Blocks
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

  // Delete operations
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

  // Helper functions
  const getRiskLevelColor = (level: RiskLevel) => {
    const colors = {
      low: 'bg-emerald-500/20 text-emerald-400',
      medium: 'bg-amber-500/20 text-amber-400',
      high: 'bg-orange-500/20 text-orange-400',
      critical: 'bg-red-500/20 text-red-400'
    }
    return colors[level]
  }

  const getRiskLevelLabel = (level: RiskLevel) => {
    const labels = { low: 'נמוך', medium: 'בינוני', high: 'גבוה', critical: 'קריטי' }
    return labels[level]
  }

  const getBlockTypeLabel = (type: BlockType) => {
    const labels = {
      session: 'מפגש',
      break: 'הפסקה',
      registration: 'רישום',
      networking: 'נטוורקינג',
      meal: 'ארוחה',
      other: 'אחר'
    }
    return labels[type]
  }

  const getBlockTypeIcon = (type: BlockType) => {
    const icons = {
      session: <Mic size={16} />,
      break: <Coffee size={16} />,
      registration: <UserCheck size={16} />,
      networking: <Users size={16} />,
      meal: <Coffee size={16} />,
      other: <Clock size={16} />
    }
    return icons[type]
  }

  const getContingencyTypeLabel = (type: ContingencyType) => {
    const labels = {
      speaker_unavailable: 'דובר לא זמין',
      room_unavailable: 'חדר לא זמין',
      technical_failure: 'תקלה טכנית',
      weather: 'מזג אוויר',
      medical: 'רפואי',
      security: 'ביטחוני',
      other: 'אחר'
    }
    return labels[type]
  }

  // Export functions
  async function exportToExcel() {
    const exportData = sessions.map(s => ({
      'כותרת': s.title,
      'תיאור': s.description || '',
      'שעת התחלה': new Date(s.start_time).toLocaleString('he-IL'),
      'שעת סיום': new Date(s.end_time).toLocaleString('he-IL'),
      'מסלול': tracks.find(t => t.id === s.track_id)?.name || '',
      'חדר': rooms.find(r => r.id === s.room_id)?.name || '',
      'יום': programDays.find(d => d.id === s.program_day_id)?.theme || ''
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'תוכנית')
    XLSX.writeFile(wb, `program-${event?.name || 'event'}.xlsx`)
    showToast('קובץ Excel הורד בהצלחה')
  }

  // Filter sessions
  const filteredSessions = sessions.filter(s => {
    if (selectedDayFilter !== 'all' && s.program_day_id !== selectedDayFilter) return false
    if (selectedTrackFilter !== 'all' && s.track_id !== selectedTrackFilter) return false
    return true
  })

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

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/events" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold" data-testid="event-detail-title">{event.name}</h1>
          <p className="text-zinc-400">{formatDate(event.start_date)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(event.status)}`}>
          {getStatusLabel(event.status)}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-2" data-testid="event-tabs">
        {[
          { id: 'overview', label: 'סקירה', icon: <Eye size={18} /> },
          { id: 'program', label: 'בניית תוכנית', icon: <Calendar size={18} /> },
          { id: 'contingencies', label: 'תכניות חירום', icon: <Shield size={18} /> },
          { id: 'seating', label: 'שיבוץ לשולחנות', icon: <Grid3X3 size={18} /> },
          { id: 'simulation', label: 'סימולציה', icon: <Play size={18} /> },
          { id: 'changes', label: 'יומן שינויים', icon: <Clock size={18} /> },
          { id: 'settings', label: 'הגדרות תזכורות', icon: <Zap size={18} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'hover:bg-white/5'
            }`}
            data-testid={`event-${tab.id}-tab`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {event.description && (
            <div className="card">
              <h2 className="text-xl font-bold mb-2">תיאור</h2>
              <p className="text-zinc-400">{event.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-bold text-orange-500">{programDays.length}</p>
              <p className="text-zinc-400">ימי תוכנית</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-blue-500">{sessions.length}</p>
              <p className="text-zinc-400">מפגשים</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-green-500">{speakers.length}</p>
              <p className="text-zinc-400">דוברים</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'program' && (
        <div data-testid="program-builder" role="region" aria-label="בונה תוכנית">
          {/* Program Builder Toolbar */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'hover:bg-white/5'}`}
                data-testid="view-toggle-list"
              >
                <List size={20} />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2 rounded-lg ${viewMode === 'timeline' ? 'bg-orange-500 text-white' : 'hover:bg-white/5'}`}
                data-testid="view-toggle-timeline"
              >
                <Clock size={20} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'hover:bg-white/5'}`}
                data-testid="view-toggle-grid"
              >
                <Grid3X3 size={20} />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded-lg ${viewMode === 'calendar' ? 'bg-orange-500 text-white' : 'hover:bg-white/5'}`}
                data-testid="view-toggle-calendar"
              >
                <CalendarDays size={20} />
              </button>
            </div>

            <div className="flex gap-2 mr-auto">
              <button
                onClick={exportToExcel}
                className="btn-secondary flex items-center gap-2"
                data-testid="export-program-excel-button"
              >
                <Download size={18} />
                Excel
              </button>
              <button
                onClick={() => setShowConflictPanel(!showConflictPanel)}
                className={`btn-secondary flex items-center gap-2 ${conflicts.length > 0 ? 'text-red-500' : ''}`}
                data-testid="conflicts-panel-toggle"
              >
                <AlertTriangle size={18} />
                התנגשויות ({conflicts.length})
              </button>
            </div>
          </div>

          {/* Conflicts Panel */}
          {showConflictPanel && (
            <div className="card mb-6 border-red-500/30 bg-red-500/10" data-testid="conflicts-panel">
              <h3 className="font-bold text-red-400 mb-2">התנגשויות שזוהו</h3>
              <p data-testid="conflicts-count">{conflicts.length} התנגשויות</p>
              <div className="space-y-2 mt-2">
                {conflicts.map((c, i) => (
                  <div key={i} className="p-2 bg-[#1a1d27] rounded border border-red-200">
                    <p className="text-sm">{c.message}</p>
                  </div>
                ))}
                {conflicts.length === 0 && (
                  <p className="text-emerald-400">אין התנגשויות!</p>
                )}
              </div>
            </div>
          )}

          {/* Live Update Indicator */}
          <div className="flex items-center gap-2 mb-4 text-sm text-zinc-400" data-testid="live-update-indicator">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>עדכון בזמן אמת</span>
          </div>

          {/* Program Days Section */}
          <div className="card mb-6" data-testid="program-days-section">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" data-testid="program-days-title">ימי התוכנית</h2>
              <button
                onClick={() => { setEditingDay(null); setDayForm({ date: '', theme: '', description: '' }); setShowDayModal(true) }}
                className="btn-primary flex items-center gap-2"
                data-testid="add-program-day-button"
              >
                <Plus size={18} />
                הוסף יום
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {programDays.map((day, index) => (
                <div key={day.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid="program-day-card" data-date={day.date}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-sm mb-2" data-testid="day-number-badge">
                        יום {index + 1}
                      </span>
                      <h3 className="font-bold">{day.theme || formatDate(day.date).split(',')[0]}</h3>
                      <p className="text-sm text-zinc-400">{new Date(day.date).toLocaleDateString('he-IL')}</p>
                      {day.description && <p className="text-sm text-zinc-400 mt-2">{day.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingDay(day)
                          setDayForm({ date: day.date, theme: day.theme || '', description: day.description || '' })
                          setShowDayModal(true)
                        }}
                        className="p-1 hover:bg-white/5 rounded"
                        data-testid="edit-day-button"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => { setDeleteTarget({ type: 'day', id: day.id, name: day.theme || `יום ${index + 1}` }); setShowDeleteConfirm(true) }}
                        className="p-1 hover:bg-red-500/10 rounded text-red-500"
                        data-testid="delete-day-button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tracks Section */}
          <div className="card mb-6" data-testid="tracks-section">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" data-testid="tracks-title">מסלולים</h2>
              <button
                onClick={() => { setEditingTrack(null); setTrackForm({ name: '', description: '', color: '#f97316', icon: '' }); setShowTrackModal(true) }}
                className="btn-primary flex items-center gap-2"
                data-testid="add-track-button"
              >
                <Plus size={18} />
                הוסף מסלול
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tracks.map(track => (
                <div key={track.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid="track-card">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: track.color }}
                        data-testid="track-color-indicator"
                      ></div>
                      <h3 className="font-bold">{track.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingTrack(track)
                          setTrackForm({ name: track.name, description: track.description || '', color: track.color, icon: track.icon || '' })
                          setShowTrackModal(true)
                        }}
                        className="p-1 hover:bg-white/5 rounded"
                        data-testid="edit-track-button"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => { setDeleteTarget({ type: 'track', id: track.id, name: track.name }); setShowDeleteConfirm(true) }}
                        className="p-1 hover:bg-red-500/10 rounded text-red-500"
                        data-testid="delete-track-button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {track.description && <p className="text-sm text-zinc-400 mt-2">{track.description}</p>}
                  <p className="text-sm text-zinc-400 mt-2" data-testid="track-sessions-count">
                    {sessions.filter(s => s.track_id === track.id).length} מפגשים
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Rooms Section */}
          <div className="card mb-6" data-testid="rooms-section">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" data-testid="rooms-title">חדרים</h2>
              <button
                onClick={() => { setEditingRoom(null); setRoomForm({ name: '', capacity: '', floor: '', equipment: [], backup_room_id: '' }); setShowRoomModal(true) }}
                className="btn-primary flex items-center gap-2"
                data-testid="add-room-button"
              >
                <Plus size={18} />
                הוסף חדר
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {rooms.map(room => (
                <div key={room.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid="room-card">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold">{room.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingRoom(room)
                          setRoomForm({
                            name: room.name,
                            capacity: room.capacity?.toString() || '',
                            floor: room.floor || '',
                            equipment: room.equipment || [],
                            backup_room_id: room.backup_room_id || ''
                          })
                          setShowRoomModal(true)
                        }}
                        className="p-1 hover:bg-white/5 rounded"
                        data-testid="edit-room-button"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => { setDeleteTarget({ type: 'room', id: room.id, name: room.name }); setShowDeleteConfirm(true) }}
                        className="p-1 hover:bg-red-500/10 rounded text-red-500"
                        data-testid="delete-room-button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mt-2" data-testid="room-capacity">
                    <Users size={14} />
                    {room.capacity || '---'} מקומות
                  </div>
                  {room.equipment && room.equipment.length > 0 && (
                    <div className="flex gap-1 mt-2" data-testid="room-equipment">
                      {room.equipment.map(eq => (
                        <span key={eq} className="text-xs bg-white/5 px-2 py-1 rounded">
                          {eq === 'projector' && <Monitor size={12} className="inline" />}
                          {eq === 'microphone' && <Mic size={12} className="inline" />}
                          {eq === 'livestream' && <Video size={12} className="inline" />}
                          {eq === 'whiteboard' && <FileText size={12} className="inline" />}
                        </span>
                      ))}
                    </div>
                  )}
                  {room.backup_room_id && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2" data-testid="backup-room-indicator">
                      <Shield size={12} />
                      חדר גיבוי מוגדר
                    </div>
                  )}
                  <div className="mt-2" data-testid="room-availability-indicator">
                    <span className="text-xs text-emerald-400">זמין</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Speakers Section */}
          <div className="card mb-6" data-testid="speakers-section">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" data-testid="speakers-title">דוברים</h2>
              <div className="flex gap-2">
                <select
                  value={speakerFilter}
                  onChange={(e) => setSpeakerFilter(e.target.value)}
                  className="border rounded-lg px-3 py-1 text-sm"
                  data-testid="speaker-filter-select"
                >
                  <option value="all">כל הדוברים</option>
                  <option value="confirmed">מאושרים</option>
                  <option value="pending">ממתינים</option>
                </select>
                <button
                  onClick={() => { setEditingSpeaker(null); setSpeakerForm({ name: '', title: '', bio: '', email: '', phone: '', backup_speaker_id: '' }); setShowSpeakerModal(true) }}
                  className="btn-primary flex items-center gap-2"
                  data-testid="add-speaker-button"
                >
                  <Plus size={18} />
                  הוסף דובר
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {speakers
                .filter(s => speakerFilter === 'all' || (speakerFilter === 'confirmed' ? s.is_confirmed : !s.is_confirmed))
                .map(speaker => (
                  <div key={speaker.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid="speaker-card">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center" data-testid="speaker-photo">
                        {speaker.photo_url ? (
                          <img src={speaker.photo_url} alt={speaker.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User size={24} className="text-zinc-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold">{speaker.name}</h3>
                            {speaker.title && <p className="text-sm text-zinc-400">{speaker.title}</p>}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
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
                              }}
                              className="p-1 hover:bg-white/5 rounded"
                              data-testid="edit-speaker-button"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => { setDeleteTarget({ type: 'speaker', id: speaker.id, name: speaker.name }); setShowDeleteConfirm(true) }}
                              className="p-1 hover:bg-red-500/10 rounded text-red-500"
                              data-testid="delete-speaker-button"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${speaker.is_confirmed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`} data-testid="speaker-status">
                            {speaker.is_confirmed ? 'מאושר' : 'ממתין לאישור'}
                          </span>
                        </div>
                        {speaker.backup_speaker_id && (
                          <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2" data-testid="backup-speaker-indicator">
                            <Shield size={12} />
                            דובר גיבוי מוגדר
                          </div>
                        )}
                        <p className="text-sm text-zinc-400 mt-2" data-testid="speaker-sessions-count">
                          {sessions.filter(s => s.session_speakers?.some(ss => ss.speaker_id === speaker.id)).length} מפגשים
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Time Blocks Section */}
          <div className="card mb-6" data-testid="time-blocks-section">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">בלוקי זמן</h2>
              <button
                onClick={() => { setEditingBlock(null); setBlockForm({ block_type: 'break', title: '', start_time: '', end_time: '', description: '', program_day_id: '' }); setShowBlockModal(true) }}
                className="btn-primary flex items-center gap-2"
                data-testid="add-time-block-button"
              >
                <Plus size={18} />
                הוסף בלוק זמן
              </button>
            </div>

            <div className="space-y-2">
              {timeBlocks.map(block => (
                <div key={block.id} className="border rounded-lg p-3 flex items-center justify-between" data-testid="time-block-card">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400" data-testid="block-type-icon">{getBlockTypeIcon(block.block_type)}</span>
                    <div>
                      <h4 className="font-medium">{block.title}</h4>
                      <p className="text-sm text-zinc-400">
                        {new Date(block.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} -
                        {new Date(block.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-xs bg-white/5 px-2 py-1 rounded">{getBlockTypeLabel(block.block_type)}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
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
                      }}
                      className="p-1 hover:bg-white/5 rounded"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => { setDeleteTarget({ type: 'block', id: block.id, name: block.title }); setShowDeleteConfirm(true) }}
                      className="p-1 hover:bg-red-500/10 rounded text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sessions Builder */}
          <div className="card" data-testid="session-builder">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">מפגשים</h2>
              <div className="flex gap-2">
                <select
                  value={selectedDayFilter}
                  onChange={(e) => setSelectedDayFilter(e.target.value)}
                  className="border rounded-lg px-3 py-1 text-sm"
                  data-testid="day-filter-select"
                >
                  <option value="all">כל הימים</option>
                  {programDays.map((day, i) => (
                    <option key={day.id} value={day.id}>יום {i + 1} - {day.theme || new Date(day.date).toLocaleDateString('he-IL')}</option>
                  ))}
                </select>
                <select
                  value={selectedTrackFilter}
                  onChange={(e) => setSelectedTrackFilter(e.target.value)}
                  className="border rounded-lg px-3 py-1 text-sm"
                  data-testid="track-filter-select"
                >
                  <option value="all">כל המסלולים</option>
                  {tracks.map(track => (
                    <option key={track.id} value={track.id}>{track.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setEditingSession(null)
                    setSessionForm({ title: '', description: '', start_time: '', end_time: '', program_day_id: '', track_id: '', room_id: '', session_type: '' })
                    setShowSessionModal(true)
                  }}
                  className="btn-primary flex items-center gap-2"
                  data-testid="add-session-button"
                  aria-label="הוסף מפגש חדש"
                >
                  <Plus size={18} />
                  הוסף מפגש
                </button>
              </div>
            </div>

            {/* Sessions List/Grid View */}
            {viewMode === 'list' && (
              <div className="space-y-3">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    data-testid="session-card"
                    data-track-index={tracks.findIndex(t => t.id === session.track_id)}
                    data-day-index={programDays.findIndex(d => d.id === session.program_day_id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {session.track_id && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tracks.find(t => t.id === session.track_id)?.color || '#ccc' }}
                              data-testid="session-track-indicator"
                              data-track-index={tracks.findIndex(t => t.id === session.track_id)}
                            ></div>
                          )}
                          <h3 className="font-bold">{session.title}</h3>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                          <span data-testid="session-duration">
                            <Clock size={14} className="inline mr-1" />
                            {new Date(session.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} -
                            {new Date(session.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {session.room_id && (
                            <span>
                              <Building2 size={14} className="inline mr-1" />
                              {rooms.find(r => r.id === session.room_id)?.name}
                            </span>
                          )}
                          {session.program_day_id && (
                            <span data-testid="session-day-indicator" data-day-index={programDays.findIndex(d => d.id === session.program_day_id)}>
                              <Calendar size={14} className="inline mr-1" />
                              יום {programDays.findIndex(d => d.id === session.program_day_id) + 1}
                            </span>
                          )}
                        </div>
                        {session.session_speakers && session.session_speakers.length > 0 && (
                          <div className="flex gap-2 mt-2" data-testid="session-speakers">
                            {session.session_speakers.map(ss => (
                              <span key={ss.id} className="text-xs bg-white/5 px-2 py-1 rounded flex items-center gap-1">
                                <User size={12} />
                                {ss.speaker?.name || 'דובר'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenContingency(session)}
                          className="p-1 hover:bg-orange-500/10 rounded text-orange-500"
                          title="הפעל תוכנית מגירה"
                          data-testid="contingency-session-button"
                        >
                          <AlertTriangle size={16} />
                        </button>
                        <button
                          onClick={() => {
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
                          }}
                          className="p-1 hover:bg-white/5 rounded"
                          data-testid="edit-session-button"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => { setDeleteTarget({ type: 'session', id: session.id, name: session.title }); setShowDeleteConfirm(true) }}
                          className="p-1 hover:bg-red-500/10 rounded text-red-500"
                          data-testid="delete-session-button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredSessions.length === 0 && (
                  <div className="text-center py-8 text-zinc-400">
                    <Calendar className="mx-auto mb-2" size={32} />
                    <p>אין מפגשים עדיין</p>
                  </div>
                )}
              </div>
            )}

            {/* Timeline View */}
            {viewMode === 'timeline' && (
              <div data-testid="timeline-view">
                <div className="relative border-r-2 border-orange-500/30 pr-4">
                  {filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      className="mb-4 relative"
                      data-testid="timeline-session"
                      draggable
                    >
                      <div className="absolute -right-2 top-0 w-4 h-4 rounded-full bg-orange-500"></div>
                      <div className="mr-4 border rounded-lg p-3 hover:shadow-md transition-shadow">
                        <p className="text-xs text-zinc-400">
                          {new Date(session.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <h4 className="font-bold">{session.title}</h4>
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="mb-4 h-12 border border-dashed rounded" data-testid="timeline-slot"></div>
                  ))}
                </div>
              </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-3 gap-4" data-testid="grid-view">
                {tracks.map(track => (
                  <div key={track.id} className="border rounded-lg p-4">
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: track.color }}></div>
                      {track.name}
                    </h3>
                    <div className="space-y-2">
                      {filteredSessions.filter(s => s.track_id === track.id).map(session => (
                        <div key={session.id} className="border rounded p-2 text-sm">
                          <p className="font-medium">{session.title}</p>
                          <p className="text-zinc-400 text-xs">
                            {new Date(session.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Calendar View */}
            {viewMode === 'calendar' && (
              <div data-testid="calendar-view">
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
                    <div key={day} className="text-center font-bold text-zinc-400 p-2">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {programDays.map(day => (
                    <div key={day.id} className="border rounded p-2 min-h-[100px]">
                      <p className="font-bold text-sm">{new Date(day.date).getDate()}</p>
                      <div className="space-y-1 mt-1">
                        {sessions.filter(s => s.program_day_id === day.id).slice(0, 3).map(session => (
                          <div key={session.id} className="text-xs bg-orange-100 p-1 rounded truncate">
                            {session.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contingencies' && (
        <div data-testid="contingencies-section">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" data-testid="contingencies-title">תכניות חירום</h2>
            <div className="flex gap-2">
              <button className="btn-secondary" data-testid="show-risk-matrix-button">
                <Target size={18} className="inline mr-2" />
                מטריצת סיכונים
              </button>
              <button
                onClick={() => {
                  setEditingContingency(null)
                  setContingencyForm({
                    contingency_type: 'speaker_unavailable',
                    risk_level: 'medium',
                    description: '', action_plan: '',
                    backup_speaker_id: '', backup_room_id: ''
                  })
                  setShowContingencyModal(true)
                }}
                className="btn-primary flex items-center gap-2"
                data-testid="add-contingency-button"
              >
                <Plus size={18} />
                הוסף תכנית חירום
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contingencies.map(contingency => (
              <div
                key={contingency.id}
                className={`border rounded-lg p-4 ${contingency.status === 'activated' ? 'border-red-500 bg-red-500/10 active' : 'border-white/10'}`}
                data-testid="contingency-card"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(contingency.risk_level)}`} data-testid="risk-level-indicator">
                      {getRiskLevelLabel(contingency.risk_level)}
                    </span>
                    <span className="text-sm text-zinc-400">{getContingencyTypeLabel(contingency.contingency_type)}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
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
                      }}
                      className="p-1 hover:bg-white/5 rounded"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => { setDeleteTarget({ type: 'contingency', id: contingency.id, name: contingency.description }); setShowDeleteConfirm(true) }}
                      className="p-1 hover:bg-red-500/10 rounded text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="font-medium mb-2">{contingency.description}</p>
                <p className="text-sm text-zinc-400 mb-3"><strong>תכנית פעולה:</strong> {contingency.action_plan}</p>

                {contingency.backup_speaker_id && (
                  <div className="flex items-center gap-1 text-sm text-emerald-400 mb-2" data-testid="linked-speaker">
                    <User size={14} />
                    דובר גיבוי: {contingency.backup_speaker?.name}
                  </div>
                )}
                {contingency.backup_room_id && (
                  <div className="flex items-center gap-1 text-sm text-emerald-400 mb-2" data-testid="linked-room">
                    <Building2 size={14} />
                    חדר גיבוי: {contingency.backup_room?.name}
                  </div>
                )}

                {contingency.status !== 'activated' && (
                  <button
                    className="btn-secondary w-full mt-2 text-red-400 border-red-500/30"
                    data-testid="activate-contingency-button"
                    onClick={() => {
                      // Show impact analysis modal before activation
                      showToast('מציג ניתוח השפעה...', 'warning')
                    }}
                  >
                    <Zap size={16} className="inline mr-2" />
                    הפעל תכנית חירום
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
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
              <p className="text-sm mt-2">רק משתתפים עם סטטוס "אישר הגעה" יופיעו כאן</p>
            </div>
          ) : (
            <SeatingPlanView
              eventId={eventId!}
              participants={seatingParticipants}
              numberOfTables={numberOfTables}
              defaultTableCapacity={8}
              onAssignmentsSaved={() => showToast('שיבוצים נשמרו בהצלחה')}
            />
          )}
        </div>
      )}

      {activeTab === 'simulation' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <SimulationTrigger
            eventId={eventId!}
            onFixClick={handleSimulationFix}
            onScheduleClick={handleScheduleClick}
          />
        </div>
      )}

      {activeTab === 'changes' && (
        <div data-testid="changes-log-section">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" data-testid="changes-log-tab">יומן שינויים</h2>
            <select
              className="border rounded-lg px-3 py-2"
              data-testid="change-filter-select"
            >
              <option value="all">כל השינויים</option>
              <option value="time_change">שינוי זמן</option>
              <option value="room_change">שינוי חדר</option>
              <option value="speaker_change">שינוי דובר</option>
            </select>
          </div>

          <div className="space-y-3">
            {scheduleChanges.map(change => (
              <div key={change.id} className="border rounded-lg p-4" data-testid="change-log-entry">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm text-zinc-400" data-testid="change-timestamp">
                      {new Date(change.created_at).toLocaleString('he-IL')}
                    </span>
                    <span className="mx-2">|</span>
                    <span className="font-medium" data-testid="change-type">{change.change_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${change.notification_sent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`} data-testid="notification-status">
                      {change.notification_sent ? 'נשלח' : 'ממתין'}
                    </span>
                    {!change.notification_sent && (
                      <button
                        className="text-sm text-orange-500 hover:underline"
                        data-testid="send-notification-button"
                      >
                        שלח התראה
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div data-testid="change-old-value">
                    <span className="text-zinc-400">ערך קודם:</span>
                    <span className="mr-2">{JSON.stringify(change.old_value)}</span>
                  </div>
                  <div data-testid="change-new-value">
                    <span className="text-zinc-400">ערך חדש:</span>
                    <span className="mr-2">{JSON.stringify(change.new_value)}</span>
                  </div>
                </div>
                {change.reason && (
                  <p className="text-sm text-zinc-400 mt-2">סיבה: {change.reason}</p>
                )}
              </div>
            ))}

            {scheduleChanges.length === 0 && (
              <div className="text-center py-8 text-zinc-400">
                <Clock className="mx-auto mb-2" size={32} />
                <p>אין שינויים עדיין</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && event && (
        <EventSettingsPanel event={event} />
      )}

      {/* Modals */}
      {/* Program Day Modal */}
      {showDayModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal w-full max-w-md" data-testid="program-day-modal">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingDay ? 'עריכת יום' : 'יום חדש'}</h3>
              <button onClick={() => setShowDayModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">תאריך *</label>
                <input
                  type="date"
                  value={dayForm.date}
                  onChange={(e) => setDayForm({ ...dayForm, date: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="day-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">נושא היום</label>
                <input
                  type="text"
                  value={dayForm.theme}
                  onChange={(e) => setDayForm({ ...dayForm, theme: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="לדוגמה: יום פתיחה - חדשנות"
                  data-testid="day-theme-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  value={dayForm.description}
                  onChange={(e) => setDayForm({ ...dayForm, description: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  rows={3}
                  data-testid="day-description-input"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowDayModal(false)} className="btn-secondary">ביטול</button>
              <button onClick={saveProgramDay} className="btn-primary" data-testid="save-program-day-button">
                <Save size={18} className="inline mr-2" />
                שמור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track Modal */}
      {showTrackModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal w-full max-w-md" data-testid="track-modal">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingTrack ? 'עריכת מסלול' : 'מסלול חדש'}</h3>
              <button onClick={() => setShowTrackModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם המסלול *</label>
                <input
                  type="text"
                  value={trackForm.name}
                  onChange={(e) => setTrackForm({ ...trackForm, name: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="track-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  value={trackForm.description}
                  onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  rows={2}
                  data-testid="track-description-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">צבע</label>
                <div className="flex gap-2" data-testid="track-color-picker">
                  {['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b'].map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${trackForm.color === color ? 'border-gray-800' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setTrackForm({ ...trackForm, color })}
                      data-color={color}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowTrackModal(false)} className="btn-secondary">ביטול</button>
              <button onClick={saveTrack} className="btn-primary" data-testid="save-track-button">
                <Save size={18} className="inline mr-2" />
                שמור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal w-full max-w-md" data-testid="room-modal">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingRoom ? 'עריכת חדר' : 'חדר חדש'}</h3>
              <button onClick={() => setShowRoomModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם החדר *</label>
                <input
                  type="text"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="room-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תכולה (מקומות)</label>
                <input
                  type="number"
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="room-capacity-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">קומה</label>
                <input
                  type="text"
                  value={roomForm.floor}
                  onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="room-floor-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ציוד</label>
                <div className="flex flex-wrap gap-2">
                  {['projector', 'microphone', 'whiteboard', 'livestream'].map(eq => (
                    <label key={eq} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={roomForm.equipment.includes(eq)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRoomForm({ ...roomForm, equipment: [...roomForm.equipment, eq] })
                          } else {
                            setRoomForm({ ...roomForm, equipment: roomForm.equipment.filter(e => e !== eq) })
                          }
                        }}
                        data-testid={`equipment-${eq}`}
                      />
                      {eq === 'projector' && 'מקרן'}
                      {eq === 'microphone' && 'מיקרופון'}
                      {eq === 'whiteboard' && 'לוח'}
                      {eq === 'livestream' && 'שידור חי'}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">חדר גיבוי</label>
                <select
                  value={roomForm.backup_room_id}
                  onChange={(e) => setRoomForm({ ...roomForm, backup_room_id: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="backup-room-select"
                >
                  <option value="">ללא</option>
                  {rooms.filter(r => r.id !== editingRoom?.id).map(room => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowRoomModal(false)} className="btn-secondary">ביטול</button>
              <button onClick={saveRoom} className="btn-primary" data-testid="save-room-button">
                <Save size={18} className="inline mr-2" />
                שמור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Speaker Modal */}
      {showSpeakerModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal w-full max-w-md" data-testid="speaker-modal">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingSpeaker ? 'עריכת דובר' : 'דובר חדש'}</h3>
              <button onClick={() => setShowSpeakerModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם *</label>
                <input
                  type="text"
                  value={speakerForm.name}
                  onChange={(e) => setSpeakerForm({ ...speakerForm, name: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="speaker-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תפקיד</label>
                <input
                  type="text"
                  value={speakerForm.title}
                  onChange={(e) => setSpeakerForm({ ...speakerForm, title: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="speaker-title-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ביוגרפיה</label>
                <textarea
                  value={speakerForm.bio}
                  onChange={(e) => setSpeakerForm({ ...speakerForm, bio: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  rows={3}
                  data-testid="speaker-bio-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">אימייל</label>
                <input
                  type="email"
                  value={speakerForm.email}
                  onChange={(e) => setSpeakerForm({ ...speakerForm, email: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="speaker-email-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">טלפון</label>
                <input
                  type="tel"
                  value={speakerForm.phone}
                  onChange={(e) => setSpeakerForm({ ...speakerForm, phone: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="speaker-phone-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">דובר גיבוי</label>
                <select
                  value={speakerForm.backup_speaker_id}
                  onChange={(e) => setSpeakerForm({ ...speakerForm, backup_speaker_id: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="backup-speaker-select"
                >
                  <option value="">ללא</option>
                  {speakers.filter(s => s.id !== editingSpeaker?.id).map(speaker => (
                    <option key={speaker.id} value={speaker.id}>{speaker.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowSpeakerModal(false)} className="btn-secondary">ביטול</button>
              <button onClick={saveSpeaker} className="btn-primary" data-testid="save-speaker-button">
                <Save size={18} className="inline mr-2" />
                שמור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal w-full max-w-lg" data-testid="session-modal">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingSession ? 'עריכת מפגש' : 'מפגש חדש'}</h3>
              <button onClick={() => setShowSessionModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">כותרת *</label>
                <input
                  type="text"
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="session-title-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  value={sessionForm.description}
                  onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  rows={3}
                  data-testid="session-description-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">שעת התחלה *</label>
                  <input
                    type="datetime-local"
                    value={sessionForm.start_time}
                    onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    data-testid="session-start-time"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">שעת סיום *</label>
                  <input
                    type="datetime-local"
                    value={sessionForm.end_time}
                    onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    data-testid="session-end-time"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">יום</label>
                <select
                  value={sessionForm.program_day_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, program_day_id: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="session-program-day-select"
                >
                  <option value="">בחר יום</option>
                  {programDays.map((day, i) => (
                    <option key={day.id} value={day.id}>יום {i + 1} - {day.theme || new Date(day.date).toLocaleDateString('he-IL')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">מסלול</label>
                <select
                  value={sessionForm.track_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, track_id: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="session-track-select"
                >
                  <option value="">בחר מסלול</option>
                  {tracks.map(track => (
                    <option key={track.id} value={track.id}>{track.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">חדר</label>
                <select
                  value={sessionForm.room_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, room_id: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="session-room-select"
                >
                  <option value="">בחר חדר</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>{room.name} ({room.capacity} מקומות)</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowSessionModal(false)} className="btn-secondary">ביטול</button>
              <button onClick={saveSession} className="btn-primary" data-testid="save-session-button">
                <Save size={18} className="inline mr-2" />
                שמור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contingency Modal */}
      {showContingencyModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal w-full max-w-md" data-testid="contingency-modal">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingContingency ? 'עריכת תכנית חירום' : 'תכנית חירום חדשה'}</h3>
              <button onClick={() => setShowContingencyModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">סוג</label>
                <select
                  value={contingencyForm.contingency_type}
                  onChange={(e) => setContingencyForm({ ...contingencyForm, contingency_type: e.target.value as ContingencyType })}
                  className="w-full border rounded-lg p-2"
                  data-testid="contingency-type-select"
                >
                  <option value="speaker_unavailable">דובר לא זמין</option>
                  <option value="room_unavailable">חדר לא זמין</option>
                  <option value="technical_failure">תקלה טכנית</option>
                  <option value="weather">מזג אוויר</option>
                  <option value="medical">רפואי</option>
                  <option value="security">ביטחוני</option>
                  <option value="other">אחר</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">רמת סיכון</label>
                <select
                  value={contingencyForm.risk_level}
                  onChange={(e) => setContingencyForm({ ...contingencyForm, risk_level: e.target.value as RiskLevel })}
                  className="w-full border rounded-lg p-2"
                  data-testid="contingency-risk-level"
                >
                  <option value="low">נמוך</option>
                  <option value="medium">בינוני</option>
                  <option value="high">גבוה</option>
                  <option value="critical">קריטי</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תיאור הסיכון *</label>
                <textarea
                  value={contingencyForm.description}
                  onChange={(e) => setContingencyForm({ ...contingencyForm, description: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  rows={2}
                  data-testid="contingency-description-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תכנית פעולה *</label>
                <textarea
                  value={contingencyForm.action_plan}
                  onChange={(e) => setContingencyForm({ ...contingencyForm, action_plan: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  rows={3}
                  data-testid="contingency-action-plan-input"
                />
              </div>
              {contingencyForm.contingency_type === 'speaker_unavailable' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">דובר מושפע</label>
                    <select
                      className="w-full border rounded-lg p-2"
                      data-testid="affected-speaker-select"
                    >
                      <option value="">בחר דובר</option>
                      {speakers.map(speaker => (
                        <option key={speaker.id} value={speaker.id}>{speaker.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">דובר גיבוי</label>
                    <select
                      value={contingencyForm.backup_speaker_id}
                      onChange={(e) => setContingencyForm({ ...contingencyForm, backup_speaker_id: e.target.value })}
                      className="w-full border rounded-lg p-2"
                      data-testid="backup-speaker-select"
                    >
                      <option value="">בחר דובר גיבוי</option>
                      {speakers.map(speaker => (
                        <option key={speaker.id} value={speaker.id}>{speaker.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {contingencyForm.contingency_type === 'room_unavailable' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">חדר מושפע</label>
                    <select
                      className="w-full border rounded-lg p-2"
                      data-testid="affected-room-select"
                    >
                      <option value="">בחר חדר</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>{room.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">חדר גיבוי</label>
                    <select
                      value={contingencyForm.backup_room_id}
                      onChange={(e) => setContingencyForm({ ...contingencyForm, backup_room_id: e.target.value })}
                      className="w-full border rounded-lg p-2"
                      data-testid="backup-room-select"
                    >
                      <option value="">בחר חדר גיבוי</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>{room.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowContingencyModal(false)} className="btn-secondary">ביטול</button>
              <button onClick={saveContingency} className="btn-primary" data-testid="save-contingency-button">
                <Save size={18} className="inline mr-2" />
                שמור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingBlock ? 'עריכת בלוק זמן' : 'בלוק זמן חדש'}</h3>
              <button onClick={() => setShowBlockModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">סוג</label>
                <select
                  value={blockForm.block_type}
                  onChange={(e) => setBlockForm({ ...blockForm, block_type: e.target.value as BlockType })}
                  className="w-full border rounded-lg p-2"
                  data-testid="block-type-select"
                >
                  <option value="break">הפסקה</option>
                  <option value="registration">רישום</option>
                  <option value="networking">נטוורקינג</option>
                  <option value="meal">ארוחה</option>
                  <option value="other">אחר</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">כותרת *</label>
                <input
                  type="text"
                  value={blockForm.title}
                  onChange={(e) => setBlockForm({ ...blockForm, title: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="block-title-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">שעת התחלה *</label>
                  <input
                    type="datetime-local"
                    value={blockForm.start_time}
                    onChange={(e) => setBlockForm({ ...blockForm, start_time: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    data-testid="block-start-time"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">שעת סיום *</label>
                  <input
                    type="datetime-local"
                    value={blockForm.end_time}
                    onChange={(e) => setBlockForm({ ...blockForm, end_time: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    data-testid="block-end-time"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">יום</label>
                <select
                  value={blockForm.program_day_id}
                  onChange={(e) => setBlockForm({ ...blockForm, program_day_id: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">כל הימים (גלובלי)</option>
                  {programDays.map((day, i) => (
                    <option key={day.id} value={day.id}>יום {i + 1}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  value={blockForm.description}
                  onChange={(e) => setBlockForm({ ...blockForm, description: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  rows={2}
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowBlockModal(false)} className="btn-secondary">ביטול</button>
              <button onClick={saveTimeBlock} className="btn-primary" data-testid="save-time-block-button">
                <Save size={18} className="inline mr-2" />
                שמור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal w-full max-w-sm">
            <div className="p-6 text-center">
              <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
              <h3 className="text-xl font-bold mb-2">אישור מחיקה</h3>
              <p className="text-zinc-400 mb-4">האם למחוק את "{deleteTarget.name}"?</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">ביטול</button>
                <button onClick={confirmDelete} className="btn-primary bg-red-500 hover:bg-red-600" data-testid="confirm-delete-button">
                  מחק
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contingency Panel Drawer */}
      {showContingencyPanel && selectedScheduleForContingency && (
        <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setShowContingencyPanel(false)}
          />

          {/* Drawer */}
          <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <h2 className="font-semibold text-gray-900">תוכנית מגירה</h2>
              </div>
              <button
                onClick={() => setShowContingencyPanel(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              <ContingencyPanel
                eventId={eventId!}
                schedule={{
                  id: selectedScheduleForContingency.id,
                  title: selectedScheduleForContingency.title,
                  speaker_id: selectedScheduleForContingency.session_speakers?.[0]?.speaker_id || null,
                  speaker_name: selectedScheduleForContingency.session_speakers?.[0]?.speaker?.name || null,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  backup_speaker_id: (selectedScheduleForContingency as any).backup_speaker_id || null,
                }}
                onSuccess={handleContingencySuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
