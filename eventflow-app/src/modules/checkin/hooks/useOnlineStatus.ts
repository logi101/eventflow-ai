import { useState, useEffect } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastChange, setLastChange] = useState<Date | null>(null)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      setLastChange(new Date())
    }

    function handleOffline() {
      setIsOnline(false)
      setLastChange(new Date())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, lastChange }
}
