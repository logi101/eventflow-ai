// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Public RSVP Page (no auth required)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { publicRsvpSchema, type PublicRsvpData } from '../../schemas/participants'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PublicEvent {
  id: string
  name: string
  start_date: string
  venue_name: string | null
  allow_plus_one: boolean
  public_rsvp_enabled: boolean
}

// ─── Thank You Screen ─────────────────────────────────────────────────────────

function ThankYouScreen({ eventName }: { eventName: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center" dir="rtl">
      <CheckCircle2 className="text-green-400" size={64} />
      <h2 className="text-2xl font-bold text-white">תודה על ההרשמה!</h2>
      <p className="text-zinc-300 max-w-sm">
        נרשמת בהצלחה לאירוע <span className="font-semibold text-white">{eventName}</span>.
        <br />
        אנחנו שמחים שתגיעו!
      </p>
      <p className="text-sm text-zinc-500">אישור נשלח לטלפון שלכם בוואטסאפ</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PublicRsvpPage() {
  const { eventId } = useParams<{ eventId: string }>()

  const [event, setEvent] = useState<PublicEvent | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(!!eventId)
  const [notFound, setNotFound] = useState(!eventId)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PublicRsvpData>({
    resolver: zodResolver(publicRsvpSchema),
    defaultValues: { has_companion: false },
  })

  const hasCompanion = useWatch({ control, name: 'has_companion' })

  // ── Load event ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!eventId) return
    supabase
      .from('events')
      .select('id, name, start_date, venue_name, allow_plus_one, public_rsvp_enabled')
      .eq('id', eventId)
      .eq('public_rsvp_enabled', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
        } else {
          setEvent(data as PublicEvent)
        }
        setLoadingEvent(false)
      })
  }, [eventId])

  // ── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = async (data: PublicRsvpData) => {
    setSubmitError(null)
    if (!event) return

    // Normalize phone: strip leading 0, prepend 972
    const normalizePhone = (phone: string) => '972' + phone.slice(1)

    const payload = {
      event_id: event.id,
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: `${data.first_name} ${data.last_name}`,
      phone: data.phone,
      phone_normalized: normalizePhone(data.phone),
      email: data.email || null,
      status: 'confirmed' as const,
      has_companion: data.has_companion,
      companion_name: data.has_companion ? (data.companion_name ?? null) : null,
      companion_phone: data.has_companion ? (data.companion_phone ?? null) : null,
    }

    const { error: insertError } = await supabase.from('participants').insert(payload)

    if (insertError) {
      console.error('RSVP insert error:', insertError)
      setSubmitError('שגיאה בהרשמה. אנא נסו שוב.')
      return
    }

    // Send WhatsApp confirmation (best-effort, don't block on failure)
    try {
      await supabase.functions.invoke('send-reminder', {
        body: {
          to: normalizePhone(data.phone),
          message: `תודה על ההרשמה לאירוע "${event.name}"! נשמח לראותך.`,
          type: 'rsvp_confirmation',
        },
      })
    } catch {
      // non-fatal — confirmation WhatsApp failed silently
    }

    setSubmitted(true)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-6" dir="rtl">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-3">הטופס לא זמין</h1>
          <p className="text-zinc-400">
            טופס ההרשמה לאירוע זה אינו פעיל או שהקישור שגוי.
          </p>
        </div>
      </div>
    )
  }

  const inputClass =
    'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors'
  const labelClass = 'block text-sm font-medium text-zinc-300 mb-1'
  const errorClass = 'mt-1 text-xs text-red-400'

  return (
    <div
      className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12"
      dir="rtl"
      style={{ fontFamily: "'Heebo', sans-serif" }}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{event.name}</h1>
          {event.venue_name && (
            <p className="text-zinc-400 text-sm">{event.venue_name}</p>
          )}
          {event.start_date && (
            <p className="text-zinc-500 text-sm mt-1">
              {new Date(event.start_date).toLocaleDateString('he-IL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          {submitted ? (
            <ThankYouScreen eventName={event.name} />
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-6">אישור הגעה</h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* First name */}
                <div>
                  <label className={labelClass}>שם פרטי <span className="text-red-400">*</span></label>
                  <input {...register('first_name')} className={inputClass} placeholder="ישראל" />
                  {errors.first_name && <p className={errorClass}>{errors.first_name.message}</p>}
                </div>

                {/* Last name */}
                <div>
                  <label className={labelClass}>שם משפחה <span className="text-red-400">*</span></label>
                  <input {...register('last_name')} className={inputClass} placeholder="ישראלי" />
                  {errors.last_name && <p className={errorClass}>{errors.last_name.message}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className={labelClass}>טלפון <span className="text-red-400">*</span></label>
                  <input
                    {...register('phone')}
                    className={inputClass}
                    placeholder="0501234567"
                    type="tel"
                    inputMode="numeric"
                    dir="ltr"
                  />
                  {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
                </div>

                {/* Email (optional) */}
                <div>
                  <label className={labelClass}>אימייל (אופציונלי)</label>
                  <input
                    {...register('email')}
                    className={inputClass}
                    placeholder="israel@example.com"
                    type="email"
                    dir="ltr"
                  />
                  {errors.email && <p className={errorClass}>{errors.email.message}</p>}
                </div>

                {/* Plus-one (conditional) */}
                {event.allow_plus_one && (
                  <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('has_companion')}
                        className="w-4 h-4 rounded accent-orange-500"
                      />
                      <span className="text-sm text-zinc-300">אני מגיע/ה עם מלווה</span>
                    </label>

                    {hasCompanion && (
                      <div className="mt-4 space-y-4 pr-7">
                        <div>
                          <label className={labelClass}>שם המלווה</label>
                          <input
                            {...register('companion_name')}
                            className={inputClass}
                            placeholder="שם מלא"
                          />
                          {errors.companion_name && (
                            <p className={errorClass}>{errors.companion_name.message}</p>
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>טלפון המלווה</label>
                          <input
                            {...register('companion_phone')}
                            className={inputClass}
                            placeholder="0501234567"
                            type="tel"
                            inputMode="numeric"
                            dir="ltr"
                          />
                          {errors.companion_phone && (
                            <p className={errorClass}>{errors.companion_phone.message}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit error */}
                {submitError && (
                  <p className="text-sm text-red-400 text-center">{submitError}</p>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      שולח...
                    </>
                  ) : (
                    'אישור הגעה'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
