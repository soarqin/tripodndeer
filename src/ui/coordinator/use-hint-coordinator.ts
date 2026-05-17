import { useEffect } from 'react'
import { useGameStore } from '@/ui/store'
import type { HintId } from '@/ui/components/HintModal/hint-types'
import type { RealmId, ScenarioId, SiteId, World } from '~/shared/types'

/**
 * getCurrentScenarioId: reads the canonical world.scenarioId.
 */
export function getCurrentScenarioId(world: World): ScenarioId {
  return world.scenarioId
}

/**
 * detectPassArrival: checks if player army is at a pass-associated site.
 * Pass type only has edgeId; endpoints are in adjacencyEdges.
 * MUST use adjacencyEdges (travel graph), NOT edges (geometric/rendering).
 */
function detectPassArrival(
  world: World,
  playerRealmId: RealmId,
  seenHints: Record<HintId, true>,
): HintId | null {
  if (seenHints.hint_pass) return null

  const passSiteIds = new Set<SiteId>()
  for (const pass of world.passes.values()) {
    const edge = world.adjacencyEdges.get(pass.edgeId)
    if (!edge) continue
    passSiteIds.add(edge.fromSiteId)
    passSiteIds.add(edge.toSiteId)
  }

  const playerArmies = [...world.armies.values()]
    .filter((army) => army.realmId === playerRealmId)
    .sort((a, b) => a.id.localeCompare(b.id))

  for (const army of playerArmies) {
    if (passSiteIds.has(army.location)) return 'hint_pass'
  }

  return null
}

/**
 * useHintCoordinator: evaluates state-derived hint triggers per tick.
 * Only handles hint_pass (state-derived).
 * Modal-bound triggers: useModalWithHint HOC (T2.3).
 * Panel-mount triggers: individual panel useEffect (T3.7-3.9).
 */
export function useHintCoordinator(): void {
  const tick = useGameStore((state) => state.world.tick)
  const world = useGameStore((state) => state.world)
  const playerRealmId = useGameStore((state) => state.playerRealmId)
  const bootStatus = useGameStore((state) => state.bootStatus)
  const seenHints = useGameStore((state) => state.seenHints)
  const hintsEnabled = useGameStore((state) => state.hintsEnabled)
  const openModal = useGameStore((state) => state.openModal)
  const markHintSeen = useGameStore((state) => state.markHintSeen)
  const openCodex = useGameStore((state) => state.openCodex)
  const closeModal = useGameStore((state) => state.closeModal)

  useEffect(() => {
    if (bootStatus !== 'ready') return
    if (getCurrentScenarioId(world) !== 'm9') return
    if (!hintsEnabled) return

    const candidate = detectPassArrival(world, playerRealmId, seenHints)
    if (!candidate) return

    void import('@/content/m10_2/hints').then(({ HINTS }) => {
      const entry = HINTS.find((hint) => hint.id === candidate)
      if (!entry) return

      openModal({
        title: entry.title,
        content: entry.body,
        actions: [
          {
            id: 'dismiss',
            label: '知道了',
            onClick: () => {
              markHintSeen(candidate)
              closeModal()
            },
            testId: `hint-modal-${candidate}-dismiss`,
          },
          {
            id: 'confirm',
            label: '查看详情',
            onClick: () => {
              markHintSeen(candidate)
              closeModal()
              openCodex(entry.codexEntryId)
            },
            primary: true,
            testId: `hint-modal-${candidate}-confirm`,
          },
        ],
        priority: 120,
        dismissable: true,
        testId: `hint-modal-${candidate}`,
      })
    })
  }, [bootStatus, closeModal, hintsEnabled, markHintSeen, openCodex, openModal, playerRealmId, seenHints, tick, world])
}
