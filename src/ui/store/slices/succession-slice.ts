import { castDraft } from 'immer'
import { M5_RULER_BASE_LIFESPAN } from '~/content/m2/balance'
import type { GameEvent, GeneralId, Realm, RealmId, RulerState, World } from '~/shared/types'
import type { StoreSet } from '../game-store'
import { closeQueuedModal } from './ui-slice'

export interface SuccessionActions {
  resolveSuccessionForceCollateral: (realmId: RealmId, candidateId: GeneralId) => void
  resolveSuccessionFraternal: (realmId: RealmId, brotherId: GeneralId) => void
  resolveSuccessionCivilWar: (realmId: RealmId) => void
  resolveSuccessionForceVassal: (realmId: RealmId) => void
}

function installSuccessor(world: World, realmId: RealmId, newGeneralId: GeneralId): World {
  const rulers = new Map(world.rulers)
  const realms = new Map(world.realms)
  const generals = new Map(world.generals)

  const prevRuler = rulers.get(realmId)
  const heir = generals.get(newGeneralId)

  const successor: RulerState = {
    realmId,
    generalId: newGeneralId,
    age: heir?.age ?? 30,
    lifespan: M5_RULER_BASE_LIFESPAN,
    health: 100,
    personality: prevRuler?.personality ?? 'steward',
    successionLawId: 'primogeniture',
    inOfficeSinceTick: world.tick,
  }
  rulers.set(realmId, successor)

  const realm = realms.get(realmId)
  if (realm !== undefined) {
    const updatedRealm: Realm = { ...realm, rulerId: newGeneralId }
    realms.set(realmId, updatedRealm)
  }

  if (prevRuler !== undefined) {
    generals.delete(prevRuler.generalId)
  }

  return { ...world, rulers, realms, generals }
}

function vacateRealm(world: World, realmId: RealmId): World {
  const rulers = new Map(world.rulers)
  const realms = new Map(world.realms)
  const generals = new Map(world.generals)

  const prevRuler = rulers.get(realmId)
  rulers.delete(realmId)

  const realm = realms.get(realmId)
  if (realm !== undefined) {
    const updatedRealm: Realm = { ...realm, rulerId: null }
    realms.set(realmId, updatedRealm)
  }

  if (prevRuler !== undefined) {
    generals.delete(prevRuler.generalId)
  }

  return { ...world, rulers, realms, generals }
}

export function createSuccessionSlice(set: StoreSet): SuccessionActions {
  return {
    resolveSuccessionForceCollateral: (realmId, candidateId) =>
      set((state) => {
        state.world = castDraft(installSuccessor(state.world, realmId, candidateId))
        closeQueuedModal(state)
      }),
    resolveSuccessionFraternal: (realmId, brotherId) =>
      set((state) => {
        state.world = castDraft(installSuccessor(state.world, realmId, brotherId))
        closeQueuedModal(state)
      }),
    resolveSuccessionCivilWar: (realmId) =>
      set((state) => {
        const events: GameEvent[] = [{ type: 'successionCivilWar', payload: { realmId } }]
        state.world = castDraft(vacateRealm(state.world, realmId))
        state.events = castDraft(events)
        closeQueuedModal(state)
      }),
    resolveSuccessionForceVassal: (realmId) =>
      set((state) => {
        state.world = castDraft(vacateRealm(state.world, realmId))
        closeQueuedModal(state)
      }),
  }
}
