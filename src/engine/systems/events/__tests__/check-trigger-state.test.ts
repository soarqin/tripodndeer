import { describe, expect, it } from 'vitest'

import { checkTrigger } from '../event-chain-engine'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { GameDate, Realm } from '~/shared/types'

function makeRealm(id: string, treasury = 1000): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: 'site_1',
    initialSites: [],
    initialArmies: [],
    economy: { treasury, foodStores: 500, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

describe('checkTrigger — state triggers', () => {
  it('returns true when predicate matches the specified realm', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', 5000)]])
    const world = makeEmptyWorld({ realms })

    const result = checkTrigger(world, {
      type: 'state',
      realmId: 'realm_qin',
      predicate: { kind: 'realm.treasury-above', value: 1000 },
    })

    expect(result).toBe(true)
  })

  it('returns false when predicate does not match the specified realm', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', 500)]])
    const world = makeEmptyWorld({ realms })

    const result = checkTrigger(world, {
      type: 'state',
      realmId: 'realm_qin',
      predicate: { kind: 'realm.treasury-above', value: 1000 },
    })

    expect(result).toBe(false)
  })

  it('returns false when realmId is missing', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', 5000)]])
    const world = makeEmptyWorld({ realms })

    const result = checkTrigger(world, {
      type: 'state',
      predicate: { kind: 'realm.treasury-above', value: 1000 },
    })

    expect(result).toBe(false)
  })

  it('returns false when realmId points to a non-existent realm', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', 5000)]])
    const world = makeEmptyWorld({ realms })

    const result = checkTrigger(world, {
      type: 'state',
      realmId: 'realm_nonexistent',
      predicate: { kind: 'realm.treasury-above', value: 1000 },
    })

    expect(result).toBe(false)
  })

  it('returns false when state trigger has realmId but no predicate', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', 5000)]])
    const world = makeEmptyWorld({ realms })

    const result = checkTrigger(world, {
      type: 'state',
      realmId: 'realm_qin',
    })

    expect(result).toBe(false)
  })

  it('evaluates compound and-predicate scoped to specified realm', () => {
    const qin: Realm = { ...makeRealm('realm_qin', 5000), traits: ['legalist'] }
    const realms = new Map([['realm_qin', qin]])
    const world = makeEmptyWorld({ realms })

    const result = checkTrigger(world, {
      type: 'state',
      realmId: 'realm_qin',
      predicate: {
        kind: 'and',
        children: [
          { kind: 'realm.treasury-above', value: 1000 },
          { kind: 'realm.has-trait', trait: 'legalist' },
        ],
      },
    })

    expect(result).toBe(true)
  })

  it('date trigger still works (regression)', () => {
    const date: GameDate = { yearBC: 350, season: 'spring', month: 1, xun: 'shang' }
    const world = makeEmptyWorld({ date })

    const result = checkTrigger(world, {
      type: 'date',
      between: [{ yearBC: 360 }, { yearBC: 340 }],
    })

    expect(result).toBe(true)
  })
})
