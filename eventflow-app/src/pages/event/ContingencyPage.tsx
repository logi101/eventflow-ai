import { useState, useEffect } from 'react'
import { FeatureGuard } from '../../components/guards/FeatureGuard'
import { ContingencyPanel } from '../../modules/contingency/components'
import { useEvent } from '../../contexts/EventContext'
import { supabase } from '../../lib/supabase'
import { Loader2, AlertTriangle, Calendar } from 'lucide-react'

interface Schedule {
    id: string
    title: string
    start_time: string
    speaker_id: string | null
    speaker_name: string | null
    backup_speaker_id: string | null
}

export function ContingencyPage() {
    const { selectedEvent } = useEvent()
    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)

    useEffect(() => {
        if (!selectedEvent) return

        async function loadSchedules() {
            setLoading(true)
            const { data, error } = await supabase
                .from('schedules')
                .select('id, title, start_time, speaker_id, speaker_name, backup_speaker_id')
                .eq('event_id', selectedEvent!.id)
                .order('start_time', { ascending: true })

            if (error) {
                console.error('Error loading schedules:', error)
            } else {
                setSchedules(data || [])
            }
            setLoading(false)
        }

        loadSchedules()
    }, [selectedEvent])

    if (!selectedEvent) return null

    return (
        <FeatureGuard feature="simulation">
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <header>
                    <h1 className="text-2xl font-bold text-zinc-900">ניהול תקלות ומשברים</h1>
                    <p className="text-zinc-500 mt-1">
                        תוכניות מגירה וניהול בזמן אמת של תקלות באירוע.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* List of Sessions */}
                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-medium text-zinc-900">בחר סשן לניהול</h3>
                            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                <AlertTriangle size={12} />
                                {schedules.length} סשנים
                            </span>
                        </div>

                        <div className="divide-y max-h-[600px] overflow-y-auto">
                            {loading ? (
                                <div className="p-8 flex justify-center">
                                    <Loader2 className="animate-spin text-zinc-400" />
                                </div>
                            ) : schedules.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500">
                                    לא נמצאו סשנים באירוע זה
                                </div>
                            ) : (
                                schedules.map(schedule => (
                                    <button
                                        key={schedule.id}
                                        onClick={() => setSelectedSchedule(schedule)}
                                        className={`w-full text-right p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group ${selectedSchedule?.id === schedule.id ? 'bg-orange-50 border-r-4 border-orange-500' : ''
                                            }`}
                                    >
                                        <div>
                                            <div className="font-medium text-zinc-900">{schedule.title}</div>
                                            <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                                                <Calendar size={12} />
                                                {new Date(schedule.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                                {schedule.speaker_name && ` | ד: ${schedule.speaker_name}`}
                                            </div>
                                        </div>
                                        {schedule.backup_speaker_id && (
                                            <span className="w-2 h-2 rounded-full bg-green-500" title="יש גיבוי" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Panel Area */}
                    <div className="lg:col-span-2">
                        {selectedSchedule ? (
                            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
                                <ContingencyPanel
                                    eventId={selectedEvent.id}
                                    schedule={selectedSchedule}
                                    onSuccess={() => {
                                        // Reload to update status
                                        // straightforward implementation: just clear selection or re-fetch
                                        alert('תוכנית המגירה הופעלה בהצלחה');
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center text-zinc-500">
                                <AlertTriangle size={48} className="mb-4 text-zinc-300" />
                                <h3 className="text-lg font-medium">לא נבחר סשן</h3>
                                <p>בחר סשן מהרשימה מימין כדי לנהל תקלות</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </FeatureGuard>
    )
}
