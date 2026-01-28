import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Send, Loader2, CheckCircle, AlertCircle, Users, Calendar, Building, Phone } from 'lucide-react'

interface ParticipantTrack {
  tracks?: { name: string }[]
}

interface ParticipantRoom {
  room_number?: string
  building?: string
  floor?: string
}

interface TestParticipant {
  id: string
  first_name: string
  last_name: string
  phone: string
  track?: string
  room_number?: string
  building?: string
  floor?: string
  participant_tracks?: ParticipantTrack[]
  participant_rooms?: ParticipantRoom[]
}

interface Schedule {
  id: string
  title: string
  start_time: string
  end_time: string
  track?: string
  location?: string
  room?: string
}

export function TestWhatsAppPage() {
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [participants, setParticipants] = useState<TestParticipant[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [logs, setLogs] = useState<{ message: string; success: boolean; time: string }[]>([])
  const [testPhone, setTestPhone] = useState('972504394292')

  const hebrewFirstNames = ['דוד', 'משה', 'יעקב', 'אברהם', 'יצחק', 'שרה', 'רבקה', 'לאה', 'רחל', 'מרים']

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      loadEventData()
    }
  }, [selectedEventId])

  async function loadEvents() {
    const { data } = await supabase
      .from('events')
      .select('id, name')
      .order('created_at', { ascending: false })

    if (data) {
      setEvents(data)
      // Try to find the test event
      const testEvent = data.find(e => e.name.includes('בדיקה') || e.name.includes('מבחן'))
      if (testEvent) {
        setSelectedEventId(testEvent.id)
      } else if (data.length > 0) {
        setSelectedEventId(data[0].id)
      }
    }
  }

  async function loadEventData() {
    setLoading(true)

    // Load participants with rooms
    const { data: participantsData } = await supabase
      .from('participants')
      .select(`
        id, first_name, last_name, phone,
        participant_rooms(room_number, building, floor),
        participant_tracks(tracks(name))
      `)
      .eq('event_id', selectedEventId)

    if (participantsData) {
      const mapped = participantsData.map(p => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
        track: p.participant_tracks?.[0]?.tracks?.[0]?.name,
        room_number: p.participant_rooms?.[0]?.room_number,
        building: p.participant_rooms?.[0]?.building,
        floor: p.participant_rooms?.[0]?.floor
      }))
      setParticipants(mapped)
    }

    // Load schedules
    const { data: schedulesData } = await supabase
      .from('schedules')
      .select('*')
      .eq('event_id', selectedEventId)
      .order('start_time', { ascending: true })

    if (schedulesData) {
      setSchedules(schedulesData)
    }

    setLoading(false)
  }

  function addLog(message: string, success: boolean) {
    setLogs(prev => [{
      message,
      success,
      time: new Date().toLocaleTimeString('he-IL')
    }, ...prev])
  }

  async function createTestData() {
    setLoading(true)
    addLog('מתחיל ליצור נתוני בדיקה...', true)

    try {
      // 1. Use existing event or first available
      let eventId = selectedEventId
      if (!eventId) {
        // Get first available event
        const { data: existingEvents } = await supabase
          .from('events')
          .select('id, name')
          .limit(1)
          .single()

        if (existingEvents) {
          eventId = existingEvents.id
          setSelectedEventId(eventId)
          addLog(`משתמש באירוע קיים: ${existingEvents.name}`, true)
        } else {
          throw new Error('אין אירועים במערכת - יש ליצור אירוע קודם')
        }
      } else {
        addLog(`משתמש באירוע נבחר`, true)
      }

      // 2. Check for existing participants and update them
      const { data: existingParticipants } = await supabase
        .from('participants')
        .select('id, first_name')
        .eq('event_id', eventId)

      if (existingParticipants && existingParticipants.length > 0) {
        addLog(`נמצאו ${existingParticipants.length} משתתפים קיימים - מעדכן...`, true)

        // Update all participants to have last name "בדיקה" and the test phone
        const { error: updateError } = await supabase
          .from('participants')
          .update({ last_name: 'בדיקה', phone: testPhone })
          .eq('event_id', eventId)

        if (updateError) {
          addLog(`שגיאה בעדכון: ${updateError.message}`, false)
        } else {
          addLog(`עודכנו כל המשתתפים: שם משפחה="בדיקה", טלפון=${testPhone}`, true)
        }
      } else {
        // No participants - create new ones
        addLog('אין משתתפים - יוצר חדשים...', true)

        const participantsToCreate = hebrewFirstNames.map((name, i) => ({
          event_id: eventId,
          first_name: name,
          last_name: 'בדיקה',
          phone: testPhone,
          email: `test${i}@example.com`,
          status: 'confirmed' as const
        }))

        const { data: createdParticipants, error: partError } = await supabase
          .from('participants')
          .insert(participantsToCreate)
          .select()

        if (partError) {
          addLog(`שגיאה ביצירת משתתפים: ${partError.message}`, false)
        } else if (createdParticipants) {
          addLog(`נוצרו ${createdParticipants.length} משתתפים`, true)

          // Assign rooms to new participants
          const roomsToCreate = createdParticipants.map((p, i) => ({
            participant_id: p.id,
            event_id: eventId,
            room_number: `${100 + i}`,
            building: i < 5 ? 'בניין א׳' : 'בניין ב׳',
            floor: `${Math.floor(i / 3) + 1}`,
            room_type: 'standard',
            is_confirmed: true
          }))

          await supabase.from('participant_rooms').insert(roomsToCreate)
          addLog('הוקצו חדרים למשתתפים', true)
        }
      }

      // Skip the rest since we're working with existing data
      addLog('הסתיים בהצלחה! טוען נתונים...', true)
      await loadEventData()

    } catch (err: any) {
      addLog(`שגיאה: ${err.message}`, false)
      console.error(err)
    }

    setLoading(false)
  }

  function generateMessage(participant: TestParticipant, schedule: Schedule): string {
    const startTime = new Date(schedule.start_time).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    })

    let message = `שלום ${participant.first_name} ${participant.last_name}! 👋\n\n`
    message += `🔔 *תזכורת לפעילות הבאה:*\n\n`
    message += `📌 *${schedule.title}*\n`
    message += `🕐 שעה: ${startTime}\n`

    if (schedule.location) {
      message += `📍 מיקום: ${schedule.location}\n`
    }
    if (schedule.room) {
      message += `🚪 חדר פעילות: ${schedule.room}\n`
    }

    // Add participant's room
    if (participant.room_number) {
      message += `\n🏨 *החדר שלך:*\n`
      message += `🚪 חדר: ${participant.room_number}\n`
      if (participant.building) {
        message += `🏢 בניין: ${participant.building}\n`
      }
      if (participant.floor) {
        message += `📍 קומה: ${participant.floor}\n`
      }
    }

    if (participant.track) {
      message += `\n🎯 המסלול שלך: ${participant.track}\n`
    }

    message += `\nנתראה שם! 🎉`

    return message
  }

  async function sendTestMessages() {
    if (participants.length === 0 || schedules.length === 0) {
      addLog('אין משתתפים או לו"ז לשליחה', false)
      return
    }

    setSending(true)
    addLog(`מתחיל לשלוח ${participants.length} הודעות WhatsApp...`, true)

    let successCount = 0
    let failCount = 0

    for (const participant of participants) {
      // Find the next schedule for this participant (based on their track)
      const relevantSchedule = schedules.find(s =>
        s.track === 'כללי' ||
        s.track?.includes(participant.track?.split(' ')[1] || '')
      ) || schedules[0]

      const message = generateMessage(participant, relevantSchedule)

      try {
        // Get organization_id from the event
        const { data: eventData } = await supabase
          .from('events')
          .select('organization_id')
          .eq('id', selectedEventId)
          .single()

        const { error } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            organization_id: eventData?.organization_id,
            phone: participant.phone,
            message
          }
        })

        if (error) {
          throw error
        }

        successCount++
        addLog(`✓ נשלחה הודעה ל-${participant.first_name} ${participant.last_name}`, true)

        // Log in messages table
        await supabase.from('messages').insert({
          event_id: selectedEventId,
          participant_id: participant.id,
          channel: 'whatsapp',
          to_phone: participant.phone,
          content: message,
          status: 'sent',
          sent_at: new Date().toISOString()
        })

      } catch (err: any) {
        failCount++
        addLog(`✗ נכשלה שליחה ל-${participant.first_name}: ${err.message}`, false)
      }

      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    addLog(`סה"כ: ${successCount} הצליחו, ${failCount} נכשלו`, successCount > failCount)
    setSending(false)
  }

  async function updateParticipantsLastName() {
    setLoading(true)
    addLog('מעדכן שמות משפחה ל"בדיקה"...', true)

    try {
      const { error } = await supabase
        .from('participants')
        .update({ last_name: 'בדיקה' })
        .eq('event_id', selectedEventId)

      if (error) throw error

      addLog('עודכנו כל שמות המשפחה ל"בדיקה"', true)
      await loadEventData()
    } catch (err: any) {
      addLog(`שגיאה: ${err.message}`, false)
    }

    setLoading(false)
  }

  async function updateAllPhones() {
    setLoading(true)
    addLog(`מעדכן כל מספרי הטלפון ל-${testPhone}...`, true)

    try {
      const { error } = await supabase
        .from('participants')
        .update({ phone: testPhone })
        .eq('event_id', selectedEventId)

      if (error) throw error

      addLog('עודכנו כל מספרי הטלפון', true)
      await loadEventData()
    } catch (err: any) {
      addLog(`שגיאה: ${err.message}`, false)
    }

    setLoading(false)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          <Phone className="w-8 h-8 inline ml-3 text-green-600" />
          בדיקת WhatsApp
        </h1>
        <p className="text-gray-600">יצירת נתוני בדיקה ושליחת הודעות WhatsApp</p>
      </div>

      {/* Config */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="font-bold text-lg mb-4">הגדרות</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אירוע</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">בחר אירוע</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מספר טלפון לבדיקה</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="972504394292"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="font-bold text-lg mb-4">פעולות</h2>

          <div className="space-y-3">
            <button
              onClick={createTestData}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
              צור נתוני בדיקה חדשים
            </button>

            <button
              onClick={updateParticipantsLastName}
              disabled={loading || !selectedEventId}
              className="w-full px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              עדכן שם משפחה ל"בדיקה"
            </button>

            <button
              onClick={updateAllPhones}
              disabled={loading || !selectedEventId}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              עדכן כל הטלפונים ל-{testPhone}
            </button>

            <button
              onClick={sendTestMessages}
              disabled={sending || participants.length === 0}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              שלח {participants.length} הודעות WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Data Display */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Participants */}
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            משתתפים ({participants.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : participants.length === 0 ? (
            <p className="text-gray-500 text-center py-8">אין משתתפים</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {participants.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{p.first_name} {p.last_name}</p>
                    <p className="text-sm text-gray-500">{p.phone}</p>
                  </div>
                  <div className="text-left text-sm">
                    {p.track && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{p.track}</span>}
                    {p.room_number && (
                      <span className="mr-2 px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                        חדר {p.room_number}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedules */}
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            לו"ז ({schedules.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : schedules.length === 0 ? (
            <p className="text-gray-500 text-center py-8">אין לו"ז</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {schedules.map(s => (
                <div key={s.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(s.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {new Date(s.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    {s.track && ` | ${s.track}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Preview */}
      {participants.length > 0 && schedules.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border mb-6">
          <h2 className="font-bold text-lg mb-4">תצוגה מקדימה של הודעה</h2>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <pre className="whitespace-pre-wrap text-sm font-sans" dir="rtl">
              {generateMessage(participants[0], schedules[0])}
            </pre>
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="bg-gray-900 rounded-xl p-6 text-white">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Building className="w-5 h-5" />
          לוג פעולות
        </h2>

        <div className="space-y-2 max-h-[300px] overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-400">ממתין לפעולות...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                {log.success ? (
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <span className="text-gray-400 flex-shrink-0">[{log.time}]</span>
                <span className={log.success ? 'text-green-300' : 'text-red-300'}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
