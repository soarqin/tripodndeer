import type {
  CharacterDefectedEvent,
  GameEvent,
  General,
  GovernorAssignment,
  GovernorAssignmentRevokedEvent,
  LoyaltyState,
  RNGState,
  SiteId,
  World,
} from '~/shared/types'
import {
  M5_LOYALTY_DEFECTION_THRESHOLD,
  M5_LOYALTY_DEPARTURE_THRESHOLD,
  M5_LOYALTY_SECRET_CONTACT_THRESHOLD,
  M5_LOYALTY_SHIRKING_THRESHOLD,
} from '~/content/m2/balance'

function isYearStart(world: World): boolean {
  return world.date.season === 'spring' && world.date.month === 1 && world.date.xun === 'shang'
}

export function computeLoyaltyState(loyalty: number): LoyaltyState {
  if (loyalty >= M5_LOYALTY_SHIRKING_THRESHOLD) return 'loyal'
  if (loyalty >= M5_LOYALTY_DEPARTURE_THRESHOLD) return 'shirking'
  if (loyalty >= M5_LOYALTY_SECRET_CONTACT_THRESHOLD) return 'seeking_departure'
  if (loyalty >= M5_LOYALTY_DEFECTION_THRESHOLD) return 'secret_contact'
  return 'defected'
}

function revokeGovernorAssignmentsForGeneral(
  governorAssignments: Map<SiteId, GovernorAssignment>,
  generalId: General['id'],
  events: GameEvent[],
): void {
  const toRemove: SiteId[] = []
  for (const [siteId, assignment] of governorAssignments) {
    if (assignment.generalId === generalId) {
      toRemove.push(siteId)
    }
  }
  for (const siteId of toRemove) {
    governorAssignments.delete(siteId)
    const revokeEvent: GovernorAssignmentRevokedEvent = {
      type: 'governorAssignmentRevoked',
      payload: { siteId, generalId },
    }
    events.push(revokeEvent)
  }
}

export function characterLifecyclePhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const events: GameEvent[] = []
  const generals = new Map(world.generals)
  const governorAssignments = new Map(world.governorAssignments)
  const yearStart = isYearStart(world)

  const sortedGeneralIds = [...generals.keys()].sort((a, b) => a.localeCompare(b))

  for (const generalId of sortedGeneralIds) {
    const general = generals.get(generalId)!

    if (general.loyaltyState === undefined) continue

    let updatedGeneral: General = general

    if (yearStart) {
      const newAge = (general.age ?? 30) + 1
      updatedGeneral = { ...updatedGeneral, age: newAge }

      const newLoyalty = Math.max(0, (general.loyalty ?? 80) - 1)
      updatedGeneral = { ...updatedGeneral, loyalty: newLoyalty }
    }

    const currentLoyalty = updatedGeneral.loyalty ?? 80
    const newLoyaltyState = computeLoyaltyState(currentLoyalty)

    if (newLoyaltyState !== updatedGeneral.loyaltyState) {
      updatedGeneral = { ...updatedGeneral, loyaltyState: newLoyaltyState }
    }

    if (newLoyaltyState === 'defected') {
      generals.delete(generalId)
      const defectedEvent: CharacterDefectedEvent = {
        type: 'characterDefected',
        payload: {
          generalId,
          generalName: general.name,
          realmId: general.realmId,
        },
      }
      events.push(defectedEvent)
      revokeGovernorAssignmentsForGeneral(governorAssignments, generalId, events)
      continue
    }

    generals.set(generalId, updatedGeneral)
  }

  return {
    world: { ...world, generals, governorAssignments },
    nextRng: rng,
    events,
  }
}
