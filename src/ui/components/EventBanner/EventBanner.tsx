import { useEffect } from 'react'
import { useGameStore } from '~/ui/store'
import { selectTransientBanner } from '~/ui/store/selectors'
import styles from './EventBanner.module.css'

const BANNER_DURATION_MS = 3000

const BANNER_TEXT_BY_EVENT_TYPE: Record<string, string> = {
  siegeStarted: '围城开始',
  siegeEnded: '围城结束',
  tacticUsed: '战法触发',
  peaceProposed: '提议议和',
  peaceAccepted: '议和达成',
  peaceRejected: '议和被拒',
  generalDied: '将领阵亡',
  passCaptured: '关隘易主',
  warDeclared: '宣战',
}

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

  const text = BANNER_TEXT_BY_EVENT_TYPE[banner.text] ?? banner.text

  return (
    <div className={styles.banner} data-testid="event-banner" role="alert">
      {text}
    </div>
  )
}
