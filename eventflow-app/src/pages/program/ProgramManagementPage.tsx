import { useState, useEffect, useRef } from 'react'
import { Upload, Download, Loader2, Bell, Send, Clock, Users, ClipboardList, Link2, RefreshCw, CheckCircle, X, AlertTriangle, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast, confirmAction } from '../../utils/toast'
import { useEvent } from '../../contexts/EventContext'
import { readCsvFile, writeCsvFile } from '../../utils/csv'
import type { Schedule, Participant, ParticipantStatus } from '../../types'

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

export function ProgramManagementPage() {
  const { selectedEvent, allEvents, selectEventById } = useEvent()
  const [activeTab, setActiveTab] = useState<'import' | 'assign' | 'reminders'>('import')
  const [events, setEvents] = useState<{ id: string; name: string; start_date: string }[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(selectedEvent?.id || '')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync selectedEventId from EventContext when it loads after mount
  useEffect(() => {
    if (selectedEvent && !selectedEventId) {
      setSelectedEventId(selectedEvent.id)
    }
  }, [selectedEvent, selectedEventId])

  // Load event-specific data when event changes
  useEffect(() => {
    if (selectedEventId) {
      loadEventData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId])

  async function loadEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, start_date')
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Failed to load events:', error)
      // Fallback to EventContext's allEvents
      if (allEvents.length > 0) {
        const contextEvents = allEvents.map(e => ({ id: e.id, name: e.name, start_date: e.start_date }))
        setEvents(contextEvents)
        if (!selectedEventId && selectedEvent) {
          setSelectedEventId(selectedEvent.id)
        } else if (!selectedEventId && contextEvents.length > 0) {
          setSelectedEventId(contextEvents[0].id)
        }
      }
      setLoading(false)
      return
    }

    if (data) {
      setEvents(data)
      // Prefer context's selected event, fallback to first in list
      if (!selectedEventId) {
        if (selectedEvent) {
          setSelectedEventId(selectedEvent.id)
        } else if (data.length > 0) {
          setSelectedEventId(data[0].id)
        }
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
  // CSV Import Functions
  // ═══════════════════════════════════════════════════════════════════════════

  async function handleScheduleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedEventId) return

    setImporting(true)

    try {
      const rows = await readCsvFile<Record<string, unknown>>(file)

      // 1. Try Standard/Heuristic Mapping first
      let schedulesToInsert = rows.map((row: Record<string, unknown>, index: number) => ({
        event_id: selectedEventId,
        title: String(row['כותרת'] || row['title'] || row['שם'] || row['Subject'] || row['נושא'] || ''),
        description: row['תיאור'] || row['description'] || row['Description'] || row['פירוט'] || null,
        start_time: parseImportedDateTime(row['שעת התחלה'] || row['start_time'] || row['התחלה'] || row['Start Date'] || row['Start Time'] || row['Start']),
        end_time: parseImportedDateTime(row['שעת סיום'] || row['end_time'] || row['סיום'] || row['End Date'] || row['End Time'] || row['End']),
        location: row['מיקום'] || row['location'] || row['Location'] || null,
        room: row['חדר'] || row['room'] || row['Room'] || null,
        track: row['טראק'] || row['track'] || row['מסלול'] || row['Track'] || null,
        track_color: row['צבע'] || row['color'] || getTrackColor(row['טראק'] || row['track'] || row['מסלול'] || row['Track']),
        speaker_name: row['מרצה'] || row['speaker'] || row['מנחה'] || row['Speaker'] || null,
        speaker_title: row['תפקיד מרצה'] || row['speaker_title'] || row['Title'] || null,
        is_break: Boolean(row['הפסקה'] || row['is_break'] || row['Break']),
        is_mandatory: Boolean(row['חובה'] || row['mandatory'] || row['Mandatory']),
        send_reminder: true,
        reminder_minutes_before: Number(row['תזכורת דקות'] || row['reminder_minutes'] || 15),
        sort_order: index
      })).filter((s: { title: string; start_time: string; end_time: string }) => s.title && s.start_time && s.end_time)

      // 2. If Standard Mapping Failed, Try AI Import
      if (schedulesToInsert.length === 0) {
        // We need the event date to help the AI with relative times
        const currentEvent = events.find(e => e.id === selectedEventId)
        const eventDateStr = currentEvent?.start_date?.split('T')[0] || new Date().toISOString().split('T')[0]

        // Call the Edge Function
        const { data: aiData, error: aiError } = await supabase.functions.invoke('parse-schedule', {
          body: {
            rows: rows.slice(0, 50), // Limit to 50 rows for safety
            eventDate: eventDateStr,
            eventId: selectedEventId
          },
          headers: {
            // Force usage of Anon Key for this utility function to avoid 401s from expired user sessions
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        })

        if (aiError) {
          console.error('AI Import failed:', aiError)
          throw new Error('AI Import failed: ' + aiError.message)
        }

        if (aiData && aiData.data && Array.isArray(aiData.data)) {
          // Map AI result to DB schema
          schedulesToInsert = aiData.data.map((item: Record<string, unknown>, index: number) => ({
            event_id: selectedEventId,
            title: item.title,
            description: item.description,
            start_time: item.start_time,
            end_time: item.end_time,
            location: item.location,
            room: item.room,
            track: item.track,
            track_color: getTrackColor(item.track),
            speaker_name: item.speaker_name,
            speaker_title: item.speaker_title,
            is_break: item.is_break || false,
            is_mandatory: item.is_mandatory || false,
            send_reminder: true,
            reminder_minutes_before: 15,
            sort_order: index
          }))

          if (schedulesToInsert.length > 0) {
            toast.success(`זוהו ${schedulesToInsert.length} פריטים באמצעות בינה מלאכותית!`)
          }
        }
      }

      if (schedulesToInsert.length === 0) {
        toast.error('לא נמצאו פריטים תקינים בקובץ (גם לאחר ניסיון זיהוי חכם)')
        setImporting(false)
        return
      }

      // Direct insert via Supabase client (RLS policies allow org members)
      const { error: insertError } = await supabase
        .from('schedules')
        .insert(schedulesToInsert)

      if (insertError) {
        console.error('Import error:', insertError)
        toast.error('שגיאה בייבוא: ' + (insertError.message || 'Unknown error'))
      } else {
        toast.success(`יובאו ${schedulesToInsert.length} פריטים בהצלחה!`)
        loadEventData()
      }
    } catch (err: unknown) {
      console.error('Parse error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error('שגיאה בקריאת הקובץ: ' + errorMessage)
    }

    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleParticipantsImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!selectedEventId) {
      toast.error('יש לבחור אירוע לפני ייבוא משתתפים')
      return
    }

    setImporting(true)

    try {
      const rows = await readCsvFile<Record<string, unknown>>(file)

      if (rows.length === 0) {
        toast.error('הקובץ ריק - לא נמצאו שורות')
        setImporting(false)
        if (participantsFileRef.current) participantsFileRef.current.value = ''
        return
      }

      // Helper to find a column value by trying multiple possible names
      function getCol(row: Record<string, unknown>, names: string[]): unknown {
        for (const name of names) {
          const val = row[name]
          if (val !== undefined && val !== null && val !== '') return val
        }
        return undefined
      }

      const participantsToInsert = rows.map((row: Record<string, unknown>) => {
        const firstName = String(getCol(row, ['שם פרטי', 'first_name', 'שם', 'First Name', 'firstName']) || '')
        const lastName = String(getCol(row, ['שם משפחה', 'last_name', 'משפחה', 'Last Name', 'lastName']) || '')
        const phone = String(getCol(row, ['טלפון', 'phone', 'Phone', 'נייד', 'מספר טלפון', 'tel']) || '')
        const email = getCol(row, ['אימייל', 'email', 'Email', 'מייל', 'דוא"ל', 'דואר אלקטרוני'])
        const track = getCol(row, ['טראק', 'track', 'מסלול', 'Track'])

        return {
          event_id: selectedEventId,
          first_name: firstName,
          last_name: lastName,
          phone: normalizePhone(phone),
          email: email ? String(email) : null,
          status: 'confirmed' as ParticipantStatus,
          custom_fields: { track: track ? String(track) : null }
        }
      }).filter((p: { first_name: string; phone: string }) => p.first_name && p.phone && p.phone !== '972')

      if (participantsToInsert.length === 0) {
        const sampleKeys = Object.keys(rows[0] || {}).join(', ')
        toast.error(`לא נמצאו משתתפים תקינים בקובץ. עמודות שזוהו: ${sampleKeys}. נדרש לפחות: שם פרטי + טלפון`)
        setImporting(false)
        if (participantsFileRef.current) participantsFileRef.current.value = ''
        return
      }

      const { data: insertedData, error: insertError } = await supabase
        .from('participants')
        .insert(participantsToInsert)
        .select()

      if (insertError) {
        console.error('Import error:', insertError)
        toast.error('שגיאה בייבוא: ' + (insertError.message || 'Unknown error'))
      } else {
        if (insertedData) {
          await autoAssignToTracks(insertedData)
        }

        // Generate scheduled messages for all participant-schedule combinations
        const { data: msgResult, error: msgError } = await supabase.rpc('generate_event_messages', {
          p_event_id: selectedEventId
        })

        let msgInfo = ''
        if (msgError) {
          console.error('Message generation error:', msgError)
        } else if (msgResult) {
          const r = msgResult as { created_messages: number; skipped: number }
          if (r.created_messages > 0) {
            msgInfo = `\n${r.created_messages} הודעות תזכורת נוצרו`
          }
        }

        toast.success(`יובאו ${participantsToInsert.length} משתתפים בהצלחה!${msgInfo}`)
        loadEventData()
      }
    } catch (err) {
      console.error('Parse error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error('שגיאה בקריאת הקובץ: ' + errorMessage)
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
      // Direct insert via Supabase client
      const { error } = await supabase
        .from('participant_schedules')
        .insert(assignmentsToCreate)

      if (error) {
        console.error('Failed to auto-assign:', error)
      }
    }
  }

  function parseImportedDateTime(value: unknown): string {
    if (!value) return ''

    // If it's already an ISO string
    if (typeof value === 'string' && value.includes('T')) {
      return value
    }

    // If it's a numeric serial date value
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

    toast.success(`נשלחו ${successCount} הודעות${failCount > 0 ? `, ${failCount} נכשלו` : ''}`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Download Template
  // ═══════════════════════════════════════════════════════════════════════════

  async function downloadScheduleTemplate() {
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

    writeCsvFile(template, 'תבנית_תוכניה.csv')
  }

  async function downloadParticipantsTemplate() {
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

    writeCsvFile(template, 'תבנית_משתתפים.csv')
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
          onChange={(e) => {
            setSelectedEventId(e.target.value)
            if (e.target.value) {
              selectEventById(e.target.value)
            }
          }}
          className="input min-w-[250px]"
          data-testid="event-selector"
        >
          <option value="">בחר אירוע</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>{event.name}</option>
          ))}
        </select>
      </div>

      {/* No event warnings */}
      {!selectedEventId && events.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>יש לבחור אירוע כדי להפעיל את כפתורי הייבוא</span>
        </div>
      )}
      {!selectedEventId && events.length === 0 && !loading && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>לא נמצאו אירועים. יש ליצור אירוע חדש קודם</span>
        </div>
      )}

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
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'import'
            ? 'border-primary text-primary'
            : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
        >
          <Upload className="w-4 h-4 inline ml-2" />
          ייבוא
        </button>
        <button
          onClick={() => setActiveTab('assign')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'assign'
            ? 'border-primary text-primary'
            : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
        >
          <Link2 className="w-4 h-4 inline ml-2" />
          שיוך משתתפים
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'reminders'
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
                  ייבוא תוכניה מ-CSV
            </h2>
            <div className="flex justify-between items-center mb-4">
              <p className="text-zinc-400">
                    יבא קובץ CSV עם פריטי התוכניה: כותרת, שעות, מיקום, טראק, מרצה
              </p>
              {schedules.length > 0 && (
                <button
                  onClick={async () => {
                    if (await confirmAction('האם אתה בטוח שברצונך למחוק את כל התוכניה? פעולה זו אינה הפיכה.')) {
                      setLoading(true)
                      const { error } = await supabase
                        .from('schedules')
                        .delete()
                        .eq('event_id', selectedEventId)
                      if (error) toast.error('שגיאה במחיקה')
                      else loadEventData()
                      setLoading(false)
                    }
                  }}
                  className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  נקה תוכניה
                </button>
              )}
            </div>

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
                accept=".csv"
                onChange={handleScheduleImport}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => {
                  if (!selectedEventId) {
                    toast.error('יש לבחור אירוע לפני ייבוא תוכניה')
                    return
                  }
                  if (importing) return
                  fileInputRef.current?.click()
                }}
                className={`btn-primary w-full${!selectedEventId || importing ? ' opacity-50 cursor-not-allowed' : ''}`}
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
                  ייבוא משתתפים מ-CSV
            </h2>
            <div className="flex justify-between items-center mb-4">
              <p className="text-zinc-400">
                    יבא קובץ CSV עם פרטי משתתפים: שם, טלפון, אימייל, טראק
              </p>
              {participants.length > 0 && (
                <button
                  onClick={async () => {
                    if (await confirmAction('האם אתה בטוח שברצונך למחוק את כל המשתתפים? פעולה זו אינה הפיכה.')) {
                      setLoading(true)
                      const { error } = await supabase
                        .from('participants')
                        .delete()
                        .eq('event_id', selectedEventId)
                      if (error) toast.error('שגיאה במחיקה')
                      else loadEventData()
                      setLoading(false)
                    }
                  }}
                  className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  נקה משתתפים
                </button>
              )}
            </div>

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
                accept=".csv"
                onChange={handleParticipantsImport}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => {
                  if (!selectedEventId) {
                    toast.error('יש לבחור אירוע לפני ייבוא משתתפים')
                    return
                  }
                  if (importing) return
                  participantsFileRef.current?.click()
                }}
                className={`btn-primary w-full${!selectedEventId || importing ? ' opacity-50 cursor-not-allowed' : ''}`}
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
                    className={`p-4 rounded-lg border ${schedule.is_break ? 'bg-orange-500/10 border-orange-500/20' : 'bg-[#1a1d27] border-white/10'
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
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${assignment.reminder_sent
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
                      className={`p-4 rounded-lg border ${reminder.minutesUntil <= 0
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
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${participant.reminder_sent
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
