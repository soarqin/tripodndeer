import type { Effect } from '~/shared/schemas'
import type { GameEvent, General, RNGState, World } from '~/shared/types'

const EFFECT_TYPES = [
  'realm.treasury',
  'character.create',
  'character.kill',
  'character.loyalty',
  'realm.trait.add',
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
      const realms = new Map(world.realms)
      const traits = [...(realm.traits ?? []), effect.trait]
      realms.set(realm.id, { ...realm, traits })
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
  readonly predicate?: string
}

export function checkTrigger(world: World, trigger: EventChainTrigger): boolean {
  if (trigger.type === 'date') {
    if (!trigger.between) return false
    const [start, end] = trigger.between
    return world.date.yearBC <= start.yearBC && world.date.yearBC >= end.yearBC
  }
  return false
}

export function historicalEventsPhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const events: readonly GameEvent[] = []
  return { world, nextRng: rng, events }
}
