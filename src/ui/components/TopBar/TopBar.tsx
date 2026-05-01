import React from 'react'
import {
  selectAllPlayerArmies,
  selectPlayerRealm,
  useSpeed,
  useWorldDate,
  useWorldTick,
} from '@/ui/store/selectors'
import { useGameStore } from '@/ui/store/game-store'
import { formatGameDate } from '@/engine/date/calendar'
import type { SpeedTier } from '@/shared/types'
import styles from './TopBar.module.css'

function speedLabel(speed: SpeedTier): string {
  const labels: Record<SpeedTier, string> = {
    pause: '⏸ 暂停',
    '1x': '▶ 1x',
    '2x': '▶▶ 2x',
    '3x': '▶▶▶ 3x',
    '4x': '▶▶▶▶ 4x',
    '5x': '▶▶▶▶▶ 5x',
  }
  return labels[speed]
}

export const TopBar = React.memo(function TopBar() {
  const realm = useGameStore(selectPlayerRealm)
  const armies = useGameStore(selectAllPlayerArmies)
  const date = useWorldDate()
  const tick = useWorldTick()
  const speed = useSpeed()
  const totalManpower = armies.reduce((sum, army) => sum + army.manpower, 0)
  const realmLabel = realm ? `${realm.displayName} ${realm.fullTitle}` : '未知势力'
  
  return (
    <div className={styles.topBar}>
      <div className={styles.leftGroup}>
        <span
          className={styles.realmBadge}
          style={realm ? { backgroundColor: realm.color } : undefined}
        >
          {realmLabel}
        </span>
        <span className={styles.separator}>|</span>
        <span data-testid="top-bar-date">{formatGameDate(date)}</span>
        <span className={styles.separator}>|</span>
        <span data-testid="top-bar-speed">速度: {speedLabel(speed)}</span>
        <span className={styles.separator}>|</span>
        <span data-testid="top-bar-tick-count">时步：{tick}</span>
      </div>
      <span className={styles.manpowerBadge}>总兵 {totalManpower}</span>
    </div>
  )
})
