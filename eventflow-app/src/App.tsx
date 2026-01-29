import { useState, useEffect, useRef, Fragment } from 'react'
import { Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom'
import { Calendar, Users, Truck, CheckSquare, MessageCircle, Bot, Plus, Edit2, Trash2, MapPin, Clock, X, Loader2, Send, Upload, Download, Search, UserPlus, Star, Phone, Mail, Globe, ClipboardList, Play, Coffee, User, FileQuestion, BarChart3, ThumbsUp, ThumbsDown, MessageSquare, ScanLine, CheckCircle, XCircle, UserCheck, PieChart, DollarSign, FileText, Bell, Link2, AlertTriangle, RefreshCw, ArrowLeft, Grid3X3, List, CalendarDays, Mic, Monitor, Video, Building2, Save, Eye, Target, Shield, Zap } from 'lucide-react'
import { FloatingChat } from './components/chat'
import { supabase } from './lib/supabase'
import { TestWhatsAppPage } from './pages/admin'
import { EventsPage } from '@/modules/events'
import { EventSettingsPanel } from './modules/events/components/EventSettingsPanel'
import * as XLSX from 'xlsx'

// ═══════════════════════════════════════════════════════════════════════════
// Events Page - Now imported from modules/events
// ═════════════════════════════════════════════════════════════════════════


// New event-aware components
import { Sidebar } from './components/layout/Sidebar'
import { HomePage } from './pages/home/HomePage'
import { EventDashboardPage } from './pages/event/EventDashboardPage'
import { useEvent } from './contexts/EventContext'

// Auth pages
import { LoginPage } from './pages/auth/Login'
import { SignupPage } from './pages/auth/Signup'
import { ForgotPasswordPage } from './pages/auth/ForgotPassword'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type EventStatus = 'draft' | 'planning' | 'active' | 'completed' | 'cancelled'

interface EventType {
  id: string
  name: string
  name_en: string | null
  icon: string | null
  description: string | null
  is_system: boolean
}

interface Event {
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
  event_types?: EventType
  created_at: string
  // Stats (computed)
  participants_count?: number
  checklist_progress?: number
  vendors_count?: number
}

// Participant Types
type ParticipantStatus = 'invited' | 'confirmed' | 'declined' | 'maybe' | 'checked_in' | 'no_show'

interface Participant {
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
  invited_at: string | null
  confirmed_at: string | null
  checked_in_at: string | null
  created_at: string
  events?: { name: string }
  custom_fields?: Record<string, unknown>
}

interface ParticipantFormData {
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
}

// Vendor Types
type VendorStatus = 'pending' | 'quote_requested' | 'quoted' | 'approved' | 'rejected' | 'confirmed'

interface VendorCategory {
  id: string
  name: string
  name_en: string | null
  icon: string | null
  description: string | null
  is_active: boolean
  sort_order: number
}

interface Vendor {
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

interface VendorFormData {
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

// Program Builder Types
type SpeakerRole = 'main' | 'backup' | 'moderator' | 'panelist' | 'facilitator'
type ContingencyType = 'speaker_unavailable' | 'room_unavailable' | 'technical_failure' | 'weather' | 'medical' | 'security' | 'other'
type ContingencyStatus = 'draft' | 'ready' | 'activated' | 'resolved'
type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
type BlockType = 'session' | 'break' | 'registration' | 'networking' | 'meal' | 'other'

interface ProgramDay {
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

interface Track {
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

interface Room {
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

interface Speaker {
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

interface SessionSpeaker {
  id: string
  schedule_id: string
  speaker_id: string
  role: SpeakerRole
  is_confirmed: boolean
  speaker?: Speaker
  created_at: string
}

interface Contingency {
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

interface ScheduleChange {
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

interface TimeBlock {
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

interface ExtendedSchedule {
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
  // New fields for program builder
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

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusColor = (status: EventStatus) => {
  const colors = {
    draft: 'bg-white/5 text-zinc-400',
    planning: 'bg-blue-500/20 text-blue-400',
    active: 'bg-emerald-500/20 text-emerald-400',
    completed: 'bg-purple-500/20 text-purple-400',
    cancelled: 'bg-red-500/20 text-red-400'
  }
  return colors[status] || colors.draft
}

const getStatusLabel = (status: EventStatus) => {
  const labels = {
    draft: 'טיוטה',
    planning: 'בתכנון',
    active: 'פעיל',
    completed: 'הושלם',
    cancelled: 'בוטל'
  }
  return labels[status] || status
}

const getParticipantStatusColor = (status: ParticipantStatus) => {
  const colors = {
    invited: 'bg-amber-500/20 text-amber-400',
    confirmed: 'bg-emerald-500/20 text-emerald-400',
    declined: 'bg-red-500/20 text-red-400',
    maybe: 'bg-orange-500/20 text-orange-400',
    checked_in: 'bg-blue-500/20 text-blue-400',
    no_show: 'bg-white/5 text-zinc-400'
  }
  return colors[status] || colors.invited
}

const getParticipantStatusLabel = (status: ParticipantStatus) => {
  const labels = {
    invited: 'הוזמן',
    confirmed: 'אישר הגעה',
    declined: 'לא מגיע',
    maybe: 'אולי',
    checked_in: 'נכנס',
    no_show: 'לא הגיע'
  }
  return labels[status] || status
}

const normalizePhone = (phone: string): string => {
  let normalized = phone.replace(/\D/g, '')
  if (normalized.startsWith('0')) {
    normalized = '972' + normalized.slice(1)
  }
  return normalized
}

const getVendorStatusColor = (status: VendorStatus) => {
  const colors = {
    pending: 'bg-white/5 text-zinc-400',
    quote_requested: 'bg-amber-500/20 text-amber-400',
    quoted: 'bg-blue-500/20 text-blue-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
    confirmed: 'bg-purple-500/20 text-purple-400'
  }
  return colors[status] || colors.pending
}

const getVendorStatusLabel = (status: VendorStatus) => {
  const labels = {
    pending: 'ממתין',
    quote_requested: 'נשלחה בקשה',
    quoted: 'התקבלה הצעה',
    approved: 'אושר',
    rejected: 'נדחה',
    confirmed: 'מאושר סופי'
  }
  return labels[status] || status
}

const renderStars = (rating: number | null) => {
  if (!rating) return null
  return '⭐'.repeat(Math.round(rating))
}

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard Page
// ═══════════════════════════════════════════════════════════════════════════

function DashboardPage() {
  const [stats, setStats] = useState({ events: 0, participants: 0, tasks: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [eventsRes, participantsRes, tasksRes] = await Promise.all([
          supabase.from('events').select('id', { count: 'exact', head: true }),
          supabase.from('participants').select('id', { count: 'exact', head: true }),
          supabase.from('checklist_items').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        ])

        setStats({
          events: eventsRes.count || 0,
          participants: participantsRes.count || 0,
          tasks: tasksRes.count || 0
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="p-8 relative z-10">
      <h1 className="text-3xl font-semibold mb-8 text-gradient glow-text tracking-tight" data-testid="dashboard-title">לוח בקרה</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-list">
        <Link to="/events" className="premium-stats-card orange group" data-testid="events-card">
          <h2 className="text-base font-medium mb-4 text-zinc-400 tracking-wide">אירועים פעילים</h2>
          <p className="text-5xl font-bold text-gradient transition-transform duration-300 group-hover:scale-105">
            {loading ? <Loader2 className="animate-spin text-orange-500" /> : stats.events}
          </p>
          <p className="text-xs text-zinc-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">לחץ לצפייה באירועים</p>
        </Link>
        <Link to="/guests" className="premium-stats-card yellow group" data-testid="guests-card">
          <h2 className="text-base font-medium mb-4 text-zinc-400 tracking-wide">אורחים רשומים</h2>
          <p className="text-5xl font-bold text-gradient transition-transform duration-300 group-hover:scale-105">
            {loading ? <Loader2 className="animate-spin text-yellow-500" /> : stats.participants}
          </p>
          <p className="text-xs text-zinc-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">לחץ לניהול אורחים</p>
        </Link>
        <Link to="/checklist" className="premium-stats-card white group" data-testid="tasks-card">
          <h2 className="text-base font-medium mb-4 text-zinc-400 tracking-wide">משימות פתוחות</h2>
          <p className="text-5xl font-bold text-white transition-transform duration-300 group-hover:scale-105">
            {loading ? <Loader2 className="animate-spin text-white" /> : stats.tasks}
          </p>
          <p className="text-xs text-zinc-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">לחץ לצפייה במשימות</p>
        </Link>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Guests Page - Full Implementation
// ═══════════════════════════════════════════════════════════════════════════════

function GuestsPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<ParticipantStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<ParticipantFormData>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    status: 'invited',
    has_companion: false,
    companion_name: '',
    companion_phone: '',
    dietary_restrictions: '',
    accessibility_needs: '',
    needs_transportation: false,
    transportation_location: '',
    notes: '',
    is_vip: false,
    vip_notes: ''
  })

  useEffect(() => {
    fetchEvents()
    fetchParticipants()
  }, [])

  useEffect(() => {
    fetchParticipants()
  }, [selectedEventId])

  async function fetchEvents() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('start_date', { ascending: false })
      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  async function fetchParticipants() {
    setLoading(true)
    try {
      let query = supabase
        .from('participants')
        .select(`*, events (name)`)
        .order('created_at', { ascending: false })

      if (selectedEventId !== 'all') {
        query = query.eq('event_id', selectedEventId)
      }

      const { data, error } = await query
      if (error) throw error
      setParticipants(data || [])
    } catch (error) {
      console.error('Error fetching participants:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    if (events.length === 0) {
      alert('יש ליצור אירוע לפני הוספת אורחים')
      return
    }
    setEditingParticipant(null)
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      status: 'invited',
      has_companion: false,
      companion_name: '',
      companion_phone: '',
      dietary_restrictions: '',
      accessibility_needs: '',
      needs_transportation: false,
      transportation_location: '',
      notes: '',
      is_vip: false,
      vip_notes: ''
    })
    setShowModal(true)
  }

  function openEditModal(participant: Participant) {
    setEditingParticipant(participant)
    setFormData({
      first_name: participant.first_name,
      last_name: participant.last_name,
      phone: participant.phone,
      email: participant.email || '',
      status: participant.status,
      has_companion: participant.has_companion,
      companion_name: participant.companion_name || '',
      companion_phone: participant.companion_phone || '',
      dietary_restrictions: participant.dietary_restrictions?.join(', ') || '',
      accessibility_needs: participant.accessibility_needs || '',
      needs_transportation: participant.needs_transportation,
      transportation_location: participant.transportation_location || '',
      notes: participant.notes || '',
      is_vip: participant.is_vip,
      vip_notes: participant.vip_notes || ''
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!formData.first_name || !formData.last_name || !formData.phone) {
      alert('נא למלא שם פרטי, שם משפחה וטלפון')
      return
    }

    const eventId = editingParticipant?.event_id || (selectedEventId !== 'all' ? selectedEventId : events[0]?.id)
    if (!eventId) {
      alert('יש לבחור אירוע')
      return
    }

    setSaving(true)
    try {
      const participantData = {
        event_id: eventId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: `${formData.first_name} ${formData.last_name}`,
        phone: formData.phone,
        phone_normalized: normalizePhone(formData.phone),
        email: formData.email || null,
        status: formData.status,
        has_companion: formData.has_companion,
        companion_name: formData.has_companion ? formData.companion_name || null : null,
        companion_phone: formData.has_companion ? formData.companion_phone || null : null,
        companion_phone_normalized: formData.has_companion && formData.companion_phone ? normalizePhone(formData.companion_phone) : null,
        dietary_restrictions: formData.dietary_restrictions ? formData.dietary_restrictions.split(',').map(s => s.trim()).filter(Boolean) : null,
        accessibility_needs: formData.accessibility_needs || null,
        needs_transportation: formData.needs_transportation,
        transportation_location: formData.needs_transportation ? formData.transportation_location || null : null,
        notes: formData.notes || null,
        is_vip: formData.is_vip,
        vip_notes: formData.is_vip ? formData.vip_notes || null : null,
        invited_at: formData.status === 'invited' ? new Date().toISOString() : null,
        confirmed_at: formData.status === 'confirmed' ? new Date().toISOString() : null
      }

      if (editingParticipant) {
        const { error } = await supabase
          .from('participants')
          .update(participantData)
          .eq('id', editingParticipant.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('participants')
          .insert(participantData)
        if (error) throw error
      }

      setShowModal(false)
      fetchParticipants()
    } catch (error) {
      console.error('Error saving participant:', error)
      alert('שגיאה בשמירת האורח')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(participant: Participant) {
    if (!confirm(`האם למחוק את ${participant.first_name} ${participant.last_name}?`)) return
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participant.id)
      if (error) throw error
      fetchParticipants()
    } catch (error) {
      console.error('Error deleting participant:', error)
      alert('שגיאה במחיקת האורח')
    }
  }

  // Excel Import
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const eventId = selectedEventId !== 'all' ? selectedEventId : events[0]?.id
    if (!eventId) {
      alert('יש לבחור אירוע לפני ייבוא')
      return
    }

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)

      const participants = rows.map(row => ({
        event_id: eventId,
        first_name: row['שם פרטי'] || row['first_name'] || '',
        last_name: row['שם משפחה'] || row['last_name'] || '',
        full_name: `${row['שם פרטי'] || row['first_name'] || ''} ${row['שם משפחה'] || row['last_name'] || ''}`.trim(),
        phone: row['טלפון'] || row['phone'] || '',
        phone_normalized: normalizePhone(row['טלפון'] || row['phone'] || ''),
        email: row['אימייל'] || row['email'] || null,
        status: 'invited' as ParticipantStatus,
        has_companion: (row['מלווה'] || row['companion'] || '').toLowerCase() === 'כן' || (row['מלווה'] || row['companion'] || '').toLowerCase() === 'yes',
        companion_name: row['שם מלווה'] || row['companion_name'] || null,
        notes: row['הערות'] || row['notes'] || null,
        import_source: 'excel',
        import_batch_id: crypto.randomUUID()
      })).filter(p => p.first_name && p.phone)

      if (participants.length === 0) {
        alert('לא נמצאו אורחים תקינים בקובץ. וודא שיש עמודות: שם פרטי, שם משפחה, טלפון')
        return
      }

      const { error } = await supabase.from('participants').insert(participants)
      if (error) throw error

      alert(`יובאו ${participants.length} אורחים בהצלחה!`)
      fetchParticipants()
    } catch (error) {
      console.error('Error importing:', error)
      alert('שגיאה בייבוא הקובץ')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Excel Export
  function handleExport() {
    const exportData = filteredParticipants.map(p => ({
      'שם פרטי': p.first_name,
      'שם משפחה': p.last_name,
      'טלפון': p.phone,
      'אימייל': p.email || '',
      'סטטוס': getParticipantStatusLabel(p.status),
      'מלווה': p.has_companion ? 'כן' : 'לא',
      'שם מלווה': p.companion_name || '',
      'VIP': p.is_vip ? 'כן' : 'לא',
      'הערות': p.notes || '',
      'אירוע': p.events?.name || ''
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'אורחים')
    XLSX.writeFile(wb, `אורחים_${new Date().toLocaleDateString('he-IL')}.xlsx`)
  }

  // Filter participants
  const filteredParticipants = participants.filter(p => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    const matchesSearch = searchTerm === '' ||
      p.first_name.includes(searchTerm) ||
      p.last_name.includes(searchTerm) ||
      p.phone.includes(searchTerm) ||
      (p.email && p.email.includes(searchTerm))
    return matchesStatus && matchesSearch
  })

  // Stats
  const stats = {
    total: participants.length,
    confirmed: participants.filter(p => p.status === 'confirmed').length,
    invited: participants.filter(p => p.status === 'invited').length,
    declined: participants.filter(p => p.status === 'declined').length,
    withCompanion: participants.filter(p => p.has_companion).length
  }

  return (
    <div className="p-8 relative z-10">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="guests-title">אורחים</h1>
            <p className="text-zinc-400 mt-1">{stats.total} אורחים רשומים</p>
          </div>
          <div className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleImport}
            />
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1a1d27] border border-white/5 border border-white/10/50 rounded-xl text-zinc-300 hover:bg-[#1a1d27] hover:shadow-lg transition-all duration-300"
              onClick={() => fileInputRef.current?.click()}
              data-testid="import-excel-btn"
            >
              <Upload size={18} />
              ייבוא Excel
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1a1d27] border border-white/5 border border-white/10/50 rounded-xl text-zinc-300 hover:bg-[#1a1d27] hover:shadow-lg transition-all duration-300"
              onClick={handleExport}
              data-testid="export-excel-btn"
              disabled={participants.length === 0}
            >
              <Download size={18} />
              ייצוא Excel
            </button>
            <button
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300"
              data-testid="add-guest-btn"
              onClick={openCreateModal}
            >
              <UserPlus size={20} />
              הוסף אורח
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden text-center">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-3xl font-bold text-white group-hover:text-blue-600 transition-colors">{stats.total}</p>
            <p className="text-sm text-zinc-400 font-medium mt-1">סה"כ</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden text-center">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-400 to-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-3xl font-bold text-emerald-600">{stats.confirmed}</p>
            <p className="text-sm text-zinc-400 font-medium mt-1">אישרו</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden text-center">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-3xl font-bold text-amber-600">{stats.invited}</p>
            <p className="text-sm text-zinc-400 font-medium mt-1">הוזמנו</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden text-center">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-400 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-3xl font-bold text-red-400">{stats.declined}</p>
            <p className="text-sm text-zinc-400 font-medium mt-1">סירבו</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden text-center">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-3xl font-bold text-purple-600">{stats.withCompanion}</p>
            <p className="text-sm text-zinc-400 font-medium mt-1">עם מלווה</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1d27]/60 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-6">
          <div className="flex gap-4 flex-wrap items-center">
            {/* Event Filter */}
            <select
              className="px-4 py-2.5 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
            >
              <option value="all">כל האירועים</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <div className="flex gap-2 bg-[#1a1d27]/80 rounded-xl p-1 border border-white/10/50">
              {(['all', 'invited', 'confirmed', 'declined', 'maybe', 'checked_in'] as const).map(status => (
                <button
                  key={status}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:bg-white/5'
                  }`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'הכל' : getParticipantStatusLabel(status)}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                className="w-full px-4 py-2.5 pr-10 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Participants List */}
        <div className="space-y-3" data-testid="guests-list">
          {loading ? (
            <div className="text-center py-16">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full animate-pulse" />
                <Loader2 className="relative animate-spin text-blue-500 mb-4" size={40} />
              </div>
              <p className="text-zinc-400 font-medium">טוען אורחים...</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="bg-[#1a1d27] border border-white/5 rounded-2xl border border-white/10 text-center py-16">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full" />
                <Users className="relative mx-auto mb-4 text-gray-300" size={56} />
              </div>
              <p className="text-zinc-300 text-lg font-semibold">אין אורחים עדיין</p>
              <p className="text-zinc-500 text-sm mt-2">לחץ על "הוסף אורח" או ייבא מ-Excel</p>
            </div>
          ) : (
            filteredParticipants.map(participant => (
              <div
                key={participant.id}
                className="group bg-[#1a1d27] border border-white/5 rounded-2xl border border-white/10 p-5 hover:bg-[#1a1d27] hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all duration-300"
                data-testid={`guest-card-${participant.id}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                      {participant.first_name[0]}{participant.last_name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-white group-hover:text-blue-600 transition-colors">
                          {participant.first_name} {participant.last_name}
                        </h3>
                        {participant.is_vip && (
                          <Star className="text-yellow-500 fill-yellow-500" size={16} />
                        )}
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getParticipantStatusColor(participant.status)}`}>
                          {getParticipantStatusLabel(participant.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-400 mt-1.5">
                        <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md">
                          <Phone size={14} className="text-zinc-500" />
                          {participant.phone}
                        </span>
                        {participant.email && (
                          <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md">
                            <Mail size={14} className="text-zinc-500" />
                            {participant.email}
                          </span>
                        )}
                        {participant.has_companion && (
                          <span className="text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-md font-medium">
                            + מלווה: {participant.companion_name || 'ללא שם'}
                          </span>
                        )}
                      </div>
                      {participant.events && selectedEventId === 'all' && (
                        <p className="text-xs text-zinc-500 mt-1.5 bg-white/5 inline-block px-2 py-0.5 rounded-md">{participant.events.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105"
                      onClick={() => openEditModal(participant)}
                      title="עריכה"
                    >
                      <Edit2 size={18} className="text-zinc-400" />
                    </button>
                    <button
                      className="p-2.5 hover:bg-red-500/10 rounded-xl transition-all duration-200 hover:scale-105"
                      onClick={() => handleDelete(participant)}
                      title="מחיקה"
                    >
                      <Trash2 size={18} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-[#1a1d27]">
              <h2 className="text-2xl font-bold">
                {editingParticipant ? 'עריכת אורח' : 'אורח חדש'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">שם פרטי *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">שם משפחה *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">טלפון *</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="0501234567"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">אימייל</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2">סטטוס</label>
                <select
                  className="input"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as ParticipantStatus })}
                >
                  <option value="invited">הוזמן</option>
                  <option value="confirmed">אישר הגעה</option>
                  <option value="declined">לא מגיע</option>
                  <option value="maybe">אולי</option>
                  <option value="checked_in">נכנס</option>
                  <option value="no_show">לא הגיע</option>
                </select>
              </div>

              {/* VIP */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_vip}
                    onChange={e => setFormData({ ...formData, is_vip: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20"
                  />
                  <span className="flex items-center gap-1">
                    <Star size={16} className="text-yellow-500" />
                    אורח VIP
                  </span>
                </label>
              </div>

              {formData.is_vip && (
                <div>
                  <label className="block text-sm font-medium mb-2">הערות VIP</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="לדוגמה: להושיב ליד הבמה"
                    value={formData.vip_notes}
                    onChange={e => setFormData({ ...formData, vip_notes: e.target.value })}
                  />
                </div>
              )}

              {/* Companion */}
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={formData.has_companion}
                    onChange={e => setFormData({ ...formData, has_companion: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20"
                  />
                  <span>מגיע עם מלווה</span>
                </label>

                {formData.has_companion && (
                  <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-2">שם המלווה</label>
                      <input
                        type="text"
                        className="input"
                        value={formData.companion_name}
                        onChange={e => setFormData({ ...formData, companion_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">טלפון מלווה</label>
                      <input
                        type="tel"
                        className="input"
                        value={formData.companion_phone}
                        onChange={e => setFormData({ ...formData, companion_phone: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="border-t pt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">הגבלות תזונה (מופרד בפסיקים)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="צמחוני, ללא גלוטן..."
                    value={formData.dietary_restrictions}
                    onChange={e => setFormData({ ...formData, dietary_restrictions: e.target.value })}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">צרכי נגישות</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="כיסא גלגלים, מקום קרוב לשירותים..."
                    value={formData.accessibility_needs}
                    onChange={e => setFormData({ ...formData, accessibility_needs: e.target.value })}
                  />
                </div>

                <div className="mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.needs_transportation}
                      onChange={e => setFormData({ ...formData, needs_transportation: e.target.checked })}
                      className="w-5 h-5 rounded border-white/20"
                    />
                    <span>צריך הסעה</span>
                  </label>
                </div>

                {formData.needs_transportation && (
                  <div className="mt-2">
                    <input
                      type="text"
                      className="input"
                      placeholder="מיקום לאיסוף"
                      value={formData.transportation_location}
                      onChange={e => setFormData({ ...formData, transportation_location: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">הערות</label>
                <textarea
                  className="input min-h-[80px]"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-[#1a1d27] rounded-b-2xl">
              <button
                className="px-6 py-2.5 border border-white/10 rounded-xl hover:bg-white/5 transition-colors font-medium"
                onClick={() => setShowModal(false)}
              >
                ביטול
              </button>
              <button
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="animate-spin" size={20} />}
                {editingParticipant ? 'שמור שינויים' : 'הוסף אורח'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Vendors Page - Full Implementation
// ═══════════════════════════════════════════════════════════════════════════

function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    category_id: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    description: '',
    notes: '',
    rating: '',
    status: 'pending',
    tags: ''
  })

  useEffect(() => {
    fetchCategories()
    fetchVendors()
  }, [])

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('vendor_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  async function fetchVendors() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select(`*, vendor_categories (id, name, name_en, icon)`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Count events for each vendor
      const vendorsWithCount = await Promise.all((data || []).map(async (vendor) => {
        const { count } = await supabase
          .from('event_vendors')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
        return { ...vendor, events_count: count || 0 }
      }))

      setVendors(vendorsWithCount)
    } catch (error) {
      console.error('Error fetching vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingVendor(null)
    setFormData({
      name: '',
      category_id: categories[0]?.id || '',
      contact_name: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      description: '',
      notes: '',
      rating: '',
      status: 'pending',
      tags: ''
    })
    setShowModal(true)
  }

  function openEditModal(vendor: Vendor) {
    setEditingVendor(vendor)
    setFormData({
      name: vendor.name,
      category_id: vendor.category_id || '',
      contact_name: vendor.contact_name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
      address: vendor.address || '',
      city: vendor.city || '',
      description: vendor.description || '',
      notes: vendor.notes || '',
      rating: vendor.rating?.toString() || '',
      status: vendor.status,
      tags: vendor.tags?.join(', ') || ''
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!formData.name) {
      alert('נא למלא שם ספק')
      return
    }

    setSaving(true)
    try {
      const vendorData = {
        name: formData.name,
        category_id: formData.category_id || null,
        contact_name: formData.contact_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        phone_normalized: formData.phone ? normalizePhone(formData.phone) : null,
        website: formData.website || null,
        address: formData.address || null,
        city: formData.city || null,
        description: formData.description || null,
        notes: formData.notes || null,
        rating: formData.rating ? parseFloat(formData.rating) : null,
        status: formData.status,
        tags: formData.tags ? formData.tags.split(',').map(s => s.trim()).filter(Boolean) : null
      }

      if (editingVendor) {
        const { error } = await supabase
          .from('vendors')
          .update(vendorData)
          .eq('id', editingVendor.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vendors')
          .insert(vendorData)
        if (error) throw error
      }

      setShowModal(false)
      fetchVendors()
    } catch (error) {
      console.error('Error saving vendor:', error)
      alert('שגיאה בשמירת הספק')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(vendor: Vendor) {
    if (!confirm(`האם למחוק את "${vendor.name}"?`)) return
    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendor.id)
      if (error) throw error
      fetchVendors()
    } catch (error) {
      console.error('Error deleting vendor:', error)
      alert('שגיאה במחיקת הספק')
    }
  }

  // Filter vendors
  const filteredVendors = vendors.filter(v => {
    const matchesCategory = categoryFilter === 'all' || v.category_id === categoryFilter
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
    const matchesSearch = searchTerm === '' ||
      v.name.includes(searchTerm) ||
      (v.contact_name && v.contact_name.includes(searchTerm)) ||
      (v.phone && v.phone.includes(searchTerm)) ||
      (v.city && v.city.includes(searchTerm))
    return matchesCategory && matchesStatus && matchesSearch
  })

  // Stats by category
  const categoryStats = categories.map(cat => ({
    ...cat,
    count: vendors.filter(v => v.category_id === cat.id).length
  }))

  return (
    <div className="p-8 relative z-10">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="vendors-title">ספקים</h1>
            <p className="text-zinc-400 mt-1">{vendors.length} ספקים במערכת</p>
          </div>
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-300"
            data-testid="add-vendor-btn"
            onClick={openCreateModal}
          >
            <Plus size={20} />
            הוסף ספק
          </button>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          <button
            className={`group relative p-4 rounded-2xl text-center transition-all duration-300 overflow-hidden ${
              categoryFilter === 'all'
                ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-[#1a1d27] border border-white/5 border border-white/10 hover:bg-[#1a1d27] hover:shadow-lg hover:-translate-y-0.5'
            }`}
            onClick={() => setCategoryFilter('all')}
          >
            <p className="text-2xl mb-1">📋</p>
            <p className="text-xs font-medium">הכל ({vendors.length})</p>
          </button>
          {categoryStats.slice(0, 7).map(cat => (
            <button
              key={cat.id}
              className={`group relative p-4 rounded-2xl text-center transition-all duration-300 overflow-hidden ${
                categoryFilter === cat.id
                  ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-[#1a1d27] border border-white/5 border border-white/10 hover:bg-[#1a1d27] hover:shadow-lg hover:-translate-y-0.5'
              }`}
              onClick={() => setCategoryFilter(cat.id)}
              data-testid="category-filter"
            >
              <p className="text-2xl mb-1">{cat.icon}</p>
              <p className="text-xs font-medium truncate">{cat.name} ({cat.count})</p>
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="bg-[#1a1d27]/60 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-6">
          <div className="flex gap-4 flex-wrap items-center">
            {/* Status Filter */}
            <div className="flex gap-2 bg-[#1a1d27]/80 rounded-xl p-1 border border-white/10/50">
              {(['all', 'pending', 'approved', 'confirmed'] as const).map(status => (
                <button
                  key={status}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : 'text-zinc-400 hover:bg-white/5'
                  }`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'הכל' : getVendorStatusLabel(status)}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                className="w-full px-4 py-2.5 pr-10 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                placeholder="חיפוש ספק..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Vendors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="vendors-list">
          {loading ? (
            <div className="col-span-full text-center py-16">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-orange-400/20 blur-2xl rounded-full animate-pulse" />
                <Loader2 className="relative animate-spin text-orange-500 mb-4" size={40} />
              </div>
              <p className="text-zinc-400 font-medium">טוען ספקים...</p>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="col-span-full bg-[#1a1d27] border border-white/5 rounded-2xl border border-white/10 text-center py-16">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-orange-400/20 blur-2xl rounded-full" />
                <Truck className="relative mx-auto mb-4 text-gray-300" size={56} />
              </div>
              <p className="text-zinc-300 text-lg font-semibold">אין ספקים עדיין</p>
              <p className="text-zinc-500 text-sm mt-2">לחץ על "הוסף ספק" להוספת הספק הראשון</p>
            </div>
          ) : (
            filteredVendors.map(vendor => (
              <div
                key={vendor.id}
                className="group bg-[#1a1d27] border border-white/5 rounded-2xl border border-white/10 p-5 hover:bg-[#1a1d27] hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                data-testid={`vendor-card-${vendor.id}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-amber-500/15 rounded-xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
                      {vendor.vendor_categories?.icon || '📦'}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-orange-400 transition-colors">{vendor.name}</h3>
                      <p className="text-sm text-zinc-400">
                        {vendor.vendor_categories?.name || 'ללא קטגוריה'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getVendorStatusColor(vendor.status)}`}>
                    {getVendorStatusLabel(vendor.status)}
                  </span>
                </div>

                {vendor.rating && (
                  <div className="mb-3 bg-amber-500/10 px-3 py-1.5 rounded-lg inline-block">
                    {renderStars(vendor.rating)}
                    <span className="text-sm text-amber-400 mr-2 font-medium">({vendor.rating})</span>
                  </div>
                )}

                <div className="space-y-2 text-sm text-zinc-400">
                  {vendor.contact_name && (
                    <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-md">
                      <Users size={14} className="text-zinc-500" />
                      {vendor.contact_name}
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-md">
                      <Phone size={14} className="text-zinc-500" />
                      {vendor.phone}
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-md">
                      <Mail size={14} className="text-zinc-500" />
                      {vendor.email}
                    </div>
                  )}
                  {vendor.city && (
                    <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-md">
                      <MapPin size={14} className="text-zinc-500" />
                      {vendor.city}
                    </div>
                  )}
                  {vendor.website && (
                    <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-md">
                      <Globe size={14} className="text-zinc-500" />
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline truncate">
                        {vendor.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                {vendor.description && (
                  <p className="text-sm text-zinc-400 mt-3 line-clamp-2">{vendor.description}</p>
                )}

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                  <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded-md">
                    {vendor.events_count} אירועים
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105"
                      onClick={() => openEditModal(vendor)}
                      title="עריכה"
                    >
                      <Edit2 size={16} className="text-zinc-400" />
                    </button>
                    <button
                      className="p-2.5 hover:bg-red-500/10 rounded-xl transition-all duration-200 hover:scale-105"
                      onClick={() => handleDelete(vendor)}
                      title="מחיקה"
                    >
                      <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-[#1a1d27]">
              <h2 className="text-2xl font-bold">
                {editingVendor ? 'עריכת ספק' : 'ספק חדש'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Category & Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">קטגוריה</label>
                  <select
                    className="input"
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    <option value="">בחר קטגוריה</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">שם הספק *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">איש קשר</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.contact_name}
                    onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">טלפון</label>
                  <input
                    type="tel"
                    className="input"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">אימייל</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">אתר אינטרנט</label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://"
                    value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">עיר</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">כתובת</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              {/* Status & Rating */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">סטטוס</label>
                  <select
                    className="input"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as VendorStatus })}
                  >
                    <option value="pending">ממתין</option>
                    <option value="quote_requested">נשלחה בקשה</option>
                    <option value="quoted">התקבלה הצעה</option>
                    <option value="approved">אושר</option>
                    <option value="rejected">נדחה</option>
                    <option value="confirmed">מאושר סופי</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">דירוג (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    className="input"
                    value={formData.rating}
                    onChange={e => setFormData({ ...formData, rating: e.target.value })}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">תגיות (מופרד בפסיקים)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="חתונות, בר מצווה, כשר..."
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">תיאור</label>
                <textarea
                  className="input min-h-[80px]"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">הערות פנימיות</label>
                <textarea
                  className="input min-h-[60px]"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-[#1a1d27] rounded-b-2xl">
              <button
                className="px-6 py-2.5 border border-white/10 rounded-xl hover:bg-white/5 transition-colors font-medium"
                onClick={() => setShowModal(false)}
              >
                ביטול
              </button>
              <button
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="animate-spin" size={20} />}
                {editingVendor ? 'שמור שינויים' : 'הוסף ספק'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Checklist Page - Full CRUD with Status Management
// ═══════════════════════════════════════════════════════════════════════════

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

interface ChecklistItem {
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
  created_at: string
  events?: { name: string }
}

interface ChecklistFormData {
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

const getTaskStatusColor = (status: TaskStatus) => {
  const colors: Record<TaskStatus, string> = {
    pending: 'bg-white/5 text-zinc-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    blocked: 'bg-red-500/20 text-red-400',
    cancelled: 'bg-white/5 text-zinc-400'
  }
  return colors[status]
}

const getTaskStatusLabel = (status: TaskStatus) => {
  const labels: Record<TaskStatus, string> = {
    pending: 'ממתין',
    in_progress: 'בביצוע',
    completed: 'הושלם',
    blocked: 'חסום',
    cancelled: 'בוטל'
  }
  return labels[status]
}

const getPriorityColor = (priority: TaskPriority) => {
  const colors: Record<TaskPriority, string> = {
    low: 'text-zinc-400',
    medium: 'text-blue-500',
    high: 'text-orange-500',
    critical: 'text-red-400 font-bold'
  }
  return colors[priority]
}

const getPriorityLabel = (priority: TaskPriority) => {
  const labels: Record<TaskPriority, string> = {
    low: 'נמוכה',
    medium: 'בינונית',
    high: 'גבוהה',
    critical: 'קריטית'
  }
  return labels[priority]
}

function ChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [events, setEvents] = useState<{ id: string; name: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<ChecklistFormData>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
    estimated_cost: '',
    is_milestone: false,
    notes: ''
  })

  async function loadData() {
    setLoading(true)

    // Load events
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name, status')
      .order('start_date', { ascending: false })

    if (eventsData) setEvents(eventsData)

    // Load checklist items
    const { data: itemsData, error } = await supabase
      .from('checklist_items')
      .select('*, events(name)')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error loading checklist:', error)
    } else {
      setItems(itemsData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredItems = items.filter(item => {
    const matchesEvent = selectedEvent === 'all' || item.event_id === selectedEvent
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
    const matchesPriority = selectedPriority === 'all' || item.priority === selectedPriority
    const matchesSearch = !searchTerm ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesEvent && matchesStatus && matchesPriority && matchesSearch
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedEvent || selectedEvent === 'all') {
      alert('נא לבחור אירוע')
      return
    }

    const taskData = {
      event_id: selectedEvent,
      title: formData.title,
      description: formData.description || null,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date || null,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
      is_milestone: formData.is_milestone,
      notes: formData.notes || null
    }

    if (editingItem) {
      const { error } = await supabase
        .from('checklist_items')
        .update(taskData)
        .eq('id', editingItem.id)

      if (error) {
        alert('שגיאה בעדכון המשימה')
        return
      }
    } else {
      const { error } = await supabase
        .from('checklist_items')
        .insert(taskData)

      if (error) {
        alert('שגיאה ביצירת המשימה')
        return
      }
    }

    closeModal()
    loadData()
  }

  async function toggleStatus(item: ChecklistItem) {
    const newStatus: TaskStatus = item.status === 'completed' ? 'pending' : 'completed'
    const updateData: Partial<ChecklistItem> = {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    }

    const { error } = await supabase
      .from('checklist_items')
      .update(updateData)
      .eq('id', item.id)

    if (!error) {
      loadData()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('האם למחוק את המשימה?')) return

    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', id)

    if (!error) loadData()
  }

  function openEditModal(item: ChecklistItem) {
    setEditingItem(item)
    setSelectedEvent(item.event_id)
    setFormData({
      title: item.title,
      description: item.description || '',
      status: item.status,
      priority: item.priority,
      due_date: item.due_date?.split('T')[0] || '',
      estimated_hours: item.estimated_hours?.toString() || '',
      estimated_cost: item.estimated_cost?.toString() || '',
      is_milestone: item.is_milestone,
      notes: item.notes || ''
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingItem(null)
    setFormData({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      due_date: '',
      estimated_hours: '',
      estimated_cost: '',
      is_milestone: false,
      notes: ''
    })
  }

  // Stats
  const stats = {
    total: items.length,
    completed: items.filter(i => i.status === 'completed').length,
    inProgress: items.filter(i => i.status === 'in_progress').length,
    blocked: items.filter(i => i.status === 'blocked').length
  }
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  if (loading) {
    return (
      <div className="p-8 relative z-10 flex justify-center items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-400/30 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-zinc-400 font-medium">טוען משימות...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 relative z-10">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="checklist-title">צ'קליסט</h1>
            <p className="text-zinc-400 mt-1">{stats.total} משימות | {completionRate}% הושלמו</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all duration-300"
            data-testid="add-task-btn"
          >
            <Plus className="w-5 h-5" />
            משימה חדשה
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gray-400 to-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">סה"כ משימות</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-400 to-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">הושלמו</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">בביצוע</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">התקדמות</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span className="text-xl font-bold text-emerald-600">{completionRate}%</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1d27]/60 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-6">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="חיפוש משימות..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              />
            </div>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="px-4 py-2.5 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all min-w-[180px]"
            >
              <option value="all">כל האירועים</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="pending">ממתין</option>
              <option value="in_progress">בביצוע</option>
              <option value="completed">הושלם</option>
              <option value="blocked">חסום</option>
            </select>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-4 py-2.5 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            >
              <option value="all">כל העדיפויות</option>
              <option value="critical">קריטית</option>
              <option value="high">גבוהה</option>
              <option value="medium">בינונית</option>
              <option value="low">נמוכה</option>
            </select>
          </div>
        </div>

        {/* Checklist Items */}
        <div className="bg-[#1a1d27] border border-white/5 rounded-2xl border border-white/10 overflow-hidden" data-testid="checklist-list">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full" />
                <CheckSquare className="relative mx-auto mb-4 text-gray-300" size={56} />
              </div>
              <p className="text-zinc-300 text-lg font-semibold">אין משימות עדיין</p>
              <p className="text-zinc-500 text-sm mt-2">הוסף משימה ראשונה להתחיל</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className={`group flex items-center gap-4 p-5 ${
                    item.status === 'completed' ? 'bg-white/5' : 'hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-transparent'
                  } transition-all duration-300`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleStatus(item)}
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                      item.status === 'completed'
                        ? 'bg-gradient-to-br from-emerald-400 to-green-500 border-emerald-400 text-white shadow-md shadow-emerald-500/30'
                        : 'border-white/20 hover:border-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    {item.status === 'completed' && <CheckSquare className="w-4 h-4" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-white ${item.status === 'completed' ? 'line-through text-zinc-500' : 'group-hover:text-emerald-400'} transition-colors`}>
                        {item.title}
                      </span>
                      {item.is_milestone && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-lg font-medium">אבן דרך</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1.5">
                      {item.events?.name && (
                        <span className="text-xs bg-white/5 px-2.5 py-1 rounded-lg">{item.events.name}</span>
                      )}
                      {item.due_date && (
                        <span className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3 h-3" />
                          {new Date(item.due_date).toLocaleDateString('he-IL')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Priority */}
                  <span className={`text-sm font-medium ${getPriorityColor(item.priority)}`}>
                    {getPriorityLabel(item.priority)}
                  </span>

                  {/* Status Badge */}
                  <span className={`text-xs px-3 py-1.5 rounded-lg font-medium ${getTaskStatusColor(item.status)}`}>
                    {getTaskStatusLabel(item.status)}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105"
                    >
                      <Edit2 className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2.5 hover:bg-red-500/10 rounded-xl transition-all duration-200 hover:scale-105"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-modal p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingItem ? 'עריכת משימה' : 'משימה חדשה'}
              </h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-300">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">אירוע *</label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="">בחר אירוע</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">כותרת *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">סטטוס</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    className="input w-full"
                  >
                    <option value="pending">ממתין</option>
                    <option value="in_progress">בביצוע</option>
                    <option value="completed">הושלם</option>
                    <option value="blocked">חסום</option>
                    <option value="cancelled">בוטל</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">עדיפות</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="input w-full"
                  >
                    <option value="low">נמוכה</option>
                    <option value="medium">בינונית</option>
                    <option value="high">גבוהה</option>
                    <option value="critical">קריטית</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך יעד</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">שעות משוערות</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                    className="input w-full"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">עלות משוערת (₪)</label>
                  <input
                    type="number"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                    className="input w-full"
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_milestone"
                    checked={formData.is_milestone}
                    onChange={(e) => setFormData({ ...formData, is_milestone: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_milestone" className="text-sm">אבן דרך (Milestone)</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">הערות</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input w-full"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all duration-300">
                  {editingItem ? 'עדכון' : 'יצירה'}
                </button>
                <button type="button" onClick={closeModal} className="px-6 py-2.5 border border-white/10 rounded-xl hover:bg-white/5 transition-colors font-medium">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Schedules Page - Event Timeline & Agenda Management
// ═══════════════════════════════════════════════════════════════════════════

interface Schedule {
  id: string
  event_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  location: string | null
  room: string | null
  max_capacity: number | null
  current_count: number
  is_mandatory: boolean
  is_break: boolean
  track: string | null
  track_color: string | null
  speaker_name: string | null
  speaker_title: string | null
  speaker_bio: string | null
  speaker_image: string | null
  materials_url: string | null
  send_reminder: boolean
  reminder_minutes_before: number
  sort_order: number
  created_at: string
  events?: { name: string }
}

interface ScheduleFormData {
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

const trackColors = [
  { value: '#3B82F6', label: 'כחול' },
  { value: '#10B981', label: 'ירוק' },
  { value: '#F59E0B', label: 'כתום' },
  { value: '#EF4444', label: 'אדום' },
  { value: '#8B5CF6', label: 'סגול' },
  { value: '#EC4899', label: 'ורוד' },
  { value: '#6B7280', label: 'אפור' },
]

function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string>('all')
  const nowLineRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [formData, setFormData] = useState<ScheduleFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    room: '',
    max_capacity: '',
    is_mandatory: false,
    is_break: false,
    track: '',
    track_color: '#3B82F6',
    speaker_name: '',
    speaker_title: '',
    send_reminder: true,
    reminder_minutes_before: '15'
  })

  // Update the now line every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to now line after data loads
  useEffect(() => {
    if (!loading && nowLineRef.current) {
      setTimeout(() => {
        nowLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [loading])

  async function loadData() {
    setLoading(true)

    // Load events
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name')
      .order('start_date', { ascending: false })

    if (eventsData) setEvents(eventsData)

    // Load schedules
    const { data: schedulesData, error } = await supabase
      .from('schedules')
      .select('*, events(name)')
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error loading schedules:', error)
    } else {
      setSchedules(schedulesData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredSchedules = schedules.filter(schedule => {
    return selectedEvent === 'all' || schedule.event_id === selectedEvent
  })

  // Group schedules by date
  const groupedSchedules = filteredSchedules.reduce((groups, schedule) => {
    const date = new Date(schedule.start_time).toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(schedule)
    return groups
  }, {} as Record<string, Schedule[]>)

  // Today's date string for now-line comparison
  const todayDateStr = currentTime.toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Find where to insert the now line within a day's sorted schedules
  function getNowLinePosition(daySchedules: Schedule[]): number {
    for (let i = 0; i < daySchedules.length; i++) {
      if (currentTime < new Date(daySchedules[i].start_time)) {
        return i
      }
    }
    return daySchedules.length
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedEvent || selectedEvent === 'all') {
      alert('נא לבחור אירוע')
      return
    }

    const scheduleData = {
      event_id: selectedEvent,
      title: formData.title,
      description: formData.description || null,
      start_time: formData.start_time,
      end_time: formData.end_time,
      location: formData.location || null,
      room: formData.room || null,
      max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
      is_mandatory: formData.is_mandatory,
      is_break: formData.is_break,
      track: formData.track || null,
      track_color: formData.track_color || null,
      speaker_name: formData.speaker_name || null,
      speaker_title: formData.speaker_title || null,
      send_reminder: formData.send_reminder,
      reminder_minutes_before: parseInt(formData.reminder_minutes_before) || 15
    }

    if (editingSchedule) {
      const { error } = await supabase
        .from('schedules')
        .update(scheduleData)
        .eq('id', editingSchedule.id)

      if (error) {
        alert('שגיאה בעדכון הפריט')
        return
      }
    } else {
      const { error } = await supabase
        .from('schedules')
        .insert(scheduleData)

      if (error) {
        alert('שגיאה ביצירת הפריט')
        return
      }
    }

    closeModal()
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('האם למחוק את הפריט?')) return

    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id)

    if (!error) loadData()
  }

  function openEditModal(schedule: Schedule) {
    setEditingSchedule(schedule)
    setSelectedEvent(schedule.event_id)
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      start_time: schedule.start_time.slice(0, 16),
      end_time: schedule.end_time.slice(0, 16),
      location: schedule.location || '',
      room: schedule.room || '',
      max_capacity: schedule.max_capacity?.toString() || '',
      is_mandatory: schedule.is_mandatory,
      is_break: schedule.is_break,
      track: schedule.track || '',
      track_color: schedule.track_color || '#3B82F6',
      speaker_name: schedule.speaker_name || '',
      speaker_title: schedule.speaker_title || '',
      send_reminder: schedule.send_reminder,
      reminder_minutes_before: schedule.reminder_minutes_before.toString()
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingSchedule(null)
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      room: '',
      max_capacity: '',
      is_mandatory: false,
      is_break: false,
      track: '',
      track_color: '#3B82F6',
      speaker_name: '',
      speaker_title: '',
      send_reminder: true,
      reminder_minutes_before: '15'
    })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getDuration(start: string, end: string) {
    const diff = new Date(end).getTime() - new Date(start).getTime()
    const minutes = Math.round(diff / 60000)
    if (minutes < 60) return `${minutes} דקות`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}:${remainingMinutes.toString().padStart(2, '0')} שעות` : `${hours} שעות`
  }

  // Stats
  const stats = {
    total: filteredSchedules.length,
    sessions: filteredSchedules.filter(s => !s.is_break).length,
    breaks: filteredSchedules.filter(s => s.is_break).length,
    mandatory: filteredSchedules.filter(s => s.is_mandatory).length
  }

  if (loading) {
    return (
      <div className="p-8 relative z-10 flex justify-center items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400/30 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-zinc-400 font-medium">טוען לוח זמנים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 relative z-10">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="schedules-title">לוח זמנים</h1>
            <p className="text-zinc-400 mt-1">{stats.total} פריטים | {stats.sessions} מפגשים | {stats.breaks} הפסקות</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-300"
            data-testid="add-schedule-btn"
          >
            <Plus className="w-5 h-5" />
            פריט חדש
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gray-400 to-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">סה"כ פריטים</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">מפגשים</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats.sessions}</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">הפסקות</p>
            <p className="text-3xl font-bold text-orange-400 mt-1">{stats.breaks}</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">חובה</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">{stats.mandatory}</p>
          </div>
        </div>

        {/* Event Filter */}
        <div className="bg-[#1a1d27]/60 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-6">
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-4 py-2.5 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all min-w-[250px]"
          >
            <option value="all">כל האירועים</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
        </div>

        {/* Timeline */}
        <div className="bg-[#1a1d27] border border-white/5 rounded-2xl border border-white/10 p-6 overflow-hidden" data-testid="schedules-list">
          {Object.keys(groupedSchedules).length === 0 ? (
            <div className="text-center py-16">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full" />
                <Clock className="relative mx-auto mb-4 text-gray-300" size={56} />
              </div>
              <p className="text-zinc-300 text-lg font-semibold">אין פריטים בלוח הזמנים</p>
              <p className="text-zinc-500 text-sm mt-2">הוסף פריט ראשון להתחיל</p>
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(groupedSchedules).map(([date, daySchedules]) => {
                const isToday = date === todayDateStr
                const nowPosition = isToday ? getNowLinePosition(daySchedules) : -1

                return (
                <div key={date}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{date}</h2>
                    {isToday && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2.5 py-1 rounded-lg font-medium border border-red-500/30">עכשיו</span>
                    )}
                  </div>

                  {/* Timeline Items */}
                  <div className="relative pr-8 border-r-2 border-amber-500/30 space-y-4">
                    {daySchedules.map((schedule, index) => (
                      <Fragment key={schedule.id}>
                        {/* Now Line - current time indicator */}
                        {nowPosition === index && (
                          <div ref={nowLineRef} className="relative flex items-center py-1">
                            <div
                              className="absolute -right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 z-10 border-2 border-red-400"
                              style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.2)' }}
                            />
                            <div className="w-full flex items-center gap-3 pr-8">
                              <span className="text-xs font-bold text-red-400 bg-red-500/15 px-2.5 py-1 rounded-lg border border-red-500/30 shrink-0">
                                {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="flex-1 h-[2px] bg-gradient-to-l from-red-500 to-red-500/20 rounded-full" />
                            </div>
                          </div>
                        )}

                        <div
                          className="relative pr-8 group"
                        >
                          {/* Timeline Dot */}
                          <div
                            className={`absolute -right-[10px] w-5 h-5 rounded-full border-3 border-white shadow-md ${
                              schedule.is_break ? 'bg-gradient-to-br from-orange-400 to-amber-500' : schedule.track_color ? '' : 'bg-gradient-to-br from-blue-400 to-blue-600'
                            }`}
                            style={schedule.track_color && !schedule.is_break ? { background: `linear-gradient(135deg, ${schedule.track_color}, ${schedule.track_color}dd)` } : {}}
                          />

                          {/* Content Card */}
                          <div className={`p-5 rounded-2xl border ${
                            schedule.is_break
                              ? 'bg-gradient-to-r from-orange-500/15 to-amber-500/10 border-orange-500/30'
                              : 'bg-[#1a1d27]/90 border-white/10 hover:bg-[#1a1d27] hover:shadow-xl hover:shadow-blue-500/10'
                          } transition-all duration-300`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Time & Duration */}
                                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                                  <span className="bg-white/5 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                  </span>
                                  <span className="text-zinc-500 bg-white/5 px-2 py-1 rounded-lg text-xs">({getDuration(schedule.start_time, schedule.end_time)})</span>
                                </div>

                                {/* Title */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {schedule.is_break ? (
                                    <Coffee className="w-5 h-5 text-orange-500" />
                                  ) : (
                                    <Play className="w-5 h-5 text-blue-500" />
                                  )}
                                  <h3 className="font-bold text-lg text-white group-hover:text-orange-400 transition-colors">{schedule.title}</h3>
                                  {schedule.is_mandatory && (
                                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-lg font-medium">חובה</span>
                                  )}
                                  {schedule.track && (
                                    <span
                                      className="text-xs px-2.5 py-1 rounded-lg text-white font-medium shadow-sm"
                                      style={{ backgroundColor: schedule.track_color || '#6B7280' }}
                                    >
                                      {schedule.track}
                                    </span>
                                  )}
                                </div>

                                {/* Description */}
                                {schedule.description && (
                                  <p className="text-zinc-400 text-sm mt-2">{schedule.description}</p>
                                )}

                                {/* Location & Room */}
                                {(schedule.location || schedule.room) && (
                                  <div className="flex items-center gap-2 text-sm text-zinc-400 mt-3 bg-white/5 px-3 py-1.5 rounded-lg inline-flex">
                                    <MapPin className="w-4 h-4 text-rose-400" />
                                    <span>{[schedule.location, schedule.room].filter(Boolean).join(' - ')}</span>
                                  </div>
                                )}

                                {/* Speaker */}
                                {schedule.speaker_name && (
                                  <div className="flex items-center gap-2 text-sm text-zinc-400 mt-2 bg-blue-500/10 px-3 py-1.5 rounded-lg inline-flex">
                                    <User className="w-4 h-4 text-blue-400" />
                                    <span className="font-medium">{schedule.speaker_name}</span>
                                    {schedule.speaker_title && (
                                      <span className="text-zinc-500">| {schedule.speaker_title}</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openEditModal(schedule)}
                                  className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105"
                                >
                                  <Edit2 className="w-4 h-4 text-zinc-400" />
                                </button>
                                <button
                                  onClick={() => handleDelete(schedule.id)}
                                  className="p-2.5 hover:bg-red-500/10 rounded-xl transition-all duration-200 hover:scale-105"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Fragment>
                    ))}

                    {/* Now Line - after all items */}
                    {nowPosition === daySchedules.length && (
                      <div ref={nowLineRef} className="relative flex items-center py-1">
                        <div
                          className="absolute -right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 z-10 border-2 border-red-400"
                          style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.2)' }}
                        />
                        <div className="w-full flex items-center gap-3 pr-8">
                          <span className="text-xs font-bold text-red-400 bg-red-500/15 px-2.5 py-1 rounded-lg border border-red-500/30 shrink-0">
                            {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="flex-1 h-[2px] bg-gradient-to-l from-red-500 to-red-500/20 rounded-full" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-modal p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingSchedule ? 'עריכת פריט' : 'פריט חדש בלו"ז'}
              </h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-300">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">אירוע *</label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="">בחר אירוע</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">כותרת *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">שעת התחלה *</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">שעת סיום *</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">מיקום</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input w-full"
                    placeholder="אולם ראשי"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">חדר</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="input w-full"
                    placeholder="חדר 1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">מסלול (Track)</label>
                  <input
                    type="text"
                    value={formData.track}
                    onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                    className="input w-full"
                    placeholder="מסלול טכני"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">צבע מסלול</label>
                  <div className="flex gap-2">
                    {trackColors.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, track_color: color.value })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.track_color === color.value ? 'border-gray-800' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">שם מרצה</label>
                  <input
                    type="text"
                    value={formData.speaker_name}
                    onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">תפקיד מרצה</label>
                  <input
                    type="text"
                    value={formData.speaker_title}
                    onChange={(e) => setFormData({ ...formData, speaker_title: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">קיבולת מקסימלית</label>
                  <input
                    type="number"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                    className="input w-full"
                    placeholder="ללא הגבלה"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">תזכורת (דקות לפני)</label>
                  <input
                    type="number"
                    value={formData.reminder_minutes_before}
                    onChange={(e) => setFormData({ ...formData, reminder_minutes_before: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_mandatory}
                    onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">מפגש חובה</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_break}
                    onChange={(e) => setFormData({ ...formData, is_break: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">הפסקה</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.send_reminder}
                    onChange={(e) => setFormData({ ...formData, send_reminder: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">שליחת תזכורת</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-300">
                  {editingSchedule ? 'עדכון' : 'יצירה'}
                </button>
                <button type="button" onClick={closeModal} className="px-6 py-2.5 bg-[#1a1d27] border border-white/5 text-zinc-300 rounded-xl font-medium border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all duration-300">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Program Management Page - ניהול תוכניה מלא
// ═══════════════════════════════════════════════════════════════════════════

interface ParticipantSchedule {
  id: string
  participant_id: string
  schedule_id: string
  is_companion: boolean
  reminder_sent: boolean
  reminder_sent_at: string | null
  attended: boolean | null
  created_at: string
  participants?: {
    id: string
    first_name: string
    last_name: string
    phone: string
    email: string | null
  }
  schedules?: {
    id: string
    title: string
    start_time: string
    end_time: string
    track: string | null
    track_color: string | null
  }
}

interface UpcomingReminder {
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

function ProgramManagementPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'assign' | 'reminders'>('import')
  const [events, setEvents] = useState<{ id: string; name: string; start_date: string }[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [assignments, setAssignments] = useState<ParticipantSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const participantsFileRef = useRef<HTMLInputElement>(null)

  // Load initial data
  useEffect(() => {
    loadEvents()
  }, [])

  // Load event-specific data when event changes
  useEffect(() => {
    if (selectedEventId) {
      loadEventData()
    }
  }, [selectedEventId])

  async function loadEvents() {
    const { data } = await supabase
      .from('events')
      .select('id, name, start_date')
      .order('start_date', { ascending: false })

    if (data) {
      setEvents(data)
      if (data.length > 0) {
        setSelectedEventId(data[0].id)
      }
    }
    setLoading(false)
  }

  async function loadEventData() {
    setLoading(true)

    // Load schedules for event
    const { data: schedulesData } = await supabase
      .from('schedules')
      .select('*')
      .eq('event_id', selectedEventId)
      .order('start_time', { ascending: true })

    if (schedulesData) setSchedules(schedulesData)

    // Load participants for event
    const { data: participantsData } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', selectedEventId)
      .order('last_name', { ascending: true })

    if (participantsData) setParticipants(participantsData)

    // Load assignments
    const { data: assignmentsData } = await supabase
      .from('participant_schedules')
      .select(`
        *,
        participants(id, first_name, last_name, phone, email),
        schedules(id, title, start_time, end_time, track, track_color)
      `)
      .in('participant_id', participantsData?.map(p => p.id) || [])

    if (assignmentsData) setAssignments(assignmentsData)

    setLoading(false)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Excel Import Functions
  // ═══════════════════════════════════════════════════════════════════════════

  async function handleScheduleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedEventId) return

    setImporting(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

      const schedulesToInsert = rows.map((row, index) => ({
        event_id: selectedEventId,
        title: String(row['כותרת'] || row['title'] || row['שם'] || ''),
        description: row['תיאור'] || row['description'] || null,
        start_time: parseExcelDateTime(row['שעת התחלה'] || row['start_time'] || row['התחלה']),
        end_time: parseExcelDateTime(row['שעת סיום'] || row['end_time'] || row['סיום']),
        location: row['מיקום'] || row['location'] || null,
        room: row['חדר'] || row['room'] || null,
        track: row['טראק'] || row['track'] || row['מסלול'] || null,
        track_color: row['צבע'] || row['color'] || getTrackColor(row['טראק'] || row['track'] || row['מסלול']),
        speaker_name: row['מרצה'] || row['speaker'] || row['מנחה'] || null,
        speaker_title: row['תפקיד מרצה'] || row['speaker_title'] || null,
        is_break: Boolean(row['הפסקה'] || row['is_break']),
        is_mandatory: Boolean(row['חובה'] || row['mandatory']),
        send_reminder: true,
        reminder_minutes_before: Number(row['תזכורת דקות'] || row['reminder_minutes'] || 15),
        sort_order: index
      })).filter(s => s.title && s.start_time && s.end_time)

      if (schedulesToInsert.length === 0) {
        alert('לא נמצאו פריטים תקינים בקובץ')
        setImporting(false)
        return
      }

      const { error } = await supabase
        .from('schedules')
        .insert(schedulesToInsert)

      if (error) {
        console.error('Import error:', error)
        alert('שגיאה בייבוא: ' + error.message)
      } else {
        alert(`יובאו ${schedulesToInsert.length} פריטים בהצלחה!`)
        loadEventData()
      }
    } catch (err) {
      console.error('Parse error:', err)
      alert('שגיאה בקריאת הקובץ')
    }

    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleParticipantsImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedEventId) return

    setImporting(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

      const participantsToInsert = rows.map(row => ({
        event_id: selectedEventId,
        first_name: String(row['שם פרטי'] || row['first_name'] || ''),
        last_name: String(row['שם משפחה'] || row['last_name'] || ''),
        phone: normalizePhone(String(row['טלפון'] || row['phone'] || '')),
        email: row['אימייל'] || row['email'] || null,
        status: 'confirmed' as ParticipantStatus,
        // Track assignment stored in custom_fields for later processing
        custom_fields: {
          track: row['טראק'] || row['track'] || row['מסלול'] || null
        }
      })).filter(p => p.first_name && p.phone)

      if (participantsToInsert.length === 0) {
        alert('לא נמצאו משתתפים תקינים בקובץ')
        setImporting(false)
        return
      }

      const { data: insertedParticipants, error } = await supabase
        .from('participants')
        .insert(participantsToInsert)
        .select()

      if (error) {
        console.error('Import error:', error)
        alert('שגיאה בייבוא: ' + error.message)
      } else {
        // Auto-assign participants to tracks
        if (insertedParticipants) {
          await autoAssignToTracks(insertedParticipants)
        }
        alert(`יובאו ${participantsToInsert.length} משתתפים בהצלחה!`)
        loadEventData()
      }
    } catch (err) {
      console.error('Parse error:', err)
      alert('שגיאה בקריאת הקובץ')
    }

    setImporting(false)
    if (participantsFileRef.current) participantsFileRef.current.value = ''
  }

  async function autoAssignToTracks(insertedParticipants: Participant[]) {
    const assignmentsToCreate: { participant_id: string; schedule_id: string }[] = []

    for (const participant of insertedParticipants) {
      const track = (participant.custom_fields as Record<string, unknown>)?.track as string
      if (!track) continue

      // Find all schedules matching this track
      const trackSchedules = schedules.filter(s =>
        s.track?.toLowerCase() === track.toLowerCase() || s.is_mandatory
      )

      for (const schedule of trackSchedules) {
        assignmentsToCreate.push({
          participant_id: participant.id,
          schedule_id: schedule.id
        })
      }
    }

    if (assignmentsToCreate.length > 0) {
      await supabase.from('participant_schedules').insert(assignmentsToCreate)
    }
  }

  function parseExcelDateTime(value: unknown): string {
    if (!value) return ''

    // If it's already an ISO string
    if (typeof value === 'string' && value.includes('T')) {
      return value
    }

    // If it's an Excel serial date number
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000)
      return date.toISOString()
    }

    // Try to parse as date string
    const date = new Date(String(value))
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }

    return ''
  }

  function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('972')) return digits
    if (digits.startsWith('0')) return '972' + digits.slice(1)
    return '972' + digits
  }

  function getTrackColor(track: unknown): string {
    if (!track) return '#3B82F6'
    const trackStr = String(track).toLowerCase()
    const colors: Record<string, string> = {
      'טכנולוגיה': '#3B82F6',
      'tech': '#3B82F6',
      'עסקים': '#10B981',
      'business': '#10B981',
      'יצירתיות': '#F59E0B',
      'creative': '#F59E0B',
      'מנהיגות': '#8B5CF6',
      'leadership': '#8B5CF6'
    }
    return colors[trackStr] || '#3B82F6'
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Assignment Functions
  // ═══════════════════════════════════════════════════════════════════════════

  async function assignParticipantToSchedule(participantId: string, scheduleId: string) {
    // Check if already assigned
    const existing = assignments.find(a =>
      a.participant_id === participantId && a.schedule_id === scheduleId
    )
    if (existing) return

    const { error } = await supabase
      .from('participant_schedules')
      .insert({
        participant_id: participantId,
        schedule_id: scheduleId
      })

    if (!error) {
      loadEventData()
    }
  }

  async function removeAssignment(assignmentId: string) {
    const { error } = await supabase
      .from('participant_schedules')
      .delete()
      .eq('id', assignmentId)

    if (!error) {
      loadEventData()
    }
  }

  async function assignAllToSchedule(scheduleId: string) {
    const unassigned = participants.filter(p =>
      !assignments.some(a => a.participant_id === p.id && a.schedule_id === scheduleId)
    )

    if (unassigned.length === 0) return

    const newAssignments = unassigned.map(p => ({
      participant_id: p.id,
      schedule_id: scheduleId
    }))

    const { error } = await supabase
      .from('participant_schedules')
      .insert(newAssignments)

    if (!error) {
      loadEventData()
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Reminder Functions
  // ═══════════════════════════════════════════════════════════════════════════

  function getUpcomingReminders(): UpcomingReminder[] {
    const now = new Date()
    const upcoming: UpcomingReminder[] = []

    for (const schedule of schedules) {
      if (!schedule.send_reminder) continue

      const startTime = new Date(schedule.start_time)
      const reminderTime = new Date(startTime.getTime() - schedule.reminder_minutes_before * 60000)
      const minutesUntil = Math.round((reminderTime.getTime() - now.getTime()) / 60000)

      // Show reminders that are due in the next 60 minutes or up to 5 minutes overdue
      if (minutesUntil > 60 || minutesUntil < -5) continue

      // Get participants assigned to this schedule
      const scheduleAssignments = assignments.filter(a => a.schedule_id === schedule.id)
      const assignedParticipants = scheduleAssignments.map(a => {
        const participant = participants.find(p => p.id === a.participant_id)
        return participant ? {
          id: participant.id,
          first_name: participant.first_name,
          last_name: participant.last_name,
          phone: participant.phone,
          reminder_sent: a.reminder_sent
        } : null
      }).filter((p): p is NonNullable<typeof p> => p !== null)

      if (assignedParticipants.length > 0) {
        upcoming.push({
          schedule,
          participants: assignedParticipants,
          minutesUntil
        })
      }
    }

    return upcoming.sort((a, b) => a.minutesUntil - b.minutesUntil)
  }

  function generateReminderMessage(
    participant: { first_name: string; last_name: string },
    schedule: Schedule
  ): string {
    const startTime = new Date(schedule.start_time).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    })

    let message = `שלום ${participant.first_name} ${participant.last_name}! 👋\n\n`
    message += `🔔 תזכורת: בעוד ${schedule.reminder_minutes_before} דקות מתחיל:\n\n`
    message += `📌 *${schedule.title}*\n`
    message += `🕐 שעה: ${startTime}\n`

    if (schedule.location) {
      message += `📍 מיקום: ${schedule.location}\n`
    }
    if (schedule.room) {
      message += `🚪 חדר: ${schedule.room}\n`
    }
    if (schedule.speaker_name) {
      message += `👤 מרצה: ${schedule.speaker_name}\n`
    }
    if (schedule.description) {
      message += `\n📝 ${schedule.description}\n`
    }

    message += `\nנתראה שם! 🎉`

    return message
  }

  async function sendReminder(
    participant: { id: string; first_name: string; last_name: string; phone: string },
    schedule: Schedule
  ) {
    const message = generateReminderMessage(participant, schedule)

    try {
      // Call the Edge Function to send WhatsApp message
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: participant.phone,
          message
        }
      })

      if (error) throw error

      // Mark reminder as sent
      await supabase
        .from('participant_schedules')
        .update({
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString()
        })
        .eq('participant_id', participant.id)
        .eq('schedule_id', schedule.id)

      // Log the message
      await supabase
        .from('messages')
        .insert({
          event_id: selectedEventId,
          participant_id: participant.id,
          channel: 'whatsapp',
          to_phone: participant.phone,
          content: message,
          status: 'sent',
          sent_at: new Date().toISOString()
        })

      return true
    } catch (err) {
      console.error('Failed to send reminder:', err)
      return false
    }
  }

  async function sendAllReminders(reminder: UpcomingReminder) {
    setSending(true)
    let successCount = 0
    let failCount = 0

    for (const participant of reminder.participants) {
      if (participant.reminder_sent) continue

      const success = await sendReminder(participant, reminder.schedule)
      if (success) {
        successCount++
      } else {
        failCount++
      }

      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setSending(false)
    loadEventData()

    alert(`נשלחו ${successCount} הודעות${failCount > 0 ? `, ${failCount} נכשלו` : ''}`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Download Template
  // ═══════════════════════════════════════════════════════════════════════════

  function downloadScheduleTemplate() {
    const template = [
      {
        'כותרת': 'פתיחה וברכות',
        'תיאור': 'ברכות פתיחה מהמנכ"ל',
        'שעת התחלה': '2024-03-15T09:00:00',
        'שעת סיום': '2024-03-15T09:30:00',
        'מיקום': 'אולם ראשי',
        'חדר': 'A1',
        'טראק': 'כללי',
        'מרצה': 'ישראל ישראלי',
        'תפקיד מרצה': 'מנכ"ל',
        'הפסקה': false,
        'חובה': true,
        'תזכורת דקות': 15
      },
      {
        'כותרת': 'הפסקת קפה',
        'תיאור': '',
        'שעת התחלה': '2024-03-15T10:30:00',
        'שעת סיום': '2024-03-15T11:00:00',
        'מיקום': 'לובי',
        'חדר': '',
        'טראק': '',
        'מרצה': '',
        'תפקיד מרצה': '',
        'הפסקה': true,
        'חובה': false,
        'תזכורת דקות': 5
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'תוכניה')
    XLSX.writeFile(wb, 'תבנית_תוכניה.xlsx')
  }

  function downloadParticipantsTemplate() {
    const template = [
      {
        'שם פרטי': 'ישראל',
        'שם משפחה': 'ישראלי',
        'טלפון': '0501234567',
        'אימייל': 'israel@example.com',
        'טראק': 'טכנולוגיה'
      },
      {
        'שם פרטי': 'שרה',
        'שם משפחה': 'כהן',
        'טלפון': '0509876543',
        'אימייל': 'sara@example.com',
        'טראק': 'עסקים'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'משתתפים')
    XLSX.writeFile(wb, 'תבנית_משתתפים.xlsx')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Stats
  // ═══════════════════════════════════════════════════════════════════════════

  const stats = {
    schedules: schedules.length,
    participants: participants.length,
    assignments: assignments.length,
    tracks: [...new Set(schedules.map(s => s.track).filter(Boolean))].length,
    pendingReminders: assignments.filter(a => !a.reminder_sent).length
  }

  const upcomingReminders = getUpcomingReminders()

  if (loading && !selectedEventId) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="program-title">ניהול תוכניה</h1>
          <p className="text-zinc-400">ייבוא תוכניה, שיוך משתתפים ושליחת תזכורות</p>
        </div>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="input min-w-[250px]"
          data-testid="event-selector"
        >
          <option value="">בחר אירוע</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>{event.name}</option>
          ))}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="card">
          <p className="text-zinc-400 text-sm">פריטי תוכניה</p>
          <p className="text-2xl font-bold">{stats.schedules}</p>
        </div>
        <div className="card">
          <p className="text-zinc-400 text-sm">משתתפים</p>
          <p className="text-2xl font-bold text-blue-600">{stats.participants}</p>
        </div>
        <div className="card">
          <p className="text-zinc-400 text-sm">שיוכים</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.assignments}</p>
        </div>
        <div className="card">
          <p className="text-zinc-400 text-sm">טראקים</p>
          <p className="text-2xl font-bold text-purple-600">{stats.tracks}</p>
        </div>
        <div className="card">
          <p className="text-zinc-400 text-sm">תזכורות ממתינות</p>
          <p className="text-2xl font-bold text-orange-400">{stats.pendingReminders}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'import'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <Upload className="w-4 h-4 inline ml-2" />
          ייבוא
        </button>
        <button
          onClick={() => setActiveTab('assign')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'assign'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <Link2 className="w-4 h-4 inline ml-2" />
          שיוך משתתפים
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'reminders'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <Bell className="w-4 h-4 inline ml-2" />
          תזכורות
          {upcomingReminders.length > 0 && (
            <span className="mr-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {upcomingReminders.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Schedule Import */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">
              <ClipboardList className="w-5 h-5 inline ml-2 text-blue-600" />
              ייבוא תוכניה מאקסל
            </h2>
            <p className="text-zinc-400 mb-4">
              יבא קובץ אקסל עם פריטי התוכניה: כותרת, שעות, מיקום, טראק, מרצה
            </p>

            <div className="space-y-4">
              <button
                onClick={downloadScheduleTemplate}
                className="btn-secondary w-full"
              >
                <Download className="w-4 h-4 ml-2" />
                הורד תבנית לדוגמה
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleScheduleImport}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedEventId || importing}
                className="btn-primary w-full"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 ml-2" />
                )}
                {importing ? 'מייבא...' : 'יבא תוכניה'}
              </button>
            </div>

            {schedules.length > 0 && (
              <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <CheckCircle className="w-4 h-4 inline ml-2 text-emerald-400" />
                <span className="text-emerald-400">
                  {schedules.length} פריטים בתוכניה
                </span>
              </div>
            )}
          </div>

          {/* Participants Import */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">
              <Users className="w-5 h-5 inline ml-2 text-emerald-400" />
              ייבוא משתתפים עם שיוך
            </h2>
            <p className="text-zinc-400 mb-4">
              יבא קובץ אקסל עם משתתפים: שם, טלפון, טראק - השיוך יתבצע אוטומטית
            </p>

            <div className="space-y-4">
              <button
                onClick={downloadParticipantsTemplate}
                className="btn-secondary w-full"
              >
                <Download className="w-4 h-4 ml-2" />
                הורד תבנית לדוגמה
              </button>

              <input
                ref={participantsFileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleParticipantsImport}
                className="hidden"
              />

              <button
                onClick={() => participantsFileRef.current?.click()}
                disabled={!selectedEventId || importing}
                className="btn-primary w-full"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 ml-2" />
                )}
                {importing ? 'מייבא...' : 'יבא משתתפים'}
              </button>
            </div>

            {participants.length > 0 && (
              <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <CheckCircle className="w-4 h-4 inline ml-2 text-emerald-400" />
                <span className="text-emerald-400">
                  {participants.length} משתתפים
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'assign' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">שיוך משתתפים לפריטי תוכניה</h2>
            <button onClick={loadEventData} className="btn-secondary text-sm">
              <RefreshCw className="w-4 h-4 ml-1" />
              רענן
            </button>
          </div>

          {schedules.length === 0 ? (
            <p className="text-zinc-400 text-center py-8">יש לייבא תוכניה קודם</p>
          ) : (
            <div className="space-y-4">
              {schedules.map(schedule => {
                const scheduleAssignments = assignments.filter(a => a.schedule_id === schedule.id)
                const assignedParticipantIds = scheduleAssignments.map(a => a.participant_id)
                const unassignedParticipants = participants.filter(p => !assignedParticipantIds.includes(p.id))

                return (
                  <div
                    key={schedule.id}
                    className={`p-4 rounded-lg border ${
                      schedule.is_break ? 'bg-orange-500/10 border-orange-500/20' : 'bg-[#1a1d27] border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        {schedule.track_color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: schedule.track_color }}
                          />
                        )}
                        <div>
                          <h3 className="font-semibold">{schedule.title}</h3>
                          <p className="text-sm text-zinc-400">
                            {new Date(schedule.start_time).toLocaleTimeString('he-IL', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {' - '}
                            {new Date(schedule.end_time).toLocaleTimeString('he-IL', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {schedule.track && ` | ${schedule.track}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-400">
                          {scheduleAssignments.length} / {participants.length}
                        </span>
                        {unassignedParticipants.length > 0 && (
                          <button
                            onClick={() => assignAllToSchedule(schedule.id)}
                            className="text-sm text-blue-400 hover:text-blue-300"
                          >
                            + הוסף הכל
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Assigned Participants */}
                    {scheduleAssignments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {scheduleAssignments.map(assignment => {
                          const participant = participants.find(p => p.id === assignment.participant_id)
                          if (!participant) return null

                          return (
                            <span
                              key={assignment.id}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                                assignment.reminder_sent
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {participant.first_name} {participant.last_name}
                              {assignment.reminder_sent && (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              <button
                                onClick={() => removeAssignment(assignment.id)}
                                className="hover:text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {/* Add Participant Dropdown */}
                    {unassignedParticipants.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            assignParticipantToSchedule(e.target.value, schedule.id)
                            e.target.value = ''
                          }
                        }}
                        className="input text-sm"
                        defaultValue=""
                      >
                        <option value="">+ הוסף משתתף...</option>
                        {unassignedParticipants.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.first_name} {p.last_name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="space-y-6">
          {/* Upcoming Reminders */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">
              <Bell className="w-5 h-5 inline ml-2 text-orange-400" />
              תזכורות קרובות
            </h2>

            {upcomingReminders.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>אין תזכורות קרובות</p>
                <p className="text-sm">תזכורות יופיעו כאן 60 דקות לפני המועד</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingReminders.map((reminder, index) => {
                  const pendingCount = reminder.participants.filter(p => !p.reminder_sent).length
                  const sentCount = reminder.participants.filter(p => p.reminder_sent).length

                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        reminder.minutesUntil <= 0
                          ? 'bg-red-500/10 border-red-500/30'
                          : reminder.minutesUntil <= 15
                          ? 'bg-orange-500/10 border-orange-500/30'
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {reminder.minutesUntil <= 0 ? (
                              <AlertTriangle className="w-5 h-5 text-red-400" />
                            ) : (
                              <Clock className="w-5 h-5 text-orange-400" />
                            )}
                            <h3 className="font-semibold">{reminder.schedule.title}</h3>
                          </div>
                          <p className="text-sm text-zinc-400">
                            {reminder.minutesUntil <= 0
                              ? `איחור של ${Math.abs(reminder.minutesUntil)} דקות!`
                              : `בעוד ${reminder.minutesUntil} דקות`
                            }
                            {' | '}
                            {new Date(reminder.schedule.start_time).toLocaleTimeString('he-IL', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-sm text-left">
                            <p className="text-emerald-400">{sentCount} נשלחו</p>
                            <p className="text-orange-400">{pendingCount} ממתינים</p>
                          </div>

                          {pendingCount > 0 && (
                            <button
                              onClick={() => sendAllReminders(reminder)}
                              disabled={sending}
                              className="btn-primary"
                            >
                              {sending ? (
                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4 ml-2" />
                              )}
                              שלח {pendingCount} תזכורות
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Participant List */}
                      <div className="flex flex-wrap gap-2">
                        {reminder.participants.map(participant => (
                          <span
                            key={participant.id}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
                              participant.reminder_sent
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-[#1a1d27] text-zinc-300 border border-white/10'
                            }`}
                          >
                            {participant.first_name} {participant.last_name}
                            {participant.reminder_sent ? (
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Clock className="w-3 h-3 text-orange-400" />
                            )}
                          </span>
                        ))}
                      </div>

                      {/* Message Preview */}
                      {pendingCount > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300">
                            תצוגה מקדימה של ההודעה
                          </summary>
                          <pre className="mt-2 p-3 bg-[#1a1d27] rounded border text-sm whitespace-pre-wrap text-right" dir="rtl">
                            {generateReminderMessage(
                              reminder.participants[0],
                              reminder.schedule
                            )}
                          </pre>
                        </details>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* All Schedules Status */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">סטטוס תזכורות לכל התוכניה</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-2">פריט</th>
                    <th className="text-right p-2">שעה</th>
                    <th className="text-right p-2">משתתפים</th>
                    <th className="text-right p-2">נשלחו</th>
                    <th className="text-right p-2">ממתינים</th>
                    <th className="text-right p-2">סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map(schedule => {
                    const scheduleAssignments = assignments.filter(a => a.schedule_id === schedule.id)
                    const sentCount = scheduleAssignments.filter(a => a.reminder_sent).length
                    const pendingCount = scheduleAssignments.filter(a => !a.reminder_sent).length
                    const isPast = new Date(schedule.start_time) < new Date()

                    return (
                      <tr key={schedule.id} className={`border-b ${isPast ? 'opacity-50' : ''}`}>
                        <td className="p-2">{schedule.title}</td>
                        <td className="p-2">
                          {new Date(schedule.start_time).toLocaleTimeString('he-IL', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-2">{scheduleAssignments.length}</td>
                        <td className="p-2 text-emerald-400">{sentCount}</td>
                        <td className="p-2 text-orange-400">{pendingCount}</td>
                        <td className="p-2">
                          {isPast ? (
                            <span className="text-zinc-500">עבר</span>
                          ) : pendingCount === 0 && sentCount > 0 ? (
                            <span className="text-emerald-400">✓ הושלם</span>
                          ) : pendingCount > 0 ? (
                            <span className="text-orange-400">ממתין</span>
                          ) : (
                            <span className="text-zinc-500">אין משתתפים</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Messages Page - Import from new module
// ═══════════════════════════════════════════════════════════════════════════
import { MessagesPage } from './pages/messages/MessagesPage'

// ═══════════════════════════════════════════════════════════════════════════
// AI Assistant Page
// ═══════════════════════════════════════════════════════════════════════════

// AI Chat Message Types
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  action?: {
    type: 'add_participant' | 'add_checklist' | 'add_schedule' | 'add_vendor' | 'update_event' | 'send_message'
    status: 'pending' | 'completed' | 'failed'
    data?: {
      name?: string
      title?: string
      [key: string]: unknown
    }
  }
}

// AI Action Button Component
function AIActionButton({
  label,
  icon: Icon,
  onClick,
  disabled
}: {
  label: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/30 rounded-lg text-sm text-violet-400 hover:bg-violet-500/20 hover:border-violet-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon size={16} />
      {label}
    </button>
  )
}

function AIAssistantPage() {
  const { selectedEvent, refreshEvents } = useEvent()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(7)

  // Add a new message
  const addMessage = (role: 'user' | 'assistant' | 'system', content: string, action?: ChatMessage['action']) => {
    const newMessage: ChatMessage = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      action
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage
  }

  // Simulate AI response based on user input
  const getAIResponse = async (userMessage: string): Promise<{ content: string; action?: ChatMessage['action'] }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

    const lowerMessage = userMessage.toLowerCase()

    // Check for action intents
    if (lowerMessage.includes('הוסף משתתף') || lowerMessage.includes('הוסף אורח')) {
      // Extract name if provided
      const nameMatch = userMessage.match(/(?:בשם|שנקרא)\s+(.+?)(?:\s|$)/i)
      if (nameMatch && selectedEvent) {
        return {
          content: `אני יכול להוסיף משתתף חדש לאירוע "${selectedEvent.name}". האם תרצה שאמשיך?`,
          action: { type: 'add_participant', status: 'pending', data: { name: nameMatch[1] } }
        }
      }
      return {
        content: selectedEvent
          ? `בוודאי! ספר לי את פרטי המשתתף שתרצה להוסיף לאירוע "${selectedEvent.name}" - שם, טלפון ואימייל (אופציונלי).`
          : 'כדי להוסיף משתתף, קודם יש לבחור אירוע. לחץ על אירוע מרשימת האירועים בתפריט הצדדי.'
      }
    }

    if (lowerMessage.includes('הוסף משימה') || lowerMessage.includes('משימה חדשה') || lowerMessage.includes('צ\'קליסט')) {
      return {
        content: selectedEvent
          ? `מה המשימה שתרצה להוסיף לאירוע "${selectedEvent.name}"? תאר את המשימה ואני אוסיף אותה לרשימה.`
          : 'כדי להוסיף משימה, קודם יש לבחור אירוע.'
      }
    }

    if (lowerMessage.includes('הוסף לוז') || lowerMessage.includes('הוסף פריט') || lowerMessage.includes('תוכניה')) {
      return {
        content: selectedEvent
          ? `אשמח להוסיף פריט ללו"ז של "${selectedEvent.name}". ספר לי: מה הנושא, מתי מתחיל ומתי נגמר?`
          : 'כדי להוסיף ללו"ז, קודם יש לבחור אירוע.'
      }
    }

    if (lowerMessage.includes('שלח הודעה') || lowerMessage.includes('וואטסאפ') || lowerMessage.includes('whatsapp')) {
      return {
        content: selectedEvent
          ? `אני יכול לעזור לשלוח הודעות WhatsApp למשתתפי "${selectedEvent.name}". מה תרצה לכתוב?`
          : 'כדי לשלוח הודעות, קודם יש לבחור אירוע עם משתתפים.'
      }
    }

    if (lowerMessage.includes('סטטוס') || lowerMessage.includes('מה המצב')) {
      if (selectedEvent) {
        return {
          content: `📊 סטטוס האירוע "${selectedEvent.name}":\n\n` +
            `• תאריך: ${new Date(selectedEvent.start_date).toLocaleDateString('he-IL')}\n` +
            `• מיקום: ${selectedEvent.venue_name || 'לא הוגדר'}\n` +
            `• משתתפים: ${selectedEvent.participants_count || 0}\n` +
            `• סטטוס: ${selectedEvent.status === 'active' ? 'פעיל' : selectedEvent.status === 'planning' ? 'בתכנון' : selectedEvent.status}\n\n` +
            `איך אוכל לעזור עם האירוע?`
        }
      }
      return { content: 'בחר אירוע כדי לראות את הסטטוס שלו.' }
    }

    if (lowerMessage.includes('עזרה') || lowerMessage.includes('מה אתה יכול')) {
      return {
        content: `🤖 אני יכול לעזור לך ב:\n\n` +
          `📋 **ניהול משתתפים**\n• הוספת משתתפים חדשים\n• עדכון פרטי משתתפים\n• יבוא רשימות מאקסל\n\n` +
          `📅 **ניהול לו"ז**\n• הוספת פריטים ללו"ז\n• עדכון זמנים ומיקומים\n• הקצאת מרצים\n\n` +
          `✅ **משימות**\n• יצירת משימות חדשות\n• מעקב התקדמות\n• תזכורות\n\n` +
          `📱 **תקשורת**\n• שליחת הודעות WhatsApp\n• הכנת תבניות הודעות\n\n` +
          `פשוט ספר לי מה אתה צריך!`
      }
    }

    if (lowerMessage.includes('רעיונות') || lowerMessage.includes('הצע') || lowerMessage.includes('המלצות')) {
      return {
        content: selectedEvent
          ? `💡 הנה כמה רעיונות לאירוע "${selectedEvent.name}":\n\n` +
            `1. **פעילות פתיחה** - שוברת קרח לחימום האווירה\n` +
            `2. **הפסקות networking** - זמן לקשרים בין המשתתפים\n` +
            `3. **סיכום יומי** - דגשים עיקריים בסוף כל יום\n` +
            `4. **תיבת שאלות** - מקום לשאלות אנונימיות\n` +
            `5. **מתנות לזכרון** - משהו קטן לסוף האירוע\n\n` +
            `רוצה שארחיב על אחד מהרעיונות?`
          : 'בחר אירוע ואשמח להציע רעיונות מותאמים!'
      }
    }

    // Default response
    return {
      content: selectedEvent
        ? `אני כאן לעזור עם "${selectedEvent.name}"! אתה יכול:\n\n` +
          `• להוסיף משתתפים או משימות\n` +
          `• לשאול על סטטוס האירוע\n` +
          `• לבקש רעיונות והמלצות\n` +
          `• לנהל את הלו"ז והתוכניה\n\n` +
          `מה תרצה לעשות?`
        : 'שלום! 👋 אני העוזר החכם של EventFlow.\n\n' +
          'כדי שאוכל לעזור לך בצורה הטובה ביותר, בחר אירוע מהתפריט הצדדי.\n\n' +
          'אחרי שתבחר אירוע, אוכל לעזור לך עם:\n' +
          '• הוספת משתתפים ומשימות\n' +
          '• ניהול הלו"ז\n' +
          '• שליחת הודעות\n' +
          '• ועוד הרבה!'
    }
  }

  // Execute action
  const executeAction = async (action: ChatMessage['action'], messageId: string) => {
    if (!action || !selectedEvent) return

    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, action: { ...m.action!, status: 'pending' as const } }
        : m
    ))

    try {
      switch (action.type) {
        case 'add_participant': {
          const names = action.data?.name?.split(' ') || ['חדש', 'משתתף']
          const { error: err1 } = await supabase.from('participants').insert({
            event_id: selectedEvent.id,
            first_name: names[0],
            last_name: names.slice(1).join(' ') || '',
            status: 'invited'
          })
          if (err1) throw err1
          addMessage('assistant', `✅ המשתתף "${action.data?.name}" נוסף בהצלחה לאירוע!`)
          refreshEvents()
          break
        }

        case 'add_checklist': {
          const { error: err2 } = await supabase.from('checklist_items').insert({
            event_id: selectedEvent.id,
            title: action.data?.title || 'משימה חדשה',
            status: 'pending',
            priority: 'medium'
          })
          if (err2) throw err2
          addMessage('assistant', `✅ המשימה נוספה בהצלחה!`)
          break
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, action: { ...m.action!, status: 'completed' as const } }
          : m
      ))
    } catch (error) {
      console.error('Action failed:', error)
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, action: { ...m.action!, status: 'failed' as const } }
          : m
      ))
      addMessage('assistant', '❌ מצטער, לא הצלחתי לבצע את הפעולה. נסה שוב.')
    }
  }

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    addMessage('user', userMessage)
    setIsLoading(true)

    try {
      const response = await getAIResponse(userMessage)
      addMessage('assistant', response.content, response.action)

      // If there's a pending action, ask for confirmation
      if (response.action?.status === 'pending') {
        // Auto-execute after a small delay for demo purposes
        // In production, you'd want explicit user confirmation
      }
    } catch (error) {
      addMessage('assistant', 'מצטער, משהו השתבש. נסה שוב.')
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  // Quick action handlers
  const handleQuickAddParticipant = () => {
    setInput('הוסף משתתף חדש')
    inputRef.current?.focus()
  }

  const handleQuickAddTask = () => {
    setInput('הוסף משימה חדשה')
    inputRef.current?.focus()
  }

  const handleQuickStatus = () => {
    setInput('מה הסטטוס של האירוע?')
    handleSend()
  }

  const handleQuickIdeas = () => {
    setInput('הצע לי רעיונות לאירוע')
    inputRef.current?.focus()
  }

  // Suggestion click handler
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }

  return (
    <div className="p-8 relative z-10">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative p-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-violet-400/80 text-sm font-medium mb-1">בינה מלאכותית</p>
          <h1 className="text-3xl font-bold text-white" data-testid="ai-title">עוזר AI</h1>
          <p className="text-zinc-400 mt-1">העוזר החכם שלך לתכנון אירועים</p>
        </div>

        {/* Chat Card */}
        <div className="max-w-4xl mx-auto">
          <div className="group relative bg-[#1a1d27] border border-white/10 rounded-2xl shadow-xl overflow-hidden" data-testid="ai-chat">
            {/* Gradient Header with Event Context */}
            <div className="relative bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#1a1d27]/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">EventFlow AI</h2>
                    <p className="text-white/80 text-sm">מומחה לתכנון והפקת אירועים</p>
                  </div>
                </div>

                {/* Event Context Badge */}
                {selectedEvent && (
                  <div className="bg-[#1a1d27]/30 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                    <p className="text-white/60 text-xs mb-0.5">אירוע פעיל</p>
                    <p className="text-white font-semibold flex items-center gap-2">
                      {selectedEvent.event_types?.icon && <span>{selectedEvent.event_types.icon}</span>}
                      {selectedEvent.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Decorative circles */}
              <div className="absolute top-4 left-4 w-20 h-20 bg-[#1a1d27]/10 rounded-full blur-xl" />
              <div className="absolute bottom-0 right-10 w-32 h-32 bg-[#1a1d27]/5 rounded-full blur-2xl" />
            </div>

            {/* Quick Actions Bar */}
            {selectedEvent && (
              <div className="px-6 py-3 bg-[#161922] border-b border-white/10 flex items-center gap-3 overflow-x-auto">
                <span className="text-xs text-zinc-500 whitespace-nowrap">פעולות מהירות:</span>
                <AIActionButton icon={UserPlus} label="הוסף משתתף" onClick={handleQuickAddParticipant} />
                <AIActionButton icon={CheckSquare} label="משימה חדשה" onClick={handleQuickAddTask} />
                <AIActionButton icon={PieChart} label="סטטוס" onClick={handleQuickStatus} />
                <AIActionButton icon={Target} label="רעיונות" onClick={handleQuickIdeas} />
              </div>
            )}

            {/* Chat History */}
            <div className="h-[400px] p-6 overflow-y-auto bg-[#161922]" data-testid="chat-history">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-violet-500/20 to-purple-500/15 rounded-2xl flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">התחל שיחה</h3>
                  <p className="text-zinc-400 max-w-sm mb-2">
                    {selectedEvent
                      ? `שאל אותי כל שאלה על האירוע "${selectedEvent.name}"`
                      : 'בחר אירוע מהתפריט כדי להתחיל'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-6 justify-center">
                    {(selectedEvent
                      ? ['מה הסטטוס של האירוע?', 'הוסף משתתף חדש', 'הצע רעיונות לאירוע', 'הוסף משימה לצ\'קליסט']
                      : ['מה אתה יכול לעשות?', 'איך מתחילים?', 'עזרה']
                    ).map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-2 bg-[#1a1d27] border border-violet-500/30 rounded-full text-sm text-violet-400 hover:bg-violet-500/10 hover:border-violet-400 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-violet-500/20 text-white'
                            : 'bg-[#1a1d27] border border-white/10 text-zinc-200'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>

                        {/* Action buttons for pending actions */}
                        {message.action?.status === 'pending' && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => executeAction(message.action, message.id)}
                              className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                            >
                              <CheckCircle size={14} />
                              אשר
                            </button>
                            <button
                              onClick={() => setMessages(prev => prev.map(m =>
                                m.id === message.id ? { ...m, action: undefined } : m
                              ))}
                              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-all flex items-center gap-1"
                            >
                              <XCircle size={14} />
                              בטל
                            </button>
                          </div>
                        )}

                        {message.action?.status === 'completed' && (
                          <div className="mt-2 flex items-center gap-1 text-emerald-400 text-xs">
                            <CheckCircle size={12} />
                            הפעולה בוצעה בהצלחה
                          </div>
                        )}

                        <div className="mt-1 text-[10px] text-zinc-500">
                          {message.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-end">
                      <div className="bg-[#1a1d27] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                        <span className="text-zinc-400 text-sm">חושב...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-[#1a1d27]/80">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                  placeholder={selectedEvent ? `שאל על "${selectedEvent.name}"...` : "בחר אירוע כדי להתחיל..."}
                  data-testid="ai-input"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  data-testid="ai-send-btn"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            </div>
          </div>

          {/* No Event Selected Warning */}
          {!selectedEvent && (
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <p className="text-amber-400 font-medium">לא נבחר אירוע</p>
                <p className="text-zinc-400 text-sm mt-1">
                  בחר אירוע מהתפריט הצדדי כדי שאוכל לעזור לך לנהל אותו - להוסיף משתתפים, משימות, לו"ז ועוד.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Feedback Page
// ═══════════════════════════════════════════════════════════════════════════

interface FeedbackSurvey {
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

// SurveyQuestion interface - for future question management
// interface SurveyQuestion {
//   id: string
//   survey_id: string
//   question_text: string
//   question_type: 'rating' | 'text' | 'multiple_choice' | 'yes_no'
//   options: string[] | null
//   is_required: boolean
//   sort_order: number
// }

interface SimpleEvent {
  id: string
  name: string
}

interface FeedbackResponse {
  id: string
  survey_id: string
  participant_id: string | null
  submitted_at: string
  answers: Record<string, string | number | boolean | string[] | null>
  participants?: { first_name: string; last_name: string }
}

interface SurveyFormData {
  title: string
  description: string
  event_id: string
  is_active: boolean
  anonymous: boolean
  starts_at: string
  ends_at: string
}

function FeedbackPage() {
  const [surveys, setSurveys] = useState<FeedbackSurvey[]>([])
  const [events, setEvents] = useState<SimpleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<FeedbackSurvey | null>(null)
  const [selectedSurvey, setSelectedSurvey] = useState<FeedbackSurvey | null>(null)
  const [responses, setResponses] = useState<FeedbackResponse[]>([])
  const [filterEventId, setFilterEventId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'list' | 'responses' | 'analytics'>('list')

  const emptyForm: SurveyFormData = {
    title: '',
    description: '',
    event_id: '',
    is_active: true,
    anonymous: false,
    starts_at: '',
    ends_at: ''
  }

  const [formData, setFormData] = useState<SurveyFormData>(emptyForm)

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('id, name').order('start_date', { ascending: false })
    if (data) setEvents(data)
  }

  async function fetchSurveys() {
    setLoading(true)
    let query = supabase
      .from('feedback_surveys')
      .select('*, events(name)')
      .order('created_at', { ascending: false })

    if (filterEventId) {
      query = query.eq('event_id', filterEventId)
    }

    const { data } = await query
    if (data) {
      // Fetch response counts for each survey
      const surveysWithCounts = await Promise.all(
        data.map(async (survey) => {
          const { count } = await supabase
            .from('feedback_responses')
            .select('*', { count: 'exact', head: true })
            .eq('survey_id', survey.id)
          return { ...survey, response_count: count || 0 }
        })
      )
      setSurveys(surveysWithCounts)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSurveys()
    fetchEvents()
  }, [])

  async function fetchResponses(surveyId: string) {
    const { data } = await supabase
      .from('feedback_responses')
      .select('*, participants(first_name, last_name)')
      .eq('survey_id', surveyId)
      .order('submitted_at', { ascending: false })
    if (data) setResponses(data)
  }

  useEffect(() => {
    fetchSurveys()
  }, [filterEventId])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  function openCreateModal() {
    setEditingSurvey(null)
    setFormData(emptyForm)
    setShowModal(true)
  }

  function openEditModal(survey: FeedbackSurvey) {
    setEditingSurvey(survey)
    setFormData({
      title: survey.title,
      description: survey.description || '',
      event_id: survey.event_id,
      is_active: survey.is_active,
      anonymous: survey.anonymous,
      starts_at: survey.starts_at ? survey.starts_at.split('T')[0] : '',
      ends_at: survey.ends_at ? survey.ends_at.split('T')[0] : ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const surveyData = {
      title: formData.title,
      description: formData.description || null,
      event_id: formData.event_id,
      is_active: formData.is_active,
      anonymous: formData.anonymous,
      starts_at: formData.starts_at ? `${formData.starts_at}T00:00:00` : null,
      ends_at: formData.ends_at ? `${formData.ends_at}T23:59:59` : null
    }

    if (editingSurvey) {
      await supabase.from('feedback_surveys').update(surveyData).eq('id', editingSurvey.id)
    } else {
      await supabase.from('feedback_surveys').insert([surveyData])
    }

    setShowModal(false)
    fetchSurveys()
  }

  async function deleteSurvey(id: string) {
    if (confirm('האם למחוק את הסקר? פעולה זו תמחק גם את כל התשובות.')) {
      await supabase.from('feedback_surveys').delete().eq('id', id)
      fetchSurveys()
    }
  }

  async function toggleSurveyActive(survey: FeedbackSurvey) {
    await supabase.from('feedback_surveys').update({ is_active: !survey.is_active }).eq('id', survey.id)
    fetchSurveys()
  }

  function viewSurveyResponses(survey: FeedbackSurvey) {
    setSelectedSurvey(survey)
    fetchResponses(survey.id)
    setViewMode('responses')
  }

  function viewSurveyAnalytics(survey: FeedbackSurvey) {
    setSelectedSurvey(survey)
    fetchResponses(survey.id)
    setViewMode('analytics')
  }

  // Calculate analytics for selected survey
  function calculateAnalytics() {
    if (responses.length === 0) return null

    const analytics: Record<string, { average?: number; distribution?: Record<string, number>; responses?: string[] }> = {}

    responses.forEach(response => {
      if (!response.answers) return
      Object.entries(response.answers).forEach(([questionId, answer]) => {
        if (!analytics[questionId]) {
          analytics[questionId] = { distribution: {}, responses: [] }
        }

        if (typeof answer === 'number') {
          // Rating question
          if (!analytics[questionId].average) {
            analytics[questionId].average = 0
          }
          analytics[questionId].distribution![answer.toString()] = (analytics[questionId].distribution![answer.toString()] || 0) + 1
        } else if (typeof answer === 'string') {
          // Text or choice question
          analytics[questionId].responses!.push(answer)
          analytics[questionId].distribution![answer] = (analytics[questionId].distribution![answer] || 0) + 1
        }
      })
    })

    // Calculate averages for rating questions
    Object.keys(analytics).forEach(questionId => {
      if (analytics[questionId].distribution) {
        const dist = analytics[questionId].distribution!
        let total = 0
        let count = 0
        Object.entries(dist).forEach(([rating, c]) => {
          const num = parseFloat(rating)
          if (!isNaN(num)) {
            total += num * c
            count += c
          }
        })
        if (count > 0) {
          analytics[questionId].average = total / count
        }
      }
    })

    return analytics
  }

  const stats = {
    total: surveys.length,
    active: surveys.filter(s => s.is_active).length,
    totalResponses: surveys.reduce((sum, s) => sum + (s.response_count || 0), 0),
    anonymous: surveys.filter(s => s.anonymous).length
  }

  return (
    <div className="p-8" data-testid="feedback-panel">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" data-testid="feedback-title">סקרי משוב</h1>
        {viewMode !== 'list' && (
          <button
            className="btn-secondary"
            onClick={() => {
              setViewMode('list')
              setSelectedSurvey(null)
            }}
          >
            ← חזרה לרשימה
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" data-testid="feedback-stats">
        <div className="premium-stats-card orange">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-zinc-400">סך הכל סקרים</p>
        </div>
        <div className="premium-stats-card green">
          <p className="text-2xl font-bold text-white">{stats.active}</p>
          <p className="text-zinc-400">סקרים פעילים</p>
        </div>
        <div className="premium-stats-card purple">
          <p className="text-2xl font-bold text-white">{stats.totalResponses}</p>
          <p className="text-zinc-400">סה"כ תשובות</p>
        </div>
        <div className="premium-stats-card">
          <p className="text-2xl font-bold text-zinc-400">{stats.anonymous}</p>
          <p className="text-zinc-400">סקרים אנונימיים</p>
        </div>
      </div>

      {viewMode === 'list' && (
        <>
          {/* Actions Bar */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button className="btn-primary flex items-center gap-2" onClick={openCreateModal} data-testid="add-survey-btn">
              <Plus className="w-4 h-4" />
              סקר חדש
            </button>
            <select
              className="input w-48"
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
              data-testid="survey-event-filter"
            >
              <option value="">כל האירועים</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          {/* Surveys List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12 text-zinc-400" data-testid="no-surveys">
              <FileQuestion className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">אין סקרים עדיין</p>
              <p className="text-sm">צור סקר משוב ראשון לאירוע</p>
            </div>
          ) : (
            <div className="grid gap-4" data-testid="surveys-list">
              {surveys.map(survey => (
                <div key={survey.id} className="card hover:shadow-md transition-shadow" data-testid="survey-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{survey.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          survey.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-400'
                        }`}>
                          {survey.is_active ? 'פעיל' : 'לא פעיל'}
                        </span>
                        {survey.anonymous && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                            אנונימי
                          </span>
                        )}
                      </div>
                      {survey.description && (
                        <p className="text-zinc-400 text-sm mb-2">{survey.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {survey.events?.name || 'ללא אירוע'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {survey.response_count} תשובות
                        </span>
                        {survey.starts_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            מ-{new Date(survey.starts_at).toLocaleDateString('he-IL')}
                          </span>
                        )}
                        {survey.ends_at && (
                          <span>
                            עד {new Date(survey.ends_at).toLocaleDateString('he-IL')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"
                        onClick={() => viewSurveyResponses(survey)}
                        title="צפייה בתשובות"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg"
                        onClick={() => viewSurveyAnalytics(survey)}
                        title="אנליטיקה"
                      >
                        <BarChart3 className="w-5 h-5" />
                      </button>
                      <button
                        className={`p-2 rounded-lg ${survey.is_active ? 'text-orange-400 hover:bg-orange-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                        onClick={() => toggleSurveyActive(survey)}
                        title={survey.is_active ? 'השבת' : 'הפעל'}
                      >
                        {survey.is_active ? <ThumbsDown className="w-5 h-5" /> : <ThumbsUp className="w-5 h-5" />}
                      </button>
                      <button
                        className="p-2 text-zinc-400 hover:bg-white/5 rounded-lg"
                        onClick={() => openEditModal(survey)}
                        title="עריכה"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-red-400 hover:bg-red-500/100/10 rounded-lg"
                        onClick={() => deleteSurvey(survey.id)}
                        title="מחיקה"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Responses View */}
      {viewMode === 'responses' && selectedSurvey && (
        <div data-testid="responses-view">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">תשובות לסקר: {selectedSurvey.title}</h2>
            <span className="text-zinc-400">{responses.length} תשובות</span>
          </div>
          {responses.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">אין תשובות עדיין</p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map(response => (
                <div key={response.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      {selectedSurvey.anonymous ? (
                        <span className="text-zinc-400">משתתף אנונימי</span>
                      ) : response.participants ? (
                        <span className="font-medium">{response.participants.first_name} {response.participants.last_name}</span>
                      ) : (
                        <span className="text-zinc-400">משתתף לא מזוהה</span>
                      )}
                    </div>
                    <span className="text-sm text-zinc-400">
                      {new Date(response.submitted_at).toLocaleString('he-IL')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {response.answers && Object.entries(response.answers).map(([questionId, answer]) => (
                      <div key={questionId} className="bg-white/5 p-3 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-1">שאלה: {questionId}</p>
                        <p className="font-medium">
                          {typeof answer === 'number' ? (
                            <span className="flex items-center gap-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < answer ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                              ))}
                              <span className="mr-2">{answer}/5</span>
                            </span>
                          ) : (
                            String(answer)
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics View */}
      {viewMode === 'analytics' && selectedSurvey && (
        <div data-testid="analytics-view">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">אנליטיקה: {selectedSurvey.title}</h2>
            <span className="text-zinc-400">{responses.length} תשובות</span>
          </div>
          {responses.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">אין נתונים לניתוח</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {(() => {
                const analytics = calculateAnalytics()
                if (!analytics) return null

                return Object.entries(analytics).map(([questionId, data]) => (
                  <div key={questionId} className="card">
                    <h3 className="font-medium mb-4">שאלה: {questionId}</h3>

                    {data.average !== undefined && (
                      <div className="mb-4">
                        <p className="text-3xl font-bold text-blue-600">{data.average.toFixed(1)}</p>
                        <p className="text-zinc-400">ממוצע דירוג</p>
                      </div>
                    )}

                    {data.distribution && Object.keys(data.distribution).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-zinc-400 mb-2">התפלגות תשובות:</p>
                        {Object.entries(data.distribution).map(([value, count]) => (
                          <div key={value} className="flex items-center gap-2">
                            <span className="w-20 text-sm">{value}</span>
                            <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(count / responses.length) * 100}%` }}
                              />
                            </div>
                            <span className="w-12 text-sm text-zinc-400">{count} ({Math.round((count / responses.length) * 100)}%)</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {data.responses && data.responses.length > 0 && !data.distribution && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-zinc-400 mb-2">תשובות טקסט:</p>
                        <ul className="space-y-1">
                          {data.responses.slice(0, 10).map((r, i) => (
                            <li key={i} className="text-sm bg-white/5 p-2 rounded">{r}</li>
                          ))}
                          {data.responses.length > 10 && (
                            <li className="text-sm text-zinc-400">...ועוד {data.responses.length - 10} תשובות</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-modal p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" data-testid="survey-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{editingSurvey ? 'עריכת סקר' : 'סקר חדש'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">כותרת הסקר *</label>
                <input
                  type="text"
                  name="title"
                  className="input w-full"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  data-testid="survey-title-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  name="description"
                  className="input w-full h-20"
                  value={formData.description}
                  onChange={handleInputChange}
                  data-testid="survey-description-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">אירוע *</label>
                <select
                  name="event_id"
                  className="input w-full"
                  value={formData.event_id}
                  onChange={handleInputChange}
                  required
                  data-testid="survey-event-select"
                >
                  <option value="">בחר אירוע...</option>
                  {events.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך התחלה</label>
                  <input
                    type="date"
                    name="starts_at"
                    className="input w-full"
                    value={formData.starts_at}
                    onChange={handleInputChange}
                    data-testid="survey-start-date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך סיום</label>
                  <input
                    type="date"
                    name="ends_at"
                    className="input w-full"
                    value={formData.ends_at}
                    onChange={handleInputChange}
                    data-testid="survey-end-date"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-white/20 rounded"
                  />
                  <span className="text-sm">סקר פעיל</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="anonymous"
                    checked={formData.anonymous}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-white/20 rounded"
                  />
                  <span className="text-sm">סקר אנונימי</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  ביטול
                </button>
                <button type="submit" className="btn-primary" data-testid="submit-survey-btn">
                  {editingSurvey ? 'שמור שינויים' : 'צור סקר'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Check-in Page
// ═══════════════════════════════════════════════════════════════════════════

interface CheckinParticipant extends Participant {
  qr_code?: string
}

function CheckinPage() {
  const [participants, setParticipants] = useState<CheckinParticipant[]>([])
  const [events, setEvents] = useState<SimpleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [scanMode, setScanMode] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [checkInResult, setCheckInResult] = useState<{ success: boolean; message: string; participant?: CheckinParticipant } | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked_in' | 'not_checked_in'>('all')

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('id, name').order('start_date', { ascending: false })
    if (data) {
      setEvents(data)
      if (data.length > 0) {
        setSelectedEventId(data[0].id)
      }
    }
    setLoading(false)
  }

  async function fetchParticipants() {
    setLoading(true)
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', selectedEventId)
      .order('last_name', { ascending: true })

    if (data) {
      // Generate QR codes for each participant
      const participantsWithQR = data.map(p => ({
        ...p,
        qr_code: `EF-${p.id.substring(0, 8).toUpperCase()}`
      }))
      setParticipants(participantsWithQR)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      fetchParticipants()
    }
  }, [selectedEventId])

  async function checkInParticipant(participantId: string) {
    const { error } = await supabase
      .from('participants')
      .update({
        status: 'checked_in',
        checked_in_at: new Date().toISOString()
      })
      .eq('id', participantId)

    if (error) {
      setCheckInResult({ success: false, message: 'שגיאה בצ\'ק-אין' })
    } else {
      const participant = participants.find(p => p.id === participantId)
      setCheckInResult({
        success: true,
        message: `${participant?.first_name} ${participant?.last_name} נרשם/ה בהצלחה!`,
        participant
      })
      fetchParticipants()
    }

    setTimeout(() => setCheckInResult(null), 3000)
  }

  async function handleManualCheckIn() {
    const code = manualCode.trim().toUpperCase()
    if (!code) return

    const participant = participants.find(p => p.qr_code === code)
    if (participant) {
      if (participant.status === 'checked_in') {
        setCheckInResult({ success: false, message: `${participant.first_name} ${participant.last_name} כבר נרשם/ה` })
      } else {
        await checkInParticipant(participant.id)
      }
    } else {
      setCheckInResult({ success: false, message: 'קוד לא תקין או לא נמצא' })
    }
    setManualCode('')
    setTimeout(() => setCheckInResult(null), 3000)
  }

  async function undoCheckIn(participantId: string) {
    const { error } = await supabase
      .from('participants')
      .update({
        status: 'confirmed',
        checked_in_at: null
      })
      .eq('id', participantId)

    if (!error) {
      fetchParticipants()
    }
  }

  // Filter participants
  const filteredParticipants = participants.filter(p => {
    const matchesSearch = searchTerm === '' ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm) ||
      p.qr_code?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'checked_in' && p.status === 'checked_in') ||
      (filterStatus === 'not_checked_in' && p.status !== 'checked_in')

    return matchesSearch && matchesStatus
  })

  // Calculate stats
  const stats = {
    total: participants.length,
    checkedIn: participants.filter(p => p.status === 'checked_in').length,
    pending: participants.filter(p => p.status !== 'checked_in').length,
    vip: participants.filter(p => p.is_vip).length
  }

  const checkInPercentage = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0

  return (
    <div className="p-8 relative z-10" data-testid="checkin-panel">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-cyan-400/80 text-sm font-medium mb-1">כניסת משתתפים</p>
            <h1 className="text-3xl font-bold text-white" data-testid="checkin-title">צ'ק-אין</h1>
            <p className="text-zinc-400 mt-1">ניהול הגעה וסריקת QR</p>
          </div>
          <button
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
              scanMode
                ? 'bg-[#1a1d27] border border-white/5 text-zinc-300 border border-white/10 hover:bg-white/5'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:-translate-y-0.5'
            }`}
            onClick={() => setScanMode(!scanMode)}
            data-testid="toggle-scan-mode"
          >
            <ScanLine className="w-4 h-4" />
            {scanMode ? 'חזרה לרשימה' : 'מצב סריקה'}
          </button>
        </div>

        {/* Event Selector */}
        <div className="mb-6">
          <select
            className="w-64 px-4 py-2.5 bg-[#1a1d27] border border-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            data-testid="checkin-event-select"
          >
            <option value="">בחר אירוע...</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" data-testid="checkin-stats">
          <div className="group relative premium-stats-card orange hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/15 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <p className="text-zinc-400 text-sm">סך הכל משתתפים</p>
          </div>

          <div className="group relative premium-stats-card orange hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-green-500/15 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-white">{stats.checkedIn}</p>
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">{checkInPercentage}%</div>
            </div>
            <p className="text-zinc-400 text-sm mb-2">נרשמו</p>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${checkInPercentage}%` }}
              />
            </div>
          </div>

          <div className="group relative premium-stats-card orange hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-400 to-amber-400 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-amber-500/15 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.pending}</p>
            </div>
            <p className="text-zinc-400 text-sm">ממתינים</p>
          </div>

          <div className="group relative premium-stats-card orange hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-400 to-violet-400 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-violet-500/15 rounded-xl flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.vip}</p>
            </div>
            <p className="text-zinc-400 text-sm">VIP</p>
          </div>
        </div>

        {/* Check-in Result Toast */}
        {checkInResult && (
          <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-2xl ${
            checkInResult.success ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'
          } text-white flex items-center gap-3`} data-testid="checkin-result">
            {checkInResult.success ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            <span className="text-lg font-medium">{checkInResult.message}</span>
          </div>
        )}

        {scanMode ? (
          /* Scan Mode */
          <div className="max-w-md mx-auto" data-testid="scan-mode">
            <div className="bg-[#1a1d27] border border-white/5 rounded-2xl p-8 border border-white/10 shadow-xl text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ScanLine className="w-12 h-12 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">סריקת QR קוד</h3>
              <p className="text-zinc-400 mb-6">סרוק את הברקוד או הזן ידנית</p>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all"
                  placeholder="EF-XXXXXXXX"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualCheckIn()}
                  data-testid="manual-code-input"
                />
                <button
                  className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                  onClick={handleManualCheckIn}
                  data-testid="manual-checkin-btn"
                >
                  <UserCheck className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-zinc-500">
                הזן את הקוד שמופיע על גבי הברקוד של המשתתף
              </p>
            </div>
          </div>
        ) : (
          /* List Mode */
          <>
            {/* Search and Filter */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <input
                  type="text"
                  className="w-full pr-10 pl-4 py-2.5 bg-[#1a1d27] border border-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all"
                  placeholder="חיפוש לפי שם, טלפון או קוד..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="checkin-search"
                />
              </div>
              <select
                className="w-40 px-4 py-2.5 bg-[#1a1d27] border border-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'checked_in' | 'not_checked_in')}
                data-testid="checkin-filter"
              >
                <option value="all">הכל</option>
                <option value="checked_in">נרשמו</option>
                <option value="not_checked_in">ממתינים</option>
              </select>
            </div>

            {/* Participants List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              </div>
            ) : !selectedEventId ? (
              <div className="bg-[#1a1d27] border border-white/5 rounded-2xl p-12 border border-white/10 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-zinc-500" />
                </div>
                <p className="text-lg text-zinc-400">בחר אירוע להתחלה</p>
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="bg-[#1a1d27] border border-white/5 rounded-2xl p-12 border border-white/10 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-zinc-500" />
                </div>
                <p className="text-lg text-zinc-400">אין משתתפים</p>
              </div>
            ) : (
              <div className="grid gap-3" data-testid="checkin-list">
                {filteredParticipants.map(participant => (
                  <div
                    key={participant.id}
                    className={`group bg-[#1a1d27] rounded-2xl p-4 border transition-all duration-300 flex items-center justify-between ${
                      participant.status === 'checked_in'
                        ? 'border-emerald-500/30 bg-gradient-to-l from-emerald-500/10 to-[#1a1d27]'
                        : 'border-white/10 hover:shadow-lg hover:-translate-y-0.5'
                    } ${participant.is_vip ? 'ring-2 ring-purple-500/30' : ''}`}
                    data-testid="checkin-participant-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        participant.status === 'checked_in'
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                          : 'bg-white/5 text-zinc-400 group-hover:bg-orange-500/10 group-hover:text-orange-400'
                      }`}>
                        {participant.status === 'checked_in' ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <User className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">
                            {participant.first_name} {participant.last_name}
                          </p>
                          {participant.is_vip && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                              VIP
                            </span>
                          )}
                          {participant.has_companion && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                              +מלווה
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-400">
                          <span>{participant.phone}</span>
                          <span className="font-mono text-xs bg-white/5 px-2 py-0.5 rounded-lg">
                            {participant.qr_code}
                          </span>
                        </div>
                        {participant.checked_in_at && (
                          <p className="text-xs text-emerald-400 mt-1">
                            נרשם ב-{new Date(participant.checked_in_at).toLocaleTimeString('he-IL')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {participant.status === 'checked_in' ? (
                        <button
                          className="px-4 py-2 bg-[#1a1d27]/80 text-zinc-400 text-sm rounded-xl border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all duration-300"
                          onClick={() => undoCheckIn(participant.id)}
                          title="בטל צ'ק-אין"
                        >
                          ביטול
                        </button>
                      ) : (
                        <button
                          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
                          onClick={() => checkInParticipant(participant.id)}
                          data-testid="checkin-btn"
                        >
                          <UserCheck className="w-4 h-4" />
                          צ'ק-אין
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Reports Page
// ═══════════════════════════════════════════════════════════════════════════

interface ReportStats {
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

function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [eventStats, setEventStats] = useState<{
    participants: { total: number; byStatus: Record<string, number> }
    checklist: { total: number; completed: number }
    vendors: number
    budget: number | null
  } | null>(null)

  async function fetchOverallStats() {
    setLoading(true)

    // Fetch all counts in parallel
    const [
      eventsRes,
      participantsRes,
      vendorsRes,
      checklistRes,
      messagesRes,
      surveysRes,
      responsesRes
    ] = await Promise.all([
      supabase.from('events').select('id, status, budget'),
      supabase.from('participants').select('id, status'),
      supabase.from('vendors').select('id', { count: 'exact', head: true }),
      supabase.from('checklist_items').select('id, is_completed'),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('feedback_surveys').select('id', { count: 'exact', head: true }),
      supabase.from('feedback_responses').select('id', { count: 'exact', head: true })
    ])

    const events = eventsRes.data || []
    const participants = participantsRes.data || []
    const checklistItems = checklistRes.data || []

    setStats({
      totalEvents: events.length,
      activeEvents: events.filter(e => e.status === 'active').length,
      completedEvents: events.filter(e => e.status === 'completed').length,
      totalParticipants: participants.length,
      checkedInParticipants: participants.filter(p => p.status === 'checked_in').length,
      totalVendors: vendorsRes.count || 0,
      totalBudget: events.reduce((sum, e) => sum + (e.budget || 0), 0),
      totalChecklistItems: checklistItems.length,
      completedChecklistItems: checklistItems.filter(c => c.is_completed).length,
      totalMessages: messagesRes.count || 0,
      totalSurveys: surveysRes.count || 0,
      totalResponses: responsesRes.count || 0
    })

    setLoading(false)
  }

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('*').order('start_date', { ascending: false })
    if (data) setEvents(data)
  }

  async function fetchEventStats() {
    if (!selectedEventId) return

    const [participantsRes, checklistRes, vendorsRes, eventRes] = await Promise.all([
      supabase.from('participants').select('id, status').eq('event_id', selectedEventId),
      supabase.from('checklist_items').select('id, is_completed').eq('event_id', selectedEventId),
      supabase.from('event_vendors').select('id', { count: 'exact', head: true }).eq('event_id', selectedEventId),
      supabase.from('events').select('budget').eq('id', selectedEventId).single()
    ])

    const participants = participantsRes.data || []
    const checklist = checklistRes.data || []

    const byStatus: Record<string, number> = {}
    participants.forEach(p => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1
    })

    setEventStats({
      participants: {
        total: participants.length,
        byStatus
      },
      checklist: {
        total: checklist.length,
        completed: checklist.filter(c => c.is_completed).length
      },
      vendors: vendorsRes.count || 0,
      budget: eventRes.data?.budget || null
    })
  }

  useEffect(() => {
    fetchOverallStats()
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      fetchEventStats()
    } else {
      setEventStats(null)
    }
  }, [selectedEventId])

  async function exportReport() {
    if (!stats) return

    const reportData = [
      ['EventFlow AI - דוח סיכום'],
      [''],
      ['תאריך הפקה', new Date().toLocaleDateString('he-IL')],
      [''],
      ['סיכום כללי'],
      ['סך הכל אירועים', stats.totalEvents],
      ['אירועים פעילים', stats.activeEvents],
      ['אירועים שהושלמו', stats.completedEvents],
      [''],
      ['משתתפים'],
      ['סך הכל משתתפים', stats.totalParticipants],
      ['נרשמו (Check-in)', stats.checkedInParticipants],
      [''],
      ['ספקים'],
      ['סך הכל ספקים', stats.totalVendors],
      [''],
      ['תקציב'],
      ['תקציב כולל', `₪${stats.totalBudget.toLocaleString()}`],
      [''],
      ['משימות'],
      ['סך הכל משימות', stats.totalChecklistItems],
      ['משימות שהושלמו', stats.completedChecklistItems],
      [''],
      ['תקשורת'],
      ['סך הכל הודעות', stats.totalMessages],
      [''],
      ['משוב'],
      ['סך הכל סקרים', stats.totalSurveys],
      ['סך הכל תשובות', stats.totalResponses]
    ]

    const ws = XLSX.utils.aoa_to_sheet(reportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'דוח סיכום')
    XLSX.writeFile(wb, `eventflow-report-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const checklistPercentage = stats && stats.totalChecklistItems > 0
    ? Math.round((stats.completedChecklistItems / stats.totalChecklistItems) * 100)
    : 0

  const checkinPercentage = stats && stats.totalParticipants > 0
    ? Math.round((stats.checkedInParticipants / stats.totalParticipants) * 100)
    : 0

  return (
    <div className="p-8" data-testid="reports-panel">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" data-testid="reports-title">דוחות</h1>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={exportReport}
          disabled={!stats}
          data-testid="export-report-btn"
        >
          <Download className="w-4 h-4" />
          ייצא לאקסל
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      ) : stats && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.totalEvents}</p>
                  <p className="text-blue-100">אירועים</p>
                </div>
                <Calendar className="w-10 h-10 text-blue-200" />
              </div>
              <div className="mt-2 text-sm">
                <span className="text-green-300">{stats.activeEvents} פעילים</span>
                <span className="mx-2">•</span>
                <span className="text-blue-200">{stats.completedEvents} הושלמו</span>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.totalParticipants}</p>
                  <p className="text-purple-100">משתתפים</p>
                </div>
                <Users className="w-10 h-10 text-purple-200" />
              </div>
              <div className="mt-2">
                <div className="h-2 bg-purple-400 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1a1d27] rounded-full"
                    style={{ width: `${checkinPercentage}%` }}
                  />
                </div>
                <p className="text-sm mt-1">{checkinPercentage}% נרשמו</p>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">₪{stats.totalBudget.toLocaleString()}</p>
                  <p className="text-green-100">תקציב כולל</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-200" />
              </div>
              <div className="mt-2 text-sm">
                <span>{stats.totalVendors} ספקים פעילים</span>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.totalChecklistItems}</p>
                  <p className="text-orange-100">משימות</p>
                </div>
                <CheckSquare className="w-10 h-10 text-orange-200" />
              </div>
              <div className="mt-2">
                <div className="h-2 bg-orange-400 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1a1d27] rounded-full"
                    style={{ width: `${checklistPercentage}%` }}
                  />
                </div>
                <p className="text-sm mt-1">{checklistPercentage}% הושלמו</p>
              </div>
            </div>
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card" data-testid="communication-stats">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                תקשורת
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">הודעות נשלחו</span>
                  <span className="font-bold">{stats.totalMessages}</span>
                </div>
              </div>
            </div>

            <div className="card" data-testid="feedback-stats">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-purple-500" />
                משוב
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">סקרים פעילים</span>
                  <span className="font-bold">{stats.totalSurveys}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">תשובות התקבלו</span>
                  <span className="font-bold">{stats.totalResponses}</span>
                </div>
              </div>
            </div>

            <div className="card" data-testid="checkin-stats">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-500" />
                צ'ק-אין
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">נרשמו</span>
                  <span className="font-bold text-emerald-400">{stats.checkedInParticipants}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">ממתינים</span>
                  <span className="font-bold text-orange-400">{stats.totalParticipants - stats.checkedInParticipants}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Event-specific Report */}
          <div className="card" data-testid="event-report">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              דוח לפי אירוע
            </h3>
            <div className="mb-4">
              <select
                className="input w-64"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                data-testid="report-event-select"
              >
                <option value="">בחר אירוע...</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            {eventStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{eventStats.participants.total}</p>
                  <p className="text-zinc-400">משתתפים</p>
                  <div className="mt-2 text-xs space-y-1">
                    {Object.entries(eventStats.participants.byStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span>{status}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-400">
                    {eventStats.checklist.total > 0
                      ? Math.round((eventStats.checklist.completed / eventStats.checklist.total) * 100)
                      : 0}%
                  </p>
                  <p className="text-zinc-400">צ'קליסט הושלם</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    {eventStats.checklist.completed}/{eventStats.checklist.total} משימות
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{eventStats.vendors}</p>
                  <p className="text-zinc-400">ספקים מקושרים</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-orange-400">
                    {eventStats.budget ? `₪${eventStats.budget.toLocaleString()}` : 'לא הוגדר'}
                  </p>
                  <p className="text-zinc-400">תקציב</p>
                </div>
              </div>
            )}

            {!selectedEventId && (
              <p className="text-zinc-400 text-center py-4">בחר אירוע לצפייה בדוח מפורט</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Reminder Settings Page (per-event reminder configuration)
// ═══════════════════════════════════════════════════════════════════════════

function ReminderSettingsPage() {
  const { selectedEvent: event, loading } = useEvent()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <Zap className="mx-auto mb-4" size={48} />
        <p className="text-lg">לא נבחר אירוע</p>
        <p className="text-sm mt-2">בחר אירוע מהרשימה כדי לנהל הגדרות תזכורות</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">הגדרות תזכורות — {event.name}</h1>
      <EventSettingsPanel event={event} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Event Detail Page with Program Builder
// ═══════════════════════════════════════════════════════════════════════════

function EventDetailPage({ initialTab = 'overview' }: { initialTab?: string }) {
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

  // Toast State
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({
    show: false, message: '', type: 'success'
  })

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
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
  }, [eventId])

  // Load program data when switching to program tab
  useEffect(() => {
    if (activeTab === 'program' && eventId) {
      loadProgramData()
    }
  }, [activeTab, eventId])

  function checkForConflicts(sessionsList: ExtendedSchedule[]) {
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
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Navigation Sidebar (Legacy - replaced by imported event-aware Sidebar)
// ═══════════════════════════════════════════════════════════════════════════

// The Sidebar is now imported from ./components/layout/Sidebar
// and supports event-aware navigation

// ═══════════════════════════════════════════════════════════════════════════
// Main App Layout (with Sidebar)
// ═══════════════════════════════════════════════════════════════════════════

function AppLayout() {
  return (
    <div className="flex" dir="rtl" data-testid="app-container">
      <Sidebar />
      <main className="flex-1 min-h-screen" data-testid="main-content">
        <Routes>
          {/* Home - Event Selection */}
          <Route path="/" element={<HomePage />} />

          {/* Event Creation/Editing */}
          <Route path="/events/new" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/events/:eventId/program" element={<EventDetailPage initialTab="program" />} />
          <Route path="/event/edit" element={<EventDetailPage />} />

          {/* Event-Scoped Routes (require selected event) */}
          <Route path="/event/dashboard" element={<EventDashboardPage />} />
          <Route path="/event/guests" element={<GuestsPage />} />
          <Route path="/event/schedule" element={<SchedulesPage />} />
          <Route path="/event/program" element={<ProgramManagementPage />} />
          <Route path="/event/vendors" element={<VendorsPage />} />
          <Route path="/event/checklist" element={<ChecklistPage />} />
          <Route path="/event/messages" element={<MessagesPage />} />
          <Route path="/event/feedback" element={<FeedbackPage />} />
          <Route path="/event/checkin" element={<CheckinPage />} />
          <Route path="/event/reports" element={<ReportsPage />} />
          <Route path="/event/reminder-settings" element={<ReminderSettingsPage />} />

          {/* Global Routes (no event required) */}
          <Route path="/ai" element={<AIAssistantPage />} />
          <Route path="/settings" element={<DashboardPage />} />
          <Route path="/admin/test-whatsapp" element={<TestWhatsAppPage />} />

          {/* Legacy routes - redirect to home */}
          <Route path="/events" element={<HomePage />} />
          <Route path="/guests" element={<HomePage />} />
          <Route path="/schedules" element={<HomePage />} />
          <Route path="/program" element={<HomePage />} />
          <Route path="/vendors" element={<HomePage />} />
          <Route path="/checklist" element={<HomePage />} />
          <Route path="/messages" element={<HomePage />} />
          <Route path="/feedback" element={<HomePage />} />
          <Route path="/checkin" element={<HomePage />} />
          <Route path="/reports" element={<HomePage />} />
        </Routes>
      </main>

      {/* Floating AI Chat */}
      <FloatingChat />
    </div>
  )
}

// Main App with Auth Routes
// ═══════════════════════════════════════════════════════════════════════════

export default function App() {
  const location = useLocation()
  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(location.pathname)

  // Auth pages - full screen without sidebar
  if (isAuthPage) {
    return (
      <div dir="rtl">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
      </div>
    )
  }

  // Main app with sidebar
  return <AppLayout />
}
