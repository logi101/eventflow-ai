import { useState } from 'react'
import { FeatureGuard } from '../../components/guards/FeatureGuard'
import { useEvent } from '../../contexts/EventContext'
import { generateTableSeating } from '../../modules/networking/services/seatingAlgorithm'
import { saveAllTableAssignments } from '../../modules/networking/services/seatingService'
import { supabase } from '../../lib/supabase'
import { Loader2, Share2, Users, CheckCircle } from 'lucide-react'
import type { SeatingParticipant, SeatingConstraints } from '../../modules/networking/types'

export function NetworkingPage() {
    const { selectedEvent } = useEvent()
    const [isCalculating, setIsCalculating] = useState(false)
    const [result, setResult] = useState<{ tables: number; seated: number } | null>(null)
    const [error, setError] = useState<string | null>(null)

    if (!selectedEvent) return null

    const handleRunAlgorithm = async () => {
        setIsCalculating(true)
        setError(null)
        setResult(null)

        try {
            // 1. Fetch participants (simulated for now as real query requires complex joins)
            // In production this would call a specific service method
            const { data: participants, error: fetchError } = await supabase
                .from('participants')
                .select('id, first_name, last_name, is_vip, networking_opt_in, organization_id')
                .eq('event_id', selectedEvent.id)

            if (fetchError) throw fetchError

            // Mock tracks for algorithm since DB might not have them populated yet
            const algorithmParticipants: SeatingParticipant[] = (participants || []).map(p => ({
                ...p,
                tracks: [p.organization_id || 'general'], // Simple track by org
                companion_id: undefined
            }))

            if (algorithmParticipants.length === 0) {
                throw new Error('לא נמצאו משתתפים באירוע זה')
            }

            // 2. Define constraints
            const constraints: SeatingConstraints = {
                maxTableSize: 8,
                minSharedInterests: 1,
                maxSameTrack: 3,
                vipSpread: true,
                companionsTogether: true
            }

            // 3. Run Algorithm (Client Side for now)
            const seatingMap = generateTableSeating(algorithmParticipants, constraints)

            // 4. Format for saving
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

            // 5. Save to DB
            if (assignmentsToSave.length > 0) {
                await saveAllTableAssignments(selectedEvent.id, assignmentsToSave)
            }

            setResult({
                tables: seatingMap.size,
                seated: assignmentsToSave.length
            })

        } catch (err) {
            console.error(err)
            setError(err instanceof Error ? err.message : 'שגיאה בלתי צפויה')
        } finally {
            setIsCalculating(false)
        }
    }

    return (
        <FeatureGuard feature="networking">
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <header>
                    <h1 className="text-2xl font-bold text-zinc-900">נטוורקינג חכם</h1>
                    <p className="text-zinc-500 mt-1">
                        מנוע ה-AI שלנו יודע לשבץ משתתפים לשולחנות בצורה אופטימלית על בסיס תחומי עניין משותפים.
                    </p>
                </header>

                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8 text-center">
                    <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Share2 className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-900">מנוע השיבוצים האוטומטי</h3>
                    <p className="text-zinc-500 mt-2 max-w-md mx-auto mb-6">
                        המנוע ינתח את נתוני המשתתפים ({selectedEvent.participants_count || 0}) ויצור סידור ישיבה אופטימלי לפי ארגונים ותחומי עניין.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg max-w-md mx-auto text-sm">
                            {error}
                        </div>
                    )}

                    {result ? (
                        <div className="mb-6 p-6 bg-green-50 border border-green-100 rounded-xl max-w-md mx-auto animate-fadeIn">
                            <div className="flex justify-center mb-3">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h4 className="font-bold text-green-800 text-lg">השיבוץ הושלם בהצלחה!</h4>
                            <div className="flex justify-center gap-6 mt-4 text-sm">
                                <div className="text-center">
                                    <span className="block font-bold text-2xl text-green-700">{result.seated}</span>
                                    <span className="text-green-600">משתתפים שובצו</span>
                                </div>
                                <div className="w-px bg-green-200"></div>
                                <div className="text-center">
                                    <span className="block font-bold text-2xl text-green-700">{result.tables}</span>
                                    <span className="text-green-600">שולחנות נוצרו</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setResult(null)}
                                className="mt-4 text-green-700 underline text-sm hover:text-green-800"
                            >
                                הרץ שוב
                            </button>
                        </div>
                    ) : (
                        <button
                            className={`px-8 py-3 rounded-xl transition-all shadow-sm font-medium flex items-center gap-2 mx-auto ${isCalculating
                                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md hover:-translate-y-0.5'
                                }`}
                            onClick={handleRunAlgorithm}
                            disabled={isCalculating}
                        >
                            {isCalculating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    מחשב שיבוצים אופטימליים...
                                </>
                            ) : (
                                <>
                                    <Users className="w-5 h-5" />
                                    הפעל מנוע שיבוץ
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </FeatureGuard>
    )
}
