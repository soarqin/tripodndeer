import type {
  FactionId,
  FactionInfluenceState,
  GameEvent,
  PersonalityArchetype,
  PoliticalSystem,
  RNGState,
  World,
} from '~/shared/types'
import {
  M42_FACTION_DRIFT_PER_GENERAL_BP,
  M42_FACTION_INFLUENCE_INITIAL,
  M42_FACTION_INFLUENCE_MAX,
  M42_FACTION_INFLUENCE_MIN,
} from '~/content/m2/balance'
import { getTraitModifiers } from '~/content/m4_1/trait-effects'
import { detectImbalanceEvents } from './imbalance-detection'

const ALL_FACTION_IDS: readonly FactionId[] = [
  'royal_kin',
  'noble_clans',
  'military_meritocracy',
  'reformists',
  'conservatives',
  'foreign_clients',
]

const BP_DIVISOR = 10000

const POLITICAL_SYSTEM_FACTION_DRIFT: Record<PoliticalSystem, readonly { faction: FactionId; deltaBp: number }[]> = {
  legalist_centralized: [
    { faction: 'military_meritocracy', deltaBp: 30 },
    { faction: 'noble_clans', deltaBp: -20 },
  ],
  enfeoffment: [
    { faction: 'noble_clans', deltaBp: 30 },
    { faction: 'military_meritocracy', deltaBp: -10 },
  ],
  commandery: [
    { faction: 'military_meritocracy', deltaBp: 10 },
    { faction: 'reformists', deltaBp: 10 },
  ],
}

const PERSONALITY_FACTION_DRIFT: Record<PersonalityArchetype, readonly { faction: FactionId; deltaBp: number }[]> = {
  conqueror: [{ faction: 'military_meritocracy', deltaBp: 20 }],
  builder: [{ faction: 'reformists', deltaBp: 15 }],
  steward: [{ faction: 'royal_kin', deltaBp: 15 }],
  schemer: [{ faction: 'foreign_clients', deltaBp: 15 }],
  learned: [
    { faction: 'reformists', deltaBp: 10 },
    { faction: 'foreign_clients', deltaBp: 10 },
  ],
  tyrant: [
    { faction: 'military_meritocracy', deltaBp: 10 },
    { faction: 'conservatives', deltaBp: 10 },
  ],
  benevolent: [{ faction: 'royal_kin', deltaBp: 20 }],
  incompetent: [{ faction: 'conservatives', deltaBp: 10 }],
}

export function factionPhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (world.date.xun !== 'shang') {
    return { world, nextRng: rng, events: [] }
  }

  let currentWorld = world
  const events: GameEvent[] = []

  const sortedRealms = [...world.realms.values()].sort((a, b) => a.id.localeCompare(b.id))

  for (const realm of sortedRealms) {
    let factionState = currentWorld.factionInfluences.get(realm.id)
    if (!factionState) {
      const initialInfluences = new Map<FactionId, number>()
      for (const fid of ALL_FACTION_IDS) {
        initialInfluences.set(fid, M42_FACTION_INFLUENCE_INITIAL)
      }
      factionState = { realmId: realm.id, influences: initialInfluences }
    }

    const drifts = new Map<FactionId, number>()
    const addDrift = (faction: FactionId, deltaBp: number): void => {
      drifts.set(faction, (drifts.get(faction) ?? 0) + deltaBp)
    }

    for (const general of currentWorld.generals.values()) {
      if (general.realmId === realm.id && general.faction) {
        addDrift(general.faction, M42_FACTION_DRIFT_PER_GENERAL_BP)
      }
    }

    const ruler = currentWorld.rulers.get(realm.id)
    if (ruler) {
      const personalityDrifts = PERSONALITY_FACTION_DRIFT[ruler.personality] ?? []
      for (const { faction, deltaBp } of personalityDrifts) {
        addDrift(faction, deltaBp)
      }
    }

    const systemDrifts = POLITICAL_SYSTEM_FACTION_DRIFT[realm.politicalSystem] ?? []
    for (const { faction, deltaBp } of systemDrifts) {
      addDrift(faction, deltaBp)
    }

    const traitMods = getTraitModifiers(realm)
    const stabilityMultiplier = Math.max(0, 1 - traitMods.factionStabilityBonusBp / BP_DIVISOR)

    const newInfluences = new Map<FactionId, number>()
    for (const fid of ALL_FACTION_IDS) {
      const current = factionState.influences.get(fid) ?? M42_FACTION_INFLUENCE_INITIAL
      const driftBp = drifts.get(fid) ?? 0
      const driftValue = (driftBp / BP_DIVISOR) * stabilityMultiplier
      const next = Math.min(
        M42_FACTION_INFLUENCE_MAX,
        Math.max(M42_FACTION_INFLUENCE_MIN, current + driftValue),
      )
      newInfluences.set(fid, next)
    }

    const newFactionState: FactionInfluenceState = {
      realmId: realm.id,
      influences: newInfluences,
    }
    const factionInfluences = new Map(currentWorld.factionInfluences)
    factionInfluences.set(realm.id, newFactionState)
    currentWorld = { ...currentWorld, factionInfluences }
  }

  const imbalanceResult = detectImbalanceEvents(currentWorld, rng)
  currentWorld = imbalanceResult.world
  events.push(...imbalanceResult.gameEvents)

  return { world: currentWorld, nextRng: imbalanceResult.nextRng, events }
}
