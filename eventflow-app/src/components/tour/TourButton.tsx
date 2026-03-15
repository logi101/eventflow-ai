// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Tour Trigger Button
// Floating "?" button — starts the tour for the CURRENT page
// ═══════════════════════════════════════════════════════════════════════════

import { useLocation } from 'react-router-dom'
import { useTour, routeToTourPage } from './TourProvider'

export function TourButton() {
  const { startTour, startFullTour, isTourCompleted } = useTour()
  const location = useLocation()

  if (!isTourCompleted()) return null

  const handleClick = () => {
    const page = routeToTourPage(location.pathname)
    if (page) {
      startTour(page)
    } else {
      startFullTour()
    }
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 left-4 z-40 w-10 h-10 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
      title="סיור מהיר בדף זה"
      aria-label="סיור מהיר בדף זה"
    >
      ?
    </button>
  )
}
