import { describe, expect, it } from 'vitest'

import {
  applyEventEffect,
  checkTrigger,
  historicalEventsPhase,
  isValidEffectType,
} from '../event-chain-engine'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { Effect } from '~/shared/schemas'
import type { GameDate, General, Realm, World } from '~/shared/types'

const rng = { seed: 42, counter: 0 }

function makeRealm(id: string, treasury = 1000): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: 'site_1',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury, foodStores: 500, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeGeneral(id: string, realmId: string, loyalty = 80): General {
  return {
    id,
    realmId,
    name: `General ${id}`,
    might: 50,
    command: 50,
    loyalty,
    loyaltyState: 'loyal',
    age: 30,
  }
}

function worldWith(overrides: Partial<World> = {}): World {
  return makeEmptyWorld(overrides)
}

describe('isValidEffectType', () => {
  it('accepts realm.treasury', () => {
    expect(isValidEffectType('realm.treasury')).toBe(true)
  })

  it('accepts character.create', () => {
    expect(isValidEffectType('character.create')).toBe(true)
  })

  it('accepts character.kill', () => {
    expect(isValidEffectType('character.kill')).toBe(true)
  })

  it('accepts character.loyalty', () => {
    expect(isValidEffectType('character.loyalty')).toBe(true)
  })

  it('accepts realm.trait.add', () => {
    expect(isValidEffectType('realm.trait.add')).toBe(true)
  })

  it('rejects executeArbitraryCode', () => {
    expect(isValidEffectType('executeArbitraryCode')).toBe(false)
  })

  it('rejects realm.delete', () => {
    expect(isValidEffectType('realm.delete')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidEffectType('')).toBe(false)
  })
})

describe('applyEventEffect — realm.treasury', () => {
  it('increases treasury by positive delta', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', 1000)]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.treasury', realmId: 'realm_qin', delta: 500 }
    const next = applyEventEffect(world, effect)

    expect(next.realms.get('realm_qin')?.economy.treasury).toBe(1500)
  })

  it('decreases treasury by negative delta', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', 1000)]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.treasury', realmId: 'realm_qin', delta: -300 }
    const next = applyEventEffect(world, effect)

    expect(next.realms.get('realm_qin')?.economy.treasury).toBe(700)
  })

  it('returns world unchanged if realm does not exist', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', 1000)]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.treasury', realmId: 'realm_unknown', delta: 500 }
    const next = applyEventEffect(world, effect)

    expect(next).toBe(world)
  })
})

describe('applyEventEffect — character.create', () => {
  it('adds general to world.generals', () => {
    const world = worldWith()

    const effect: Effect = {
      type: 'character.create',
      generalId: 'gen_new',
      realmId: 'realm_qin',
      name: 'Wei Yang',
    }
    const next = applyEventEffect(world, effect)

    expect(next.generals.has('gen_new')).toBe(true)
    expect(next.generals.get('gen_new')?.name).toBe('Wei Yang')
    expect(next.generals.get('gen_new')?.realmId).toBe('realm_qin')
  })

  it('created general has default M5 attrs', () => {
    const world = worldWith()
    const effect: Effect = {
      type: 'character.create',
      generalId: 'gen_test',
      realmId: 'realm_qin',
      name: 'Test',
    }

    const next = applyEventEffect(world, effect)
    const general = next.generals.get('gen_test')

    expect(general?.attrs).toEqual({ wu: 10, zheng: 10, jiao: 10, mou: 10, xue: 10, po: 10 })
    expect(general?.specialty).toBe('administrator')
    expect(general?.loyaltyState).toBe('loyal')
  })
})

describe('applyEventEffect — character.kill', () => {
  it('removes general from world.generals', () => {
    const generals = new Map([['gen_a', makeGeneral('gen_a', 'realm_qin')]])
    const world = worldWith({ generals })

    const effect: Effect = { type: 'character.kill', generalId: 'gen_a' }
    const next = applyEventEffect(world, effect)

    expect(next.generals.has('gen_a')).toBe(false)
  })

  it('is a no-op when general does not exist', () => {
    const generals = new Map([['gen_a', makeGeneral('gen_a', 'realm_qin')]])
    const world = worldWith({ generals })

    const effect: Effect = { type: 'character.kill', generalId: 'gen_unknown' }
    const next = applyEventEffect(world, effect)

    expect(next.generals.has('gen_a')).toBe(true)
    expect(next.generals.size).toBe(1)
  })
})

describe('applyEventEffect — character.loyalty', () => {
  it('increases loyalty by positive delta', () => {
    const generals = new Map([['gen_a', makeGeneral('gen_a', 'realm_qin', 50)]])
    const world = worldWith({ generals })

    const effect: Effect = { type: 'character.loyalty', generalId: 'gen_a', delta: 20 }
    const next = applyEventEffect(world, effect)

    expect(next.generals.get('gen_a')?.loyalty).toBe(70)
  })

  it('decreases loyalty by negative delta', () => {
    const generals = new Map([['gen_a', makeGeneral('gen_a', 'realm_qin', 80)]])
    const world = worldWith({ generals })

    const effect: Effect = { type: 'character.loyalty', generalId: 'gen_a', delta: -30 }
    const next = applyEventEffect(world, effect)

    expect(next.generals.get('gen_a')?.loyalty).toBe(50)
  })

  it('returns world unchanged if general does not exist', () => {
    const world = worldWith()
    const effect: Effect = { type: 'character.loyalty', generalId: 'gen_unknown', delta: 10 }

    const next = applyEventEffect(world, effect)

    expect(next).toBe(world)
  })
})

describe('applyEventEffect — realm.trait.add', () => {
  it('adds trait to realm.traits', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin')]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.trait.add', realmId: 'realm_qin', trait: 'reformist' }
    const next = applyEventEffect(world, effect)

    expect(next.realms.get('realm_qin')?.traits).toEqual(['reformist'])
  })

  it('appends to existing traits', () => {
    const baseRealm = makeRealm('realm_qin')
    const realms = new Map([['realm_qin', { ...baseRealm, traits: ['warmonger'] }]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.trait.add', realmId: 'realm_qin', trait: 'reformist' }
    const next = applyEventEffect(world, effect)

    expect(next.realms.get('realm_qin')?.traits).toEqual(['warmonger', 'reformist'])
  })

  it('returns world unchanged if realm does not exist', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin')]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.trait.add', realmId: 'realm_unknown', trait: 'X' }
    const next = applyEventEffect(world, effect)

    expect(next).toBe(world)
  })
})

describe('applyEventEffect — whitelist enforcement', () => {
  it('throws on unknown effect type', () => {
    const world = worldWith()
    const malicious = { type: 'executeArbitraryCode', payload: 'rm -rf /' } as unknown as Effect

    expect(() => applyEventEffect(world, malicious)).toThrow(/Unknown effect type/)
  })

  it('throws on attacker-style realm.delete', () => {
    const world = worldWith()
    const malicious = { type: 'realm.delete', realmId: 'realm_qin' } as unknown as Effect

    expect(() => applyEventEffect(world, malicious)).toThrow()
  })
})

describe('checkTrigger — date triggers', () => {
  it('returns true when world year is within range', () => {
    const date: GameDate = { yearBC: 350, season: 'spring', month: 1, xun: 'shang' }
    const world = worldWith({ date })

    const result = checkTrigger(world, {
      type: 'date',
      between: [{ yearBC: 360 }, { yearBC: 340 }],
    })

    expect(result).toBe(true)
  })

  it('returns false when world year is before range', () => {
    const date: GameDate = { yearBC: 400, season: 'spring', month: 1, xun: 'shang' }
    const world = worldWith({ date })

    const result = checkTrigger(world, {
      type: 'date',
      between: [{ yearBC: 360 }, { yearBC: 340 }],
    })

    expect(result).toBe(false)
  })

  it('returns false when world year is after range', () => {
    const date: GameDate = { yearBC: 300, season: 'spring', month: 1, xun: 'shang' }
    const world = worldWith({ date })

    const result = checkTrigger(world, {
      type: 'date',
      between: [{ yearBC: 360 }, { yearBC: 340 }],
    })

    expect(result).toBe(false)
  })

  it('state triggers always return false in M5 v1', () => {
    const world = worldWith()

    const result = checkTrigger(world, { type: 'state', predicate: { kind: 'realm.treasury-above', value: 1000 } })

    expect(result).toBe(false)
  })
})

describe('historicalEventsPhase', () => {
  it('returns world unchanged when no chain triggers match the date', () => {
    const date: GameDate = { yearBC: 500, season: 'spring', month: 1, xun: 'shang' }
    const world = worldWith({ date })

    const result = historicalEventsPhase(world, rng)

    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
  })

  it('returns same RNG state by reference (no random consumed)', () => {
    const date: GameDate = { yearBC: 500, season: 'spring', month: 1, xun: 'shang' }
    const world = worldWith({ date })

    const result = historicalEventsPhase(world, rng)

    expect(result.nextRng).toBe(rng)
  })

  it('phase signature returns world/nextRng/events keys', () => {
    const date: GameDate = { yearBC: 500, season: 'spring', month: 1, xun: 'shang' }
    const world = worldWith({ date })

    const result = historicalEventsPhase(world, rng)

    expect(Object.keys(result).sort()).toEqual(['events', 'nextRng', 'world'])
  })
})
