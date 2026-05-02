import type { Effect } from '~/shared/schemas'
import type { EventChainState, GameEvent, General, PredicateNode, RealmId, RNGState, World } from '~/shared/types'
import { evaluatePredicate } from '../reform/predicate'
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
    default: {
      const unknownType = (effect as { type: string }).type
      throw new Error(`Unknown effect type: ${unknownType}`)
    }
  }
}

export function applyEventEffect(world: World, effect: Effect): World {
  if (!isValidEffectType(effect.type)) {
    throw new Error(`Unknown effect type: ${(effect as { type: string }).type}`)
  }
  return applyEffect(world, effect)
}

export interface EventChainTrigger {
  readonly type: 'date' | 'state'
  readonly between?: readonly [{ readonly yearBC: number }, { readonly yearBC: number }]
  readonly predicate?: PredicateNode
  readonly realmId?: RealmId
}

export function checkTrigger(world: World, trigger: EventChainTrigger): boolean {
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

interface LoadedEventChain {
  readonly id: string
  readonly trigger: EventChainTrigger
  readonly oneShot: boolean
  readonly stages: readonly { readonly id: string }[]
}

const EVENT_CHAINS: readonly LoadedEventChain[] = [
  linXiangruBi as unknown as LoadedEventChain,
  fanJuStrategy as unknown as LoadedEventChain,
  lianPoElder as unknown as LoadedEventChain,
]

export function historicalEventsPhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const events: GameEvent[] = []
  let currentWorld = world

  const sortedChains = [...EVENT_CHAINS].sort((a, b) => a.id.localeCompare(b.id))

  for (const chain of sortedChains) {
    if (chain.oneShot && currentWorld.eventChainStates.has(chain.id)) continue
    if (!checkTrigger(currentWorld, chain.trigger)) continue
    if (chain.stages.length === 0) continue

    const newState: EventChainState = {
      id: chain.id,
      currentStageId: chain.stages[0]!.id,
      completed: false,
      startedAtTick: currentWorld.tick,
    }
    const eventChainStates = new Map(currentWorld.eventChainStates)
    eventChainStates.set(chain.id, newState)
    currentWorld = { ...currentWorld, eventChainStates }

    events.push({ type: 'eventChainTriggered', payload: { chainId: chain.id } })
  }

  if (events.length === 0) return { world, nextRng: rng, events: [] }
  return { world: currentWorld, nextRng: rng, events }
}
