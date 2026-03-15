// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Tour Trigger Button
// Floating "?" button (bottom-left, above FloatingChat) to re-run the tour
// Only visible after the initial auto-tour has been completed once
// ═══════════════════════════════════════════════════════════════════════════

import { useTour } from './TourProvider'

export function TourButton() {
  const { startFullTour, isTourCompleted } = useTour()

  // Only show the button after the user has already seen the tour once.
  // First-time experience is handled by the auto-start in TourProvider.
  if (!isTourCompleted()) return null

  return (
    <button
      onClick={startFullTour}
      className="fixed bottom-20 left-4 z-40 w-10 h-10 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
      title="סיור מהיר במערכת"
      aria-label="סיור מהיר במערכת"
    >
      ?
    </button>
  )
}
