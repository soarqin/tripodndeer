import type { TutorialStepId, World } from '~/shared/types'
import { warKey } from '~/engine/wars/wars'

const TUTORIAL_QIN = 'realm_qin_tutorial' as const
const TUTORIAL_SHU = 'realm_shu_tutorial' as const
const TARGET_SITES: readonly string[] = ['site_jiameng', 'site_chengdu']
const REQUIRED_PANELS_OPENED = 3

export function evaluateStepPredicate(world: World, stepId: TutorialStepId): boolean {
  if (world.scenarioId !== 'tutorial') return false

  switch (stepId) {
    case 'panel-tour':
      return (world.tutorialState?.panelsOpened.size ?? 0) >= REQUIRED_PANELS_OPENED

    case 'diplomacy-ju':
      return world.tutorialState?.completedSteps.has('diplomacy-ju') ?? false

    case 'declare-march': {
      const key = warKey(TUTORIAL_QIN, TUTORIAL_SHU)
      if (!world.wars.has(key)) return false
      for (const army of world.armies.values()) {
        if (army.realmId !== TUTORIAL_QIN) continue
        if (army.location === 'site_jiameng') return true
        const site = world.sites.get(army.location)
        if (site?.ownerId === TUTORIAL_SHU) return true
      }
      return false
    }

    case 'siege-capture': {
      for (const siteId of TARGET_SITES) {
        const site = world.sites.get(siteId)
        if (site?.ownerId === TUTORIAL_QIN) return true
      }
      return false
    }

    case 'peace-annex': {
      const key = warKey(TUTORIAL_QIN, TUTORIAL_SHU)
      if (world.wars.has(key)) return false
      const shu = world.realms.get(TUTORIAL_SHU)
      if (!shu) return true
      return shu.status === 'deactivated'
    }
  }
}
