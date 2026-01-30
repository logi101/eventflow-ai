// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Guests Page (extracted from App.tsx)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { Users, Edit2, Trash2, X, Loader2, Upload, Download, Search, UserPlus, Star, Phone, Mail } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'
import type { Participant, ParticipantFormData, ParticipantStatus } from '../../types'
import { getParticipantStatusColor, getParticipantStatusLabel, normalizePhone } from '../../utils'
import { useEvent } from '../../contexts/EventContext'

export function GuestsPage() {
  const { selectedEvent } = useEvent()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string>(selectedEvent?.id || '')
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

  // Sync with EventContext when selected event changes
  useEffect(() => {
    if (selectedEvent && selectedEventId !== selectedEvent.id) {
      setSelectedEventId(selectedEvent.id)
    }
  }, [selectedEvent])

  useEffect(() => {
    fetchEvents()
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
    if (!selectedEventId) {
      setParticipants([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('participants')
        .select(`*, events (name)`)
        .eq('event_id', selectedEventId)
        .order('created_at', { ascending: false })

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
              <option value="">בחר אירוע</option>
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
                className="group bg-[#1a1d27] border border-white/5 rounded-2xl border border-white/10 p-5 hover:bg-[#1a1d27] hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                data-testid={`guest-card-${participant.id}`}
                onClick={() => openEditModal(participant)}
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
                      {participant.events && !selectedEventId && (
                        <p className="text-xs text-zinc-500 mt-1.5 bg-white/5 inline-block px-2 py-0.5 rounded-md">{participant.events.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-all duration-200 hover:scale-105"
                      onClick={() => openEditModal(participant)}
                      title="עריכה"
                    >
                      <Edit2 size={16} className="text-blue-400" />
                      <span className="text-sm text-blue-400 font-medium">עריכה</span>
                    </button>
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all duration-200 hover:scale-105"
                      onClick={() => handleDelete(participant)}
                      title="מחיקה"
                    >
                      <Trash2 size={16} className="text-red-400" />
                      <span className="text-sm text-red-400 font-medium">מחיקה</span>
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
