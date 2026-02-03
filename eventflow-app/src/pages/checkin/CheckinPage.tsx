import { useState, useEffect } from 'react'
import { ScanLine, CheckCircle, XCircle, UserCheck, Search, Loader2, Users, Clock, Star, Calendar, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CheckinParticipant, SimpleEvent } from '../../types'
import { useEvent } from '../../contexts/EventContext'
import {
  cacheParticipants,
  getCachedParticipants,
  clearExpiredCache,
} from '../../modules/checkin/db'

export function CheckinPage() {
  const { selectedEvent: contextEvent } = useEvent()
  const [participants, setParticipants] = useState<CheckinParticipant[]>([])
  const [events, setEvents] = useState<SimpleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string>(contextEvent?.id || '')
  const [searchTerm, setSearchTerm] = useState('')
  const [scanMode, setScanMode] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [checkInResult, setCheckInResult] = useState<{ success: boolean; message: string; participant?: CheckinParticipant } | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked_in' | 'not_checked_in'>('all')



  // Sync with EventContext when selected event changes
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (contextEvent && selectedEventId !== contextEvent.id) {
        setSelectedEventId(contextEvent.id)
      }
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextEvent])

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('id, name').order('start_date', { ascending: false })
    if (data) {
      setEvents(data)
      // Only fallback to first event if no event selected from context
      if (!selectedEventId && data.length > 0) {
        setSelectedEventId(data[0].id)
      }
    }
    setLoading(false)
  }

  async function fetchParticipants() {
    setLoading(true)

    // Clear expired cache on each load
    await clearExpiredCache()

    // Try online first
    if (navigator.onLine) {
      try {
        const { data } = await supabase
          .from('participants')
          .select('*')
          .eq('event_id', selectedEventId)
          .order('last_name', { ascending: true })

        if (data) {
          // Generate QR codes and cache
          const participantsWithQR = data.map(p => ({
            ...p,
            qr_code: `EF-${p.id.substring(0, 8).toUpperCase()}`
          }))

          // Cache for offline use
          const now = new Date()
          await cacheParticipants(
            participantsWithQR.map(p => ({
              id: p.id,
              eventId: p.event_id,
              firstName: p.first_name,
              lastName: p.last_name,
              phone: p.phone,
              status: p.status,
              isVip: p.is_vip || false,
              hasCompanion: p.has_companion || false,
              qrCode: p.qr_code,
              cachedAt: now,
              expiresAt: now
            })),
            selectedEventId
          )

          setParticipants(participantsWithQR)
          setLoading(false)
          return
        }
      } catch (e) {
        console.warn('[CheckIn] Online fetch failed, trying cache:', e)
      }
    }

    // Fallback to cached data
    const cached = await getCachedParticipants(selectedEventId)
    if (cached.length > 0) {
      // Convert cached format back to component format
      const participantsFromCache = cached.map(p => ({
        id: p.id,
        event_id: p.eventId,
        first_name: p.firstName,
        last_name: p.lastName,
        phone: p.phone,
        status: p.status,
        is_vip: p.isVip,
        has_companion: p.hasCompanion,
        qr_code: p.qrCode
      }))
      setParticipants(participantsFromCache as CheckinParticipant[])
    } else {
      setParticipants([])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      fetchParticipants()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Undo only works when online (prevents sync conflicts)
    if (!navigator.onLine) {
      setCheckInResult({
        success: false,
        message: 'ביטול צ\'ק-אין זמין רק במצב מקוון'
      })
      setTimeout(() => setCheckInResult(null), 3000)
      return
    }

    const { error } = await supabase
      .from('participants')
      .update({
        status: 'confirmed',
        checked_in_at: null
      })
      .eq('id', participantId)

    if (error) {
      setCheckInResult({
        success: false,
        message: 'שגיאה בביטול צ\'ק-אין'
      })
    } else {
      // Update local state
      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId
            ? { ...p, status: 'confirmed', checked_in_at: null }
            : p
        )
      )

      // Also update cache
    }

    setTimeout(() => setCheckInResult(null), 3000)
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
