import React from 'react'
import { TopBar } from '@/ui/components/TopBar'
import { MapCanvas } from '@/rendering/map'
import { TimeControlBar } from '@/ui/components/TimeControlBar'
import { BottomBar } from '@/ui/components/BottomBar'
import { ArmyListPanel } from '@/ui/components/ArmyListPanel'
import { RealmOverviewPanel } from '@/ui/components/RealmOverviewPanel'
import { DiplomacyPanel } from '@/ui/components/DiplomacyPanel'
import { PeacePanel } from '@/ui/components/PeacePanel'
import { EventBanner } from '@/ui/components/EventBanner'
import { SiteContextMenu } from '@/ui/components/SiteContextMenu'
import { EconomyPanel } from '@/ui/components/EconomyPanel'
import { CharacterPanel } from '@/ui/components/CharacterPanel'
import { BattlePanel } from '@/ui/components/BattlePanel'
import { CulturePanel } from '@/ui/components/CulturePanel'
import { Modal } from '@/ui/components/Modal'
import { SuccessionModal } from '@/ui/components/SuccessionModal'
import { DisasterReliefModal } from '@/ui/components/DisasterReliefModal'
import { EventChainModal } from '@/ui/components/EventChainModal'
import { ReformPromptModal } from '@/ui/components/ReformPromptModal'
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
  const modalQueue = useGameStore((state) => state.modalQueue)
  const modal = modalQueue[0]
  const queuedModalCount = Math.max(0, modalQueue.length - 1)
  const closeModal = useGameStore((state) => state.closeModal)
  const openModal = useGameStore((state) => state.openModal)
  const lastBattleResolution = useGameStore((state) => state.lastBattleResolution)
  const clearLastBattleResolution = useGameStore((state) => state.clearLastBattleResolution)
  const isPeacePanelOpen = useGameStore((state) => state.isPeacePanelOpen)
  const diplomacyTargetRealmId = useGameStore((state) => state.diplomacyTargetRealmId)
  const closePeacePanel = useGameStore((state) => state.closePeacePanel)

  const activePanel = useGameStore((state) => state.activePanel)

  React.useEffect(() => {
    if (import.meta.env.DEV) {
      const params = new URLSearchParams(window.location.search)
      if (params.get('test-modal') === 'basic') {
        openModal({
          title: 'Test Modal',
          content: 'This is a test modal triggered by URL param.',
          actions: [
            {
              id: 'confirm',
              label: 'Confirm',
              primary: true,
              onClick: () => closeModal(),
            },
          ],
        })
      }
    }
  }, [openModal, closeModal])

  return (
    <div className={styles.app}>
      <TopBar />
      <EventBanner />
      <SuccessionModal />
      <DisasterReliefModal />
      <EventChainModal />
      <ReformPromptModal />
      {modal && (
        <Modal
          title={modal.title}
          content={modal.content}
          actions={modal.actions}
          dismissable={modal.dismissable}
          onClose={closeModal}
          testId={modal.testId}
          queuedCount={queuedModalCount}
        />
      )}
      <div className={styles.mapContainer}>
        <MapCanvas />
        <SiteContextMenu />
        <RealmOverviewPanel />
        <EconomyPanel />
        <CharacterPanel />
        <ArmyListPanel />
        <DiplomacyPanel />
        {activePanel === 'culture' && <CulturePanel />}
        {isPeacePanelOpen && diplomacyTargetRealmId && (
          <PeacePanel
            targetRealmId={diplomacyTargetRealmId}
            onClose={closePeacePanel}
          />
        )}
        {lastBattleResolution && (
          <BattlePanel
            resolution={lastBattleResolution}
            onClose={clearLastBattleResolution}
          />
        )}
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
        onRencai={() => useGameStore.getState().setActivePanel(useGameStore.getState().activePanel === 'rencai' ? null : 'rencai')}
        onWaijiao={() => useGameStore.getState().setActivePanel(useGameStore.getState().activePanel === 'waijiao' ? null : 'waijiao')}
        onWenhua={() => useGameStore.getState().setActivePanel(useGameStore.getState().activePanel === 'culture' ? null : 'culture')}
      />
      <TimeControlBar />
      {import.meta.env.DEV && (
        <button
          data-testid="trigger-test-modal"
          style={{ position: 'fixed', bottom: 10, right: 10, zIndex: 9999 }}
          onClick={() => {
            openModal({
              title: 'Test Modal',
              content: 'This is a test modal triggered by button.',
              actions: [
                {
                  id: 'confirm',
                  label: 'Confirm',
                  primary: true,
                  onClick: () => closeModal(),
                },
              ],
            })
          }}
        >
          Test Modal
        </button>
      )}
    </div>
  )
}
