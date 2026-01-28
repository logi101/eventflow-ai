import { useState, useEffect } from 'react'
import { Search, Calendar, Users, User, ScanLine, UserCheck, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CheckinParticipant, SimpleEvent } from '../../types'

export function CheckinPage() {
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
    <div className="p-8" data-testid="checkin-panel">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" data-testid="checkin-title">צ'ק-אין</h1>
        <button
          className={`btn-${scanMode ? 'secondary' : 'primary'} flex items-center gap-2`}
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
          className="input w-64"
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
        <div className="card bg-blue-50">
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-gray-600">סך הכל משתתפים</p>
        </div>
        <div className="card bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.checkedIn}</p>
              <p className="text-gray-600">נרשמו</p>
            </div>
            <div className="text-3xl font-bold text-green-500">{checkInPercentage}%</div>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${checkInPercentage}%` }}
            />
          </div>
        </div>
        <div className="card bg-orange-50">
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          <p className="text-gray-600">ממתינים</p>
        </div>
        <div className="card bg-purple-50">
          <p className="text-2xl font-bold text-purple-600">{stats.vip}</p>
          <p className="text-gray-600">VIP</p>
        </div>
      </div>

      {/* Check-in Result Toast */}
      {checkInResult && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-lg ${
          checkInResult.success ? 'bg-green-500' : 'bg-red-500'
        } text-white flex items-center gap-3`} data-testid="checkin-result">
          {checkInResult.success ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
          <span className="text-lg font-medium">{checkInResult.message}</span>
        </div>
      )}

      {scanMode ? (
        /* Scan Mode */
        <div className="max-w-md mx-auto" data-testid="scan-mode">
          <div className="card text-center">
            <ScanLine className="w-24 h-24 mx-auto mb-4 text-blue-500" />
            <p className="text-lg mb-4">סרוק QR קוד או הזן ידנית</p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                className="input flex-1 text-center font-mono text-lg"
                placeholder="EF-XXXXXXXX"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleManualCheckIn()}
                data-testid="manual-code-input"
              />
              <button
                className="btn-primary"
                onClick={handleManualCheckIn}
                data-testid="manual-checkin-btn"
              >
                <UserCheck className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500">
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
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                className="input w-full pr-10"
                placeholder="חיפוש לפי שם, טלפון או קוד..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="checkin-search"
              />
            </div>
            <select
              className="input w-40"
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
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : !selectedEventId ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">בחר אירוע להתחלה</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">אין משתתפים</p>
            </div>
          ) : (
            <div className="grid gap-3" data-testid="checkin-list">
              {filteredParticipants.map(participant => (
                <div
                  key={participant.id}
                  className={`card hover:shadow-md transition-all flex items-center justify-between ${
                    participant.status === 'checked_in' ? 'border-r-4 border-green-500 bg-green-50' : ''
                  } ${participant.is_vip ? 'ring-2 ring-purple-300' : ''}`}
                  data-testid="checkin-participant-card"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      participant.status === 'checked_in'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {participant.status === 'checked_in' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <User className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {participant.first_name} {participant.last_name}
                        </p>
                        {participant.is_vip && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            VIP
                          </span>
                        )}
                        {participant.has_companion && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            +מלווה
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{participant.phone}</span>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {participant.qr_code}
                        </span>
                      </div>
                      {participant.checked_in_at && (
                        <p className="text-xs text-green-600">
                          נרשם ב-{new Date(participant.checked_in_at).toLocaleTimeString('he-IL')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {participant.status === 'checked_in' ? (
                      <button
                        className="btn-secondary text-sm"
                        onClick={() => undoCheckIn(participant.id)}
                        title="בטל צ'ק-אין"
                      >
                        ביטול
                      </button>
                    ) : (
                      <button
                        className="btn-primary flex items-center gap-2"
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
  )
}
