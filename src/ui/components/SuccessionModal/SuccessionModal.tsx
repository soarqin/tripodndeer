import { useEffect } from 'react'
import { useGameStore } from '~/ui/store'
import { useModalWithHint } from '@/ui/hooks/use-modal-with-hint'

import type { SuccessionCrisisEvent } from '~/shared/types'

export function SuccessionModal() {
  const events = useGameStore((state) => state.events)
  const playerRealmId = useGameStore((state) => state.playerRealmId)
  const resolveSuccessionForceCollateral = useGameStore((state) => state.resolveSuccessionForceCollateral)
  const resolveSuccessionFraternal = useGameStore((state) => state.resolveSuccessionFraternal)
  const resolveSuccessionCivilWar = useGameStore((state) => state.resolveSuccessionCivilWar)
  const resolveSuccessionForceVassal = useGameStore((state) => state.resolveSuccessionForceVassal)
  const realms = useGameStore((state) => state.world.realms)
  const triggerSuccessionWithHint = useModalWithHint('hint_succession', () => {
    const realmName = realms.get(playerRealmId)?.displayName ?? '未知势力'

    return {
      title: `${realmName} 继承危机`,
      content: '国君驾崩，储君未立。朝野震动，各方势力蠢蠢欲动。请决定继承方案。',
      dismissable: false,
      testId: 'succession-modal',
      actions: [
        {
          id: 'collateral',
          label: '强立旁系',
          title: '强行拥立旁系宗亲，可能引发部分将领不满',
          testId: 'succession-option-collateral',
          onClick: () => resolveSuccessionForceCollateral(playerRealmId, 'gen_placeholder_collateral'),
        },
        {
          id: 'fraternal',
          label: '兄终弟及',
          title: '拥立先君之弟，符合部分传统，但可能导致正统性争议',
          testId: 'succession-option-fraternal',
          onClick: () => resolveSuccessionFraternal(playerRealmId, 'gen_placeholder_fraternal'),
        },
        {
          id: 'civil-war',
          label: '内战分裂',
          title: '各方势力互不相让，国家陷入内战',
          testId: 'succession-option-civil-war',
          onClick: () => resolveSuccessionCivilWar(playerRealmId),
        },
        {
          id: 'vassal',
          label: '暂无君主',
          title: '国家暂无君主，由权臣或太后摄政',
          testId: 'succession-option-vassal',
          onClick: () => resolveSuccessionForceVassal(playerRealmId),
        }
      ]
    }
  })

  useEffect(() => {
    const crisisEvent = events.find(
      (e): e is SuccessionCrisisEvent => e.type === 'successionCrisis' && (e as SuccessionCrisisEvent).payload.realmId === playerRealmId
    )

    if (crisisEvent) {
      triggerSuccessionWithHint()
    }
  }, [
    events,
    playerRealmId,
    triggerSuccessionWithHint,
    resolveSuccessionForceCollateral,
    resolveSuccessionFraternal,
    resolveSuccessionCivilWar,
    resolveSuccessionForceVassal,
    realms
  ])

  return null
}
