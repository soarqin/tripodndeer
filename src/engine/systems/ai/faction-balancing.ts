import type { EdictKind, EdictState, FactionId, Realm, World } from '~/shared/types'
import {
  M42_FACTION_BALANCE_EDICT_DURATION_MONTHS,
  M42_FACTION_IMBALANCE_THRESHOLD,
  M8_EDICT_ENACTMENT_BIAS,
} from '~/content/m2/balance'
import { getPersonality } from './utility-scorer'

const FACTION_BALANCE_EDICTS: Record<FactionId, EdictKind> = {
  military_meritocracy: 'edict_tax_relief',
  noble_clans: 'edict_grain_reserve',
  royal_kin: 'edict_tax_relief',
  reformists: 'edict_grain_reserve',
  conservatives: 'edict_tax_relief',
  foreign_clients: 'edict_grain_reserve',
}

export function evaluateFactionBalanceAction(world: World, realm: Realm): World {
  if (realm.id === world.playerRealmId) return world

  const factionState = world.factionInfluences.get(realm.id)
  if (!factionState) return world

  const values = [...factionState.influences.values()]
  if (values.length === 0) return world

  const maxInfluence = Math.max(...values)
  const minInfluence = Math.min(...values)
  const imbalance = maxInfluence - minInfluence
  const personality = getPersonality(world, realm.id)
  const edictBias = M8_EDICT_ENACTMENT_BIAS[personality]
  const effectiveThreshold = M42_FACTION_IMBALANCE_THRESHOLD / edictBias.issuanceMultiplier

  if (imbalance <= effectiveThreshold) return world

  for (const edict of world.edicts.values()) {
    if (edict.realmId === realm.id && edict.status === 'active') {
      return world
    }
  }

  // Tie-break by FactionId localeCompare for RNG-stable iteration order.
  const sortedInfluences = [...factionState.influences.entries()].sort(
    ([leftId, leftVal], [rightId, rightVal]) => {
      if (rightVal !== leftVal) return rightVal - leftVal
      return leftId.localeCompare(rightId)
    },
  )
  const dominantFaction: FactionId = sortedInfluences[0]![0]

  const edictKind: EdictKind = edictBias.preferredEdict ?? FACTION_BALANCE_EDICTS[dominantFaction] ?? 'edict_tax_relief'

  const edictId = `edict_balance_${realm.id}_${world.tick}`
  const newEdict: EdictState = {
    id: edictId,
    realmId: realm.id,
    kind: edictKind,
    startedAtTick: world.tick,
    durationMonths: M42_FACTION_BALANCE_EDICT_DURATION_MONTHS,
    remainingMonths: M42_FACTION_BALANCE_EDICT_DURATION_MONTHS,
    status: 'active',
  }

  const edicts = new Map(world.edicts)
  edicts.set(edictId, newEdict)

  return { ...world, edicts }
}
