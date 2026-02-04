import { FeatureGuard } from '../../components/guards/FeatureGuard'
import { SimulationReport } from '../../modules/simulation/components'
import { useSimulation } from '../../modules/simulation/hooks'
import { useEvent } from '../../contexts/EventContext'
import { Loader2, Play, RefreshCw, AlertTriangle } from 'lucide-react'

export function SimulationPage() {
    const { selectedEvent } = useEvent()

    // Always call hook (rules of hooks), handle null eventId internal logic
    const {
        runSimulation,
        isLoading,
        isError,
        error,
        result,
        hasResult,
        hasCriticalIssues
    } = useSimulation(selectedEvent?.id || '')

    if (!selectedEvent) return null

    return (
        <FeatureGuard feature="simulation">
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <header className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">סימולציית אירוע</h1>
                        <p className="text-zinc-500 mt-1">
                            הרץ סימולציה מלאה של יום האירוע כדי לזהות בעיות פוטנציאליות בלו"ז, במיקום או בצוות.
                        </p>
                    </div>

                    <button
                        onClick={() => runSimulation()}
                        disabled={isLoading}
                        className={`
              inline-flex items-center gap-2 px-6 py-3 rounded-xl
              font-medium transition-all shadow-sm
              ${isLoading
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                            }
            `}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                מריץ סימולציה...
                            </>
                        ) : hasResult ? (
                            <>
                                <RefreshCw className="h-5 w-5" />
                                הרץ שוב
                            </>
                        ) : (
                            <>
                                <Play className="h-5 w-5" />
                                התחל סימולציה
                            </>
                        )}
                    </button>
                </header>

                {isError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                        <AlertTriangle className="text-red-500" />
                        <p className="text-red-700">
                            שגיאה בהרצת הסימולציה: {error?.message || 'שגיאה לא ידועה'}
                        </p>
                    </div>
                )}

                {hasResult && hasCriticalIssues && (
                    <div className="bg-red-50 border border-red-300 rounded-xl p-6 flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-2xl">!</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-red-800">נמצאו בעיות קריטיות</h4>
                            <p className="text-red-700 mt-1">
                                מערכת ה-AI זיהתה התנגשויות או בעיות שחייבות טיפול לפני יום האירוע.
                            </p>
                        </div>
                    </div>
                )}

                <div className="min-h-[400px]">
                    {hasResult && result ? (
                        <SimulationReport
                            result={result}
                            onFixClick={(fix) => console.log('Fix clicked:', fix)}
                            onScheduleClick={(id) => console.log('Schedule clicked:', id)}
                        />
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-16 text-center h-full flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                <span className="text-4xl">🤖</span>
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900">טרם הופעלה סימולציה</h3>
                            <p className="text-zinc-500 mt-2 max-w-md mx-auto">
                                לחץ על "התחל סימולציה" למעלה כדי שה-AI ינתח את תוכנית האירוע שלך ויציף בעיות אפשריות בזמן אמת.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </FeatureGuard>
    )
}
