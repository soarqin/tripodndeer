import type { Academy, Effect, EventChain, EventChainId, EventChainStage, EventChainState, GameEvent, General, RNGState, World, ZhouInvestitureState } from '~/shared/types'
import { evaluatePredicate } from '../reform/predicate'
import { relationKey } from '~/engine/systems/diplomacy/diplomacy-core'
import { deactivateRealm } from '~/engine/wars/realm-deactivation'
import fanJuStrategy from '~/content/m5/events/fan-ju-strategy.json'
import lianPoElder from '~/content/m5/events/lian-po-elder.json'
import linXiangruBi from '~/content/m5/events/lin-xiangru-bi.json'

const EFFECT_TYPES = [
  'realm.treasury',
  'character.create',
  'character.kill',
  'character.loyalty',
  'realm.trait.add',
  'realm.politicalSystem.set',
  'site.population.delta',
  'realm.faction.delta',
  'realm.warWeariness.delta',
  'realm.foodStores.delta',
  'realm.prestige.delta',
  'realm.ideology.delta',
  'realm.relation.delta',
  'site.culturalIdentity.delta',
  'site.cultural.set',
  'academy.create',
  'academy.dormant',
  'zhouInvestiture.grant',
  'realm.deactivate',
] as const

type EffectType = (typeof EFFECT_TYPES)[number]

export function isValidEffectType(type: string): type is EffectType {
  return (EFFECT_TYPES as readonly string[]).includes(type)
}

function applyEffect(world: World, effect: Effect): World {
  switch (effect.type) {
    case 'realm.treasury': {
      const realm = world.realms.get(effect.realmId)
      if (!realm) return world
      const realms = new Map(world.realms)
      realms.set(realm.id, {
        ...realm,
        economy: { ...realm.economy, treasury: realm.economy.treasury + effect.delta },
      })
      return { ...world, realms }
    }
    case 'character.create': {
      const generals = new Map(world.generals)
      const newGeneral: General = {
        id: effect.generalId,
        realmId: effect.realmId,
        name: effect.name,
        might: 10,
        command: 10,
        loyalty: 80,
        loyaltyState: 'loyal',
        posts: [],
        age: 30,
        ambition: 'mid',
        specialty: 'administrator',
        attrs: { wu: 10, zheng: 10, jiao: 10, mou: 10, xue: 10, po: 10 },
      }
      generals.set(effect.generalId, newGeneral)
      return { ...world, generals }
    }
    case 'character.kill': {
      const generals = new Map(world.generals)
      generals.delete(effect.generalId)
      return { ...world, generals }
    }
    case 'character.loyalty': {
      const generals = new Map(world.generals)
      const general = generals.get(effect.generalId)
      if (!general) return world
      generals.set(general.id, { ...general, loyalty: general.loyalty + effect.delta })
      return { ...world, generals }
    }
    case 'realm.trait.add': {
      const realm = world.realms.get(effect.realmId)
      if (!realm) return world
      if (realm.traits.includes(effect.trait)) return world
      const realms = new Map(world.realms)
      const traits = [...realm.traits, effect.trait]
      realms.set(realm.id, { ...realm, traits })
      return { ...world, realms }
    }
    case 'realm.politicalSystem.set': {
      const realm = world.realms.get(effect.realmId)
      if (!realm) return world
      const realms = new Map(world.realms)
      realms.set(realm.id, { ...realm, politicalSystem: effect.system })
      return { ...world, realms }
    }
    case 'site.population.delta': {
      const site = world.sites.get(effect.siteId)
      if (!site) return world
      const sites = new Map(world.sites)
      const newPop = Math.max(0, site.economy.population + effect.delta)
      sites.set(site.id, {
        ...site,
        economy: { ...site.economy, population: newPop },
      })
      return { ...world, sites }
    }
    case 'realm.faction.delta': {
      const current = world.factionInfluences.get(effect.realmId)
      if (!current) return world
      const oldVal = current.influences.get(effect.faction) ?? 0
      const newVal = Math.min(100, Math.max(0, oldVal + effect.delta))
      const influences = new Map(current.influences)
      influences.set(effect.faction, newVal)
      const factionInfluences = new Map(world.factionInfluences)
      factionInfluences.set(effect.realmId, { ...current, influences })
      return { ...world, factionInfluences }
    }
    case 'realm.warWeariness.delta': {
      const realm = world.realms.get(effect.realmId)
      if (!realm) return world
      const realms = new Map(world.realms)
      const currentWW = realm.stats?.warWeariness ?? 0
      const newWW = Math.min(100, Math.max(0, currentWW + effect.delta))
      realms.set(realm.id, {
        ...realm,
        stats: { ...(realm.stats ?? { manpowerPool: 0, manpowerCap: 0, warWeariness: 0 }), warWeariness: newWW },
      })
      return { ...world, realms }
    }
    case 'realm.foodStores.delta': {
      const realm = world.realms.get(effect.realmId)
      if (!realm) return world
      const realms = new Map(world.realms)
      const newFood = Math.max(0, realm.economy.foodStores + effect.delta)
      realms.set(realm.id, {
        ...realm,
        economy: { ...realm.economy, foodStores: newFood },
      })
      return { ...world, realms }
    }
    case 'realm.prestige.delta': {
      const realm = world.realms.get(effect.realmId)
      if (!realm) return world
      const current = realm.prestige ?? 0
      const newPrestige = Math.max(0, Math.min(100, current + effect.delta))
      const realms = new Map(world.realms)
      realms.set(realm.id, { ...realm, prestige: newPrestige })
      return { ...world, realms }
    }
    case 'realm.ideology.delta': {
      const realm = world.realms.get(effect.realmId)
      if (!realm) return world
      const lean = realm.ideologyLean ?? { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
      const currentVal = lean[effect.ideology]
      const newVal = Math.max(0, Math.min(100, currentVal + effect.delta))
      const newLean = { ...lean, [effect.ideology]: newVal }
      const realms = new Map(world.realms)
      realms.set(realm.id, { ...realm, ideologyLean: newLean })
      return { ...world, realms }
    }
    case 'realm.relation.delta':
      return applyRealmRelationDelta(world, effect.realmId, effect.targetRealmId, effect.delta)
    case 'site.culturalIdentity.delta': {
      const site = world.sites.get(effect.siteId)
      if (!site) return world
      const current = site.culturalIdentityStrength ?? 100
      const newStrength = Math.max(0, Math.min(100, current + effect.delta))
      const sites = new Map(world.sites)
      sites.set(site.id, { ...site, culturalIdentityStrength: newStrength })
      return { ...world, sites }
    }
    case 'site.cultural.set': {
      const site = world.sites.get(effect.siteId)
      if (!site) return world
      const sites = new Map(world.sites)
      sites.set(site.id, { ...site, cultural: effect.tag })
      return { ...world, sites }
    }
    case 'academy.create':
      return applyAcademyCreate(world, effect)
    case 'academy.dormant': {
      const academy = world.academies.get(effect.academyId)
      if (!academy) return world
      const academies = new Map(world.academies)
      academies.set(academy.id, { ...academy, status: 'dormant' })
      return { ...world, academies }
    }
    case 'zhouInvestiture.grant':
      return applyZhouInvestitureGrant(world, effect.realmId, effect.rank)
    case 'realm.deactivate':
      return deactivateRealm(world, effect.realmId, effect.reason).world
    default: {
      const unknownType = (effect as { type: string }).type
      throw new Error(`Unknown effect type: ${unknownType}`)
    }
  }
}

function applyRealmRelationDelta(world: World, realmId: string, targetRealmId: string, delta: number): World {
  if (realmId === targetRealmId) return world
  if (!world.realms.has(realmId) || !world.realms.has(targetRealmId)) return world
  const key = relationKey(realmId, targetRealmId)
  const existing = world.relations.get(key)
  const [lowerId, higherId] = realmId.localeCompare(targetRealmId) <= 0
    ? [realmId, targetRealmId]
    : [targetRealmId, realmId]
  const baseAttitude = existing?.attitude ?? 0
  const newAttitude = Math.max(-100, Math.min(100, baseAttitude + delta))
  const relations = new Map(world.relations)
  relations.set(key, {
    key,
    realmAId: existing?.realmAId ?? lowerId,
    realmBId: existing?.realmBId ?? higherId,
    attitude: newAttitude,
    trust: existing?.trust ?? 0,
    updatedAt: world.date,
  })
  return { ...world, relations }
}

function applyAcademyCreate(world: World, effect: Extract<Effect, { type: 'academy.create' }>): World {
  if (!world.realms.has(effect.hostRealmId)) return world
  if (!world.sites.has(effect.hostSiteId)) return world
  if (world.academies.has(effect.academyId)) return world
  const academy: Academy = {
    id: effect.academyId,
    hostRealmId: effect.hostRealmId,
    hostSiteId: effect.hostSiteId,
    primaryIdeology: effect.primaryIdeology,
    secondaryIdeology: null,
    founded: world.date.yearBC,
    level: 1,
    status: 'active',
  }
  const academies = new Map(world.academies)
  academies.set(academy.id, academy)
  return { ...world, academies }
}

function applyZhouInvestitureGrant(world: World, realmId: string, rank: ZhouInvestitureState['rank']): World {
  if (!world.realms.has(realmId)) return world
  const existing = world.zhouInvestiture.get(realmId)
  const next: ZhouInvestitureState = existing
    ? { ...existing, rank, recognizedTitle: rank ?? existing.recognizedTitle }
    : {
        realmId,
        recognizedTitle: rank ?? '',
        grantedAtTick: world.tick,
        expiresAtTick: null,
        source: 'zhou',
        rank,
      }
  const zhouInvestiture = new Map(world.zhouInvestiture)
  zhouInvestiture.set(realmId, next)
  return { ...world, zhouInvestiture }
}

export function applyEventEffect(world: World, effect: Effect): World {
  if (!isValidEffectType(effect.type)) {
    throw new Error(`Unknown effect type: ${(effect as { type: string }).type}`)
  }
  return applyEffect(world, effect)
}

export function checkTrigger(world: World, trigger: EventChain['trigger']): boolean {
  if (trigger.type === 'date') {
    if (!trigger.between) return false
    const [start, end] = trigger.between
    return world.date.yearBC <= start.yearBC && world.date.yearBC >= end.yearBC
  }
  if (trigger.type === 'state') {
    if (!trigger.realmId || !trigger.predicate) return false
    const realm = world.realms.get(trigger.realmId)
    if (!realm) return false
    return evaluatePredicate(world, realm, trigger.predicate)
  }
  return false
}

export function checkEventChainYearGate(world: World, chain: EventChain): boolean {
  if (chain.between?.earliest_year_bc != null && world.date.yearBC > chain.between.earliest_year_bc) {
    return false
  }
  if (chain.between?.latest_year_bc != null && world.date.yearBC < chain.between.latest_year_bc) {
    return false
  }
  return true
}

const EVENT_CHAINS: readonly EventChain[] = [
  linXiangruBi as unknown as EventChain,
  fanJuStrategy as unknown as EventChain,
  lianPoElder as unknown as EventChain,
]

export function getEventChain(chainId: EventChainId): EventChain | null {
  return EVENT_CHAINS.find((chain) => chain.id === chainId) ?? null
}

export function getCurrentStage(world: World, chainId: EventChainId): EventChainStage | null {
  const state = world.eventChainStates.get(chainId)
  if (!state) return null

  const chain = getEventChain(chainId)
  if (!chain) return null

  return chain.stages.find((stage) => stage.id === state.currentStageId) ?? null
}

export function applyEventChainChoice(
  world: World,
  chainId: EventChainId,
  choiceId: string,
): { world: World; events: readonly GameEvent[] } {
  const state = world.eventChainStates.get(chainId)
  if (!state || state.completed) return { world, events: [] }

  const currentStage = getCurrentStage(world, chainId)
  if (!currentStage) return { world, events: [] }

  const choice = currentStage.choices.find((candidate) => candidate.id === choiceId)
  if (!choice) return { world, events: [] }

  let currentWorld = world
  for (const effect of choice.effects) {
    currentWorld = applyEventEffect(currentWorld, effect)
  }

  const updatedState: EventChainState = {
    ...state,
    choiceHistory: [
      ...(Array.isArray(state.choiceHistory) ? state.choiceHistory : []),
      { stageId: state.currentStageId, choiceId },
    ],
  }

  const eventChainStates = new Map(currentWorld.eventChainStates)
  const events: GameEvent[] = []

  if (choice.nextStageId) {
    const nextState: EventChainState = {
      ...updatedState,
      currentStageId: choice.nextStageId,
    }
    eventChainStates.set(chainId, nextState)
    currentWorld = { ...currentWorld, eventChainStates }
    events.push({
      type: 'eventChainAdvanced',
      payload: { chainId, fromStageId: state.currentStageId, toStageId: choice.nextStageId, choiceId },
    })
  } else {
    const nextState: EventChainState = {
      ...updatedState,
      completed: true,
    }
    eventChainStates.set(chainId, nextState)
    currentWorld = { ...currentWorld, eventChainStates }
    events.push({
      type: 'eventChainCompleted',
      payload: { chainId, stageId: state.currentStageId, choiceId },
    })
  }

  return { world: currentWorld, events }
}

export function historicalEventsPhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const events: GameEvent[] = []
  let currentWorld = world

  const sortedChains = [...EVENT_CHAINS].sort((a, b) => a.id.localeCompare(b.id))

  for (const chain of sortedChains) {
    if (chain.oneShot && currentWorld.eventChainStates.has(chain.id)) continue
    if (!checkEventChainYearGate(currentWorld, chain)) continue
    if (!checkTrigger(currentWorld, chain.trigger)) continue
    if (chain.stages.length === 0) continue

    const newState: EventChainState = {
      id: chain.id,
      currentStageId: chain.stages[0]!.id,
      completed: false,
      startedAtTick: currentWorld.tick,
      choiceHistory: [],
    }
    const eventChainStates = new Map(currentWorld.eventChainStates)
    eventChainStates.set(chain.id, newState)
    currentWorld = { ...currentWorld, eventChainStates }

    events.push({ type: 'eventChainTriggered', payload: { chainId: chain.id } })
  }

  if (events.length === 0) return { world, nextRng: rng, events: [] }
  return { world: currentWorld, nextRng: rng, events }
}
