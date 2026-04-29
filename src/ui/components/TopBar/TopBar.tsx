import React from 'react'
import { useWorldDate, useWorldTick, useSpeed } from '@/ui/store/selectors'
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
  const date = useWorldDate()
  const tick = useWorldTick()
  const speed = useSpeed()
  
  return (
    <div className={styles.topBar}>
      <span data-testid="top-bar-date">{formatGameDate(date)}</span>
      <span className={styles.separator}>|</span>
      <span data-testid="top-bar-speed">速度: {speedLabel(speed)}</span>
      <span className={styles.separator}>|</span>
      <span data-testid="top-bar-tick-count">Tick: {tick}</span>
    </div>
  )
})
