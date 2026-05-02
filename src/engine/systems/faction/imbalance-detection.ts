import {
  M42_FACTION_EVENT_PRIORITY,
  M42_FACTION_IMBALANCE_THRESHOLD,
} from '~/content/m2/balance'
import coupJson from '~/content/m4_2/imbalance-events/coup.json'
import overthrowJson from '~/content/m4_2/imbalance-events/overthrow.json'
import splitJson from '~/content/m4_2/imbalance-events/split.json'
import { FactionImbalanceEventSchema } from '~/shared/schemas'
import type {
  FactionId,
  FactionImbalanceEvent,
  GameEvent,
  GeneralId,
  RealmId,
  RNGState,
  SiteId,
  World,
} from '~/shared/types'
import { applyEventEffect } from '../events/event-chain-engine'
import { evaluatePredicate } from '../reform/predicate'
import { splitRealm } from '../ruler/realm-split'

const DEFAULT_EVENTS: readonly FactionImbalanceEvent[] = [
  FactionImbalanceEventSchema.parse(coupJson),
  FactionImbalanceEventSchema.parse(splitJson),
  FactionImbalanceEventSchema.parse(overthrowJson),
]

export function getDefaultImbalanceEvents(): readonly FactionImbalanceEvent[] {
  return DEFAULT_EVENTS
}

function getDominantFaction(influences: ReadonlyMap<FactionId, number>): FactionId {
  let maxFaction: FactionId = 'royal_kin'
  let maxVal = -Infinity
  const sortedEntries = [...influences.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  for (const [fid, val] of sortedEntries) {
    if (val > maxVal) {
      maxVal = val
      maxFaction = fid
    }
  }
  return maxFaction
}

function findFactionGeneral(
  world: World,
  realmId: RealmId,
  faction: FactionId,
): GeneralId | null {
  const candidates = [...world.generals.values()]
    .filter((g) => g.realmId === realmId && g.faction === faction)
    .sort((a, b) => a.id.localeCompare(b.id))
  return candidates[0]?.id ?? null
}

function buildSplitConfig(
  world: World,
  realmId: RealmId,
): Readonly<Record<SiteId, RealmId>> | null {
  const ownedSites = [...world.sites.values()]
    .filter((s) => s.ownerId === realmId)
    .map((s) => s.id)
    .sort((a, b) => a.localeCompare(b))
  if (ownedSites.length < 2) return null

  const splitRealmId: RealmId = `${realmId}_split`
  const half = Math.floor(ownedSites.length / 2)
  const config: Record<SiteId, RealmId> = {}
  for (let i = 0; i < ownedSites.length; i++) {
    const siteId = ownedSites[i]!
    config[siteId] = i < half ? realmId : splitRealmId
  }
  return config
}

export function detectImbalanceEvents(
  world: World,
  rng: RNGState,
  events: readonly FactionImbalanceEvent[] = DEFAULT_EVENTS,
): { world: World; nextRng: RNGState; gameEvents: GameEvent[] } {
  let currentWorld = world
  const gameEvents: GameEvent[] = []

  const sortedEvents = [...events].sort((a, b) => {
    const priorityA = M42_FACTION_EVENT_PRIORITY.indexOf(a.kind)
    const priorityB = M42_FACTION_EVENT_PRIORITY.indexOf(b.kind)
    return priorityA - priorityB
  })

  const sortedRealms = [...world.realms.values()].sort((a, b) => a.id.localeCompare(b.id))

  for (const realm of sortedRealms) {
    if (!currentWorld.realms.has(realm.id)) continue
    const factionState = currentWorld.factionInfluences.get(realm.id)
    if (!factionState) continue

    const values = [...factionState.influences.values()]
    if (values.length === 0) continue

    const maxInfluence = Math.max(...values)
    const minInfluence = Math.min(...values)
    const imbalance = maxInfluence - minInfluence

    if (imbalance <= M42_FACTION_IMBALANCE_THRESHOLD) continue

    for (const event of sortedEvents) {
      if (!evaluatePredicate(currentWorld, realm, event.triggerPredicate)) continue

      for (const effect of event.effects) {
        currentWorld = applyEventEffect(currentWorld, effect)
      }

      const dominantFactionId = getDominantFaction(factionState.influences)

      if (event.kind === 'split') {
        const config = buildSplitConfig(currentWorld, realm.id)
        if (config) {
          const splitResult = splitRealm(currentWorld, realm.id, {
            newRealmIdsBySite: config,
          })
          currentWorld = splitResult.world
          gameEvents.push(...splitResult.events)
        }
      } else if (event.kind === 'coup' || event.kind === 'overthrow') {
        const candidate = findFactionGeneral(currentWorld, realm.id, dominantFactionId)
        if (candidate) {
          const rulers = new Map(currentWorld.rulers)
          const existingRuler = rulers.get(realm.id)
          if (existingRuler) {
            rulers.set(realm.id, { ...existingRuler, generalId: candidate })
            currentWorld = { ...currentWorld, rulers }
          }
        }
      }

      gameEvents.push({
        type: 'factionImbalance',
        payload: {
          realmId: realm.id,
          eventId: event.id,
          eventKind: event.kind,
          dominantFaction: dominantFactionId,
          tick: currentWorld.tick,
        },
      })

      break
    }
  }

  return { world: currentWorld, nextRng: rng, gameEvents }
}
