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

function formatResource(value: number | undefined): string {
  if (value === undefined) return '0'
  if (value >= 10000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
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
      <div className={styles.resourceGroup}>
        <span className={styles.resourceChip} data-testid="top-bar-treasury" title="国库">
          💰 {formatResource(realm?.economy?.treasury)}
        </span>
        <span className={styles.resourceChip} data-testid="top-bar-food" title="粮草">
          🌾 {formatResource(realm?.economy?.foodStores)}
        </span>
        <span className={styles.resourceChip} data-testid="top-bar-manpower" title="人力">
          👥 {formatResource(realm?.stats?.manpowerPool)}
        </span>
        <span className={styles.resourceChip} data-testid="top-bar-war-weariness" title="厌战度">
          💢 {formatResource(realm?.stats?.warWeariness)}
        </span>
      </div>
      <span className={styles.manpowerBadge}>总兵 {totalManpower}</span>
    </div>
  )
})
