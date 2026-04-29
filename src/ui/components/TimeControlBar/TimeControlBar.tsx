import React, { useEffect, useRef } from 'react'
import { useSpeed } from '@/ui/store/selectors'
import { useGameStore } from '@/ui/store/game-store'
import type { SpeedTier } from '@/shared/types'
import styles from './TimeControlBar.module.css'

const SPEED_TIERS: SpeedTier[] = ['pause', '1x', '2x', '3x', '4x', '5x']
const NON_PAUSE_TIERS: SpeedTier[] = ['1x', '2x', '3x', '4x', '5x']

const BUTTON_LABELS: Record<SpeedTier, string> = {
  pause: '⏸ 暂停',
  '1x': '▶ 1x',
  '2x': '▶▶ 2x',
  '3x': '▶▶▶ 3x',
  '4x': '▶▶▶▶ 4x',
  '5x': '▶▶▶▶▶ 5x',
}

export const TimeControlBar = React.memo(function TimeControlBar() {
  const speed = useSpeed()
  const setSpeed = useGameStore((s) => s.setSpeed)
  const lastSpeedRef = useRef<SpeedTier>('1x')
  
  // 记忆上次非暂停速度
  if (speed !== 'pause') {
    lastSpeedRef.current = speed
  }
  
  // 键盘快捷键
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        setSpeed(speed === 'pause' ? lastSpeedRef.current : 'pause')
      } else if (e.key === '+' || e.key === '=') {
        const idx = NON_PAUSE_TIERS.indexOf(speed === 'pause' ? lastSpeedRef.current : speed)
        const next = NON_PAUSE_TIERS[Math.min(idx + 1, NON_PAUSE_TIERS.length - 1)]
        if (next) setSpeed(next)
      } else if (e.key === '-') {
        const idx = NON_PAUSE_TIERS.indexOf(speed === 'pause' ? lastSpeedRef.current : speed)
        const prev = NON_PAUSE_TIERS[Math.max(idx - 1, 0)]
        if (prev) setSpeed(prev)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [speed, setSpeed])
  
  return (
    <div className={styles.bar}>
      {SPEED_TIERS.map((tier) => (
        <button
          key={tier}
          data-testid={`time-control-${tier}`}
          aria-label={`speed-${tier}`}
          aria-pressed={speed === tier}
          className={speed === tier ? styles.active : styles.button}
          onClick={() => setSpeed(tier)}
        >
          {BUTTON_LABELS[tier]}
        </button>
      ))}
    </div>
  )
})
