import { useEffect } from 'react'
import { useGameStore } from '~/ui/store'
import { selectTransientBanner } from '~/ui/store/selectors'
import styles from './EventBanner.module.css'

const BANNER_DURATION_MS = 3000

export function EventBanner() {
  const banner = useGameStore(selectTransientBanner)
  const clearBanner = useGameStore((state) => state.clearBanner)

  // Auto-hide after 3 seconds
  useEffect(() => {
    if (!banner) return
    const timer = setTimeout(() => {
      clearBanner()
    }, BANNER_DURATION_MS)
    return () => clearTimeout(timer)
  }, [banner, clearBanner])

  if (!banner) return null

  return (
    <div className={styles.banner} data-testid="event-banner" role="alert">
      {banner.text}
    </div>
  )
}
