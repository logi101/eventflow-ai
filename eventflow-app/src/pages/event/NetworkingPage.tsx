import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FeatureGuard } from '../../components/guards/FeatureGuard'
import { useEvent } from '../../contexts/EventContext'
import { greedyTableSeating } from '../../modules/networking/services/seatingAlgorithm'
import {
  fetchTableAssignments,
  saveAllTableAssignments,
  updateParticipantTable,
  fetchVenueTables,
  upsertVenueTables,
  updateVenueTablePosition,
  saveVenueTable,
} from '../../modules/networking/services/seatingService'
import { supabase } from '../../lib/supabase'
import { Loader2, Share2, AlertCircle } from 'lucide-react'
import { SeatingPlanView } from '../../modules/networking/components/SeatingPlanView'
import { VenueLayoutSelector } from '../../modules/networking/components/VenueLayoutSelector'
import type { LayoutPreset } from '../../modules/networking/components/VenueLayoutSelector'
import { toast } from '../../utils/toast'
import type { SeatingParticipant, SeatingConstraints, TableWithParticipants, VenueTable } from '../../modules/networking/types'
import type { ParticipantWithTracks, Track } from '../../types'

type TrackJoinRow = {
  tracks: Track | null
}

type ParticipantWithTrackJoin = ParticipantWithTracks & {
  participant_tracks?: TrackJoinRow[] | null
}

export function NetworkingPage() {
    const { selectedEvent } = useEvent()
    const queryClient = useQueryClient()
    const [isCalculating, setIsCalculating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showLayoutSelector, setShowLayoutSelector] = useState(false)

    // 1. Fetch Tracks (for colors)
    const { data: tracks = [] } = useQuery({
        queryKey: ['tracks', selectedEvent?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tracks')
                .select('*')
                .eq('event_id', selectedEvent?.id)
            if (error) throw error
            return data as Track[]
        },
        enabled: !!selectedEvent?.id
    })

    // 2. Fetch Participants with Tracks
    const { data: participants = [], isLoading: isLoadingParticipants } = useQuery({
        queryKey: ['participants-with-tracks', selectedEvent?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('participants')
                .select(`
                    *,
                    participant_tracks(
                        track_id,
                        tracks(*)
                    )
                `)
                .eq('event_id', selectedEvent?.id)

            if (error) throw error

            return ((data || []) as ParticipantWithTrackJoin[]).map(p => ({
                ...p,
                tracks: p.participant_tracks?.map((pt) => pt.tracks).filter((track): track is Track => Boolean(track)) || []
            })) as ParticipantWithTracks[]
        },
        enabled: !!selectedEvent?.id
    })

    // 3. Fetch Assignments
    const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
        queryKey: ['table-assignments', selectedEvent?.id],
        queryFn: () => fetchTableAssignments(selectedEvent!.id),
        enabled: !!selectedEvent?.id
    })

    // 4. Fetch Venue Tables
    const { data: venueTableConfigs = [], isLoading: isLoadingVenue } = useQuery({
        queryKey: ['venue-tables', selectedEvent?.id],
        queryFn: () => fetchVenueTables(selectedEvent!.id),
        enabled: !!selectedEvent?.id
    })

    // Show layout selector on first load if no venue tables
    useEffect(() => {
        if (!isLoadingVenue && venueTableConfigs.length === 0 && participants.length > 0) {
            setShowLayoutSelector(true)
        }
    }, [isLoadingVenue, venueTableConfigs.length, participants.length])

    // 5. Mutations
    const moveMutation = useMutation({
        mutationFn: ({ participantId, toTable }: { participantId: string, toTable: number }) =>
            updateParticipantTable(selectedEvent!.id, participantId, toTable),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['table-assignments', selectedEvent?.id] })
        }
    })

    // 6. Data Transformation for SeatingPlanView
    const tables = useMemo(() => {
        if (!selectedEvent) return []

        const maxTableSize = 8
        const tableMap = new Map<number, SeatingParticipant[]>()

        assignments.forEach(assign => {
            const participant = participants.find(p => p.id === assign.participant_id)
            if (participant) {
                if (!tableMap.has(assign.table_number)) {
                    tableMap.set(assign.table_number, [])
                }
                tableMap.get(assign.table_number)!.push({
                    id: participant.id,
                    first_name: participant.first_name,
                    last_name: participant.last_name,
                    is_vip: participant.is_vip,
                    networking_opt_in: participant.networking_opt_in,
                    tracks: participant.tracks.map(t => t.id),
                    companion_id: participant.companion_id
                })
            }
        })

        const result: TableWithParticipants[] = []
        const maxTableNum = Math.max(0, ...Array.from(tableMap.keys()), 4)

        for (let i = 1; i <= maxTableNum; i++) {
            result.push({
                tableNumber: i,
                capacity: maxTableSize,
                isVipTable: tableMap.get(i)?.some(p => p.is_vip) || false,
                participants: tableMap.get(i) || []
            })
        }

        return result
    }, [selectedEvent, participants, assignments])

    const trackColors = useMemo(() => {
        const colors = new Map<string, string>()
        tracks.forEach(t => colors.set(t.id, t.color))
        return colors
    }, [tracks])

    // Venue table handlers
    const handleLayoutSelect = async (preset: LayoutPreset) => {
        if (!selectedEvent) return
        try {
            await upsertVenueTables(selectedEvent.id, preset.tables.map(t => ({ ...t, event_id: selectedEvent.id })))
            queryClient.invalidateQueries({ queryKey: ['venue-tables', selectedEvent.id] })
            setShowLayoutSelector(false)
            toast.success('פריסת אולם נטענה בהצלחה')
        } catch {
            toast.error('שגיאה בטעינת פריסת אולם')
        }
    }

    const handleTableMove = async (tableId: string, x: number, y: number) => {
        try {
            await updateVenueTablePosition(tableId, x, y)
            queryClient.invalidateQueries({ queryKey: ['venue-tables', selectedEvent?.id] })
        } catch {
            toast.error('שגיאה בעדכון מיקום שולחן')
        }
    }

    const handleAddTable = async (name: string, shape: 'round' | 'rect', capacity: number) => {
        if (!selectedEvent) return
        try {
            const nextNum = venueTableConfigs.length > 0 ? Math.max(...venueTableConfigs.map(t => t.table_number)) + 1 : 1
            await saveVenueTable({
                event_id: selectedEvent.id,
                table_number: nextNum,
                name,
                shape,
                capacity,
                x: 50,
                y: 50,
                rotation: 0,
            })
            queryClient.invalidateQueries({ queryKey: ['venue-tables', selectedEvent.id] })
        } catch {
            toast.error('שגיאה בהוספת שולחן')
        }
    }

    const handleUpdateTable = async (id: string, changes: Partial<Pick<VenueTable, 'name' | 'shape' | 'capacity'>>) => {
        try {
            const { error } = await supabase
                .from('venue_tables')
                .update({ ...changes, updated_at: new Date().toISOString() })
                .eq('id', id)
            if (error) throw error
            queryClient.invalidateQueries({ queryKey: ['venue-tables', selectedEvent?.id] })
        } catch {
            toast.error('שגיאה בעדכון שולחן')
        }
    }

    if (!selectedEvent) return (
        <div className="p-8 text-center" dir="rtl">
            <AlertCircle className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-zinc-900">לא נבחר אירוע</h2>
            <p className="text-zinc-500">יש לבחור אירוע מהרשימה כדי לנהל נטוורקינג.</p>
        </div>
    )

    const handleRunAlgorithm = async () => {
        setIsCalculating(true)
        setError(null)

        try {
            const networkingParticipants = participants.filter(p => p.networking_opt_in)

            if (networkingParticipants.length === 0) {
                throw new Error('לא נמצאו משתתפים שאישרו השתתפות בנטוורקינג')
            }

            const constraints: SeatingConstraints = {
                maxTableSize: 8,
                minSharedInterests: 1,
                maxSameTrack: 3,
                vipSpread: true,
                companionsTogether: true
            }

            const seatingMap = greedyTableSeating(networkingParticipants, constraints)

            const assignmentsToSave = []
            for (const [tableNum, tableParticipants] of seatingMap.entries()) {
                for (const p of tableParticipants) {
                    assignmentsToSave.push({
                        participant_id: p.id,
                        table_number: tableNum,
                        is_vip_table: tableParticipants.some(tp => tp.is_vip),
                        assigned_by: 'ai' as const
                    })
                }
            }

            await saveAllTableAssignments(selectedEvent.id, assignmentsToSave)
            queryClient.invalidateQueries({ queryKey: ['table-assignments', selectedEvent.id] })

        } catch (err) {
            console.error(err)
            setError(err instanceof Error ? err.message : 'שגיאה בחישוב השיבוצים')
        } finally {
            setIsCalculating(false)
        }
    }

    const isLoading = isLoadingParticipants || isLoadingAssignments

    return (
        <FeatureGuard feature="networking">
            <div className="p-6 max-w-[1600px] mx-auto space-y-6">
                <header className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">נטוורקינג והושבה חכמה</h1>
                        <p className="text-zinc-500 mt-1">
                            נהל את סידורי הישיבה בצורה חכמה על בסיס תחומי עניין וגיוון.
                        </p>
                    </div>
                    <div className="flex gap-4 items-center bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                        <Share2 className="w-5 h-5 text-blue-600" />
                        <div className="text-sm">
                            <span className="font-bold text-blue-900">
                                {participants.filter(p => p.networking_opt_in).length}
                            </span>
                            <span className="text-blue-700 mx-1">משתתפים אישרו נטוורקינג</span>
                        </div>
                    </div>
                </header>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                        <p className="text-zinc-500 animate-pulse">טוען נתוני הושבה...</p>
                    </div>
                ) : (
                    <SeatingPlanView
                        tables={tables}
                        participants={participants.map(p => ({
                            id: p.id,
                            first_name: p.first_name,
                            last_name: p.last_name,
                            is_vip: p.is_vip,
                            networking_opt_in: p.networking_opt_in,
                            tracks: p.tracks.map(t => t.id),
                            companion_id: p.companion_id ?? undefined,
                        }))}
                        assignments={assignments}
                        trackColors={trackColors}
                        isLoading={isCalculating}
                        onGenerateSeating={handleRunAlgorithm}
                        onMoveParticipant={(participantId, _, toTable) =>
                            moveMutation.mutate({ participantId, toTable })
                        }
                        onAssignToSeat={async (participantId, tableNumber, seatNumber) => {
                            try {
                                await supabase.from('table_assignments').upsert({
                                    event_id: selectedEvent.id,
                                    participant_id: participantId,
                                    table_number: tableNumber,
                                    seat_number: seatNumber,
                                    is_vip_table: false,
                                    assigned_by: 'manager',
                                    assigned_at: new Date().toISOString(),
                                }, { onConflict: 'event_id,participant_id' })
                                queryClient.invalidateQueries({ queryKey: ['table-assignments', selectedEvent.id] })
                            } catch {
                                toast.error('שגיאה בשיבוץ מקום')
                            }
                        }}
                        onRemoveAssignment={async (participantId) => {
                            try {
                                await supabase.from('table_assignments')
                                    .delete()
                                    .eq('event_id', selectedEvent.id)
                                    .eq('participant_id', participantId)
                                queryClient.invalidateQueries({ queryKey: ['table-assignments', selectedEvent.id] })
                            } catch {
                                toast.error('שגיאה בהסרת שיבוץ')
                            }
                        }}
                        venueTableConfigs={venueTableConfigs}
                        onTableMove={handleTableMove}
                        onAddTable={handleAddTable}
                        onUpdateTable={handleUpdateTable}
                        onOpenLayoutSelector={() => setShowLayoutSelector(true)}
                    />
                )}

                {showLayoutSelector && (
                    <VenueLayoutSelector
                        eventId={selectedEvent.id}
                        onSelect={handleLayoutSelect}
                        onClose={() => setShowLayoutSelector(false)}
                    />
                )}
            </div>
        </FeatureGuard>
    )
}
