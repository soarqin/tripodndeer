import React from 'react'
import { TopBar } from '@/ui/components/TopBar'
import { MapCanvas } from '@/rendering/map'
import { TimeControlBar } from '@/ui/components/TimeControlBar'
import { BottomBar } from '@/ui/components/BottomBar'
import { ArmyListPanel } from '@/ui/components/ArmyListPanel'
import { RealmOverviewPanel } from '@/ui/components/RealmOverviewPanel'
import { DiplomacyPanel } from '@/ui/components/DiplomacyPanel'
import { EventBanner } from '@/ui/components/EventBanner'
import { SiteContextMenu } from '@/ui/components/SiteContextMenu'
import { EconomyPanel } from '@/ui/components/EconomyPanel'
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
      <EventBanner />
      <div className={styles.mapContainer}>
        <MapCanvas />
        <SiteContextMenu />
        <RealmOverviewPanel />
        <EconomyPanel />
        <ArmyListPanel />
        <DiplomacyPanel />
        {victorious && (
          <div className={styles.demoComplete} data-testid="demo-complete">
            江山一统
          </div>
        )}
      </div>
      <BottomBar 
        onWanggong={() => useGameStore.getState().setActivePanel(useGameStore.getState().activePanel === 'wanggong' ? null : 'wanggong')}
        onJunshi={() => useGameStore.getState().setActivePanel(useGameStore.getState().activePanel === 'junshi' ? null : 'junshi')}
        onNeizheng={() => useGameStore.getState().setActivePanel(useGameStore.getState().activePanel === 'neizheng' ? null : 'neizheng')}
      />
      <TimeControlBar />
    </div>
  )
}
