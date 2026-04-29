import React from 'react'
import { TopBar } from '@/ui/components/TopBar'
import { MapCanvas } from '@/rendering/map'
import { TimeControlBar } from '@/ui/components/TimeControlBar'
import { BottomBar } from '@/ui/components/BottomBar'
import { ArmyListPanel } from '@/ui/components/ArmyListPanel'
import { useRafDriver } from '@/ui/store/raf-driver'
import { useGameStore } from '@/ui/store/game-store'
import { isVictorious } from '@/engine/systems/victory'
import styles from './App.module.css'

function useVictory(): boolean {
  const world = useGameStore((state) => state.world)
  return isVictorious(world)
}

export function App(): React.JSX.Element {
  useRafDriver()
  const victorious = useVictory()

  return (
    <div className={styles.app}>
      <TopBar />
      <div className={styles.mapContainer}>
        <MapCanvas />
        <ArmyListPanel />
        {victorious && (
          <div className={styles.demoComplete} data-testid="demo-complete">
            江山一统
          </div>
        )}
      </div>
      <BottomBar 
        onWanggong={() => console.log('王宫 clicked')}
        onJunshi={() => console.log('军事 clicked')}
      />
      <TimeControlBar />
    </div>
  )
}
