import React, { useEffect, useRef } from 'react'
import { useGameStore } from '@/ui/store/game-store'
import type { OpenModalPayload } from '@/ui/store/slices/ui-slice'
import { ModalPriority } from '@/ui/store/slices/ui-slice'
import type { ModalAction } from '@/ui/components/Modal'
import type { PlayerDefeatedEvent } from '~/shared/types'
import { isDefeated } from '@/engine/systems/victory'
import styles from './DefeatModal.module.css'

export function DefeatModalContent() {
  const world = useGameStore((state) => state.world)
  const playerRealm = world.realms.get(world.playerRealmId)
  
  const yearsSurvived = Math.floor(world.tick / 36)
  
  const rulerState = world.rulers.get(world.playerRealmId)
  const rulerGeneral = rulerState ? world.generals.get(rulerState.generalId) : null
  const rulerName = rulerGeneral?.name || '无'
  
  const capitalSite = playerRealm ? world.sites.get(playerRealm.capital) : null
  const conquerorRealm = capitalSite && capitalSite.ownerId ? world.realms.get(capitalSite.ownerId) : null
  const conquerorName = conquerorRealm?.displayName || '天下诸侯'

  return (
    <div className={styles.body}>
      <p>天命已尽，社稷倾覆。宗庙之火，至此而绝。</p>
      
      <div className={styles.narrative}>
        <div className={styles.narrativeItem}>
          <span className={styles.label}>存续:</span>
          <span className={styles.value}>{yearsSurvived} 年</span>
        </div>
        <div className={styles.narrativeItem}>
          <span className={styles.label}>末代君主:</span>
          <span className={styles.value}>{rulerName}</span>
        </div>
        <div className={styles.narrativeItem}>
          <span className={styles.label}>亡于:</span>
          <span className={styles.value}>{conquerorName}</span>
        </div>
      </div>
    </div>
  )
}

export function buildDefeatModalPayload(
  onSpectate: () => void,
  onLoadSave: () => void,
  onExitToMenu: () => void,
): OpenModalPayload {
  const actions: ModalAction[] = [
    {
      id: 'spectate',
      label: '观战',
      onClick: onSpectate,
      testId: 'defeat-spectate',
    },
    {
      id: 'load-save',
      label: '逆转天命 (载入存档)',
      onClick: onLoadSave,
      testId: 'defeat-load-save',
    },
    {
      id: 'exit-menu',
      label: '退出至主菜单',
      onClick: onExitToMenu,
      primary: true,
      testId: 'defeat-exit-menu',
    },
  ]

  return {
    title: '亡国录',
    content: React.createElement(DefeatModalContent),
    actions,
    priority: ModalPriority.TUTORIAL_COMPLETE,
    dismissable: false,
    testId: 'defeat-modal',
  }
}

export function DefeatModal() {
  const events = useGameStore((state) => state.events)
  const world = useGameStore((state) => state.world)
  const playerRealmId = useGameStore((state) => state.playerRealmId)
  const openModal = useGameStore((state) => state.openModal)
  const closeModal = useGameStore((state) => state.closeModal)
  const openSaveLoadModal = useGameStore((state) => state.openSaveLoadModal)
  const resetToBootPending = useGameStore((state) => state.resetToBootPending)

  const shownForPlayerRef = useRef<string | null>(null)

  useEffect(() => {
    if (shownForPlayerRef.current === playerRealmId) return

    const defeatEvent = events.find(
      (e): e is PlayerDefeatedEvent =>
        e.type === 'playerDefeated' && (e as PlayerDefeatedEvent).payload.realmId === playerRealmId,
    )
    const defeatedByState = isDefeated(world)

    if (!defeatEvent && !defeatedByState) return

    shownForPlayerRef.current = playerRealmId
    openModal(
      buildDefeatModalPayload(
        () => {
          closeModal()
        },
        () => {
          closeModal()
          openSaveLoadModal('load')
        },
        () => {
          closeModal()
          resetToBootPending()
        },
      ),
    )
  }, [events, world, playerRealmId, openModal, closeModal, openSaveLoadModal, resetToBootPending])

  useEffect(() => {
    if (shownForPlayerRef.current !== null && shownForPlayerRef.current !== playerRealmId) {
      shownForPlayerRef.current = null
    }
  }, [playerRealmId])

  return null
}
