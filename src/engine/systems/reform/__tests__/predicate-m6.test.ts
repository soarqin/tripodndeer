import { describe, expect, it } from 'vitest'

import { attitudeToBucket, evaluatePredicate } from '../predicate'
import { relationKey } from '~/engine/systems/diplomacy/diplomacy-core'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  DiplomaticRelation,
  Realm,
  ZhouInvestitureState,
} from '~/shared/types'

function makeRealm(overrides: Partial<Realm> = {}): Realm {
  return {
    id: 'realm_qin',
    displayName: 'Qin',
    fullTitle: 'Qin',
    color: '#ff0000',
    capital: 'site_qin_capital',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
    ...overrides,
  }
}

function makeRelation(realmAId: string, realmBId: string, attitude: number): DiplomaticRelation {
  const [lower, higher] = realmAId.localeCompare(realmBId) <= 0 ? [realmAId, realmBId] : [realmBId, realmAId]
  return {
    key: relationKey(realmAId, realmBId),
    realmAId: lower,
    realmBId: higher,
    attitude,
    trust: 0,
    updatedAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
  }
}

describe('attitudeToBucket', () => {
  it('maps -100 to hostile', () => {
    expect(attitudeToBucket(-100)).toBe('hostile')
  })

  it('maps -30 to cold', () => {
    expect(attitudeToBucket(-30)).toBe('cold')
  })

  it('maps 0 to neutral', () => {
    expect(attitudeToBucket(0)).toBe('neutral')
  })

  it('maps 40 to friendly', () => {
    expect(attitudeToBucket(40)).toBe('friendly')
  })

  it('maps 80 to ally', () => {
    expect(attitudeToBucket(80)).toBe('ally')
  })
})

describe('evaluatePredicate: realm.prestige.gte', () => {
  it('returns true when prestige equals threshold (boundary)', () => {
    const realm = makeRealm({ prestige: 50 })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.prestige.gte', threshold: 50 }),
    ).toBe(true)
  })

  it('returns true when prestige exceeds threshold', () => {
    const realm = makeRealm({ prestige: 80 })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.prestige.gte', threshold: 50 }),
    ).toBe(true)
  })

  it('returns false when prestige is below threshold', () => {
    const realm = makeRealm({ prestige: 30 })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.prestige.gte', threshold: 50 }),
    ).toBe(false)
  })

  it('treats undefined prestige as 0', () => {
    const realm = makeRealm({ prestige: undefined })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.prestige.gte', threshold: 1 }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: realm.prestige.lt', () => {
  it('returns true when prestige is below threshold', () => {
    const realm = makeRealm({ prestige: 20 })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.prestige.lt', threshold: 50 }),
    ).toBe(true)
  })

  it('returns false when prestige equals threshold', () => {
    const realm = makeRealm({ prestige: 50 })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.prestige.lt', threshold: 50 }),
    ).toBe(false)
  })

  it('returns false when prestige exceeds threshold', () => {
    const realm = makeRealm({ prestige: 70 })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.prestige.lt', threshold: 50 }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: realm.relation.attitude', () => {
  it('returns true when relation attitude bucket meets minAttitude (ally)', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const relation = makeRelation('realm_qin', 'realm_zhao', 80)
    const world = makeEmptyWorld({ relations: new Map([[relation.key, relation]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.relation.attitude',
        targetRealmId: 'realm_zhao',
        minAttitude: 'friendly',
      }),
    ).toBe(true)
  })

  it('returns false when relation attitude bucket is below minAttitude', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const relation = makeRelation('realm_qin', 'realm_zhao', -30)
    const world = makeEmptyWorld({ relations: new Map([[relation.key, relation]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.relation.attitude',
        targetRealmId: 'realm_zhao',
        minAttitude: 'neutral',
      }),
    ).toBe(false)
  })

  it('treats absent relation as neutral attitude', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.relation.attitude',
        targetRealmId: 'realm_zhao',
        minAttitude: 'neutral',
      }),
    ).toBe(true)
  })

  it('returns false when target realm is the same as evaluating realm', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.relation.attitude',
        targetRealmId: 'realm_qin',
        minAttitude: 'neutral',
      }),
    ).toBe(false)
  })

  it('uses sorted relation key regardless of argument order', () => {
    const realm = makeRealm({ id: 'realm_zhao' })
    const relation = makeRelation('realm_qin', 'realm_zhao', 90)
    const world = makeEmptyWorld({ relations: new Map([[relation.key, relation]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.relation.attitude',
        targetRealmId: 'realm_qin',
        minAttitude: 'ally',
      }),
    ).toBe(true)
  })
})

describe('evaluatePredicate: realm.zhouInvestiture.has', () => {
  function makeInvestiture(realmId: string, rank: ZhouInvestitureState['rank']): ZhouInvestitureState {
    return {
      realmId,
      recognizedTitle: rank ?? 'duke',
      grantedAtTick: 0,
      expiresAtTick: null,
      source: 'zhou',
      rank,
    }
  }

  it('returns true when realm has any investiture (no rank specified)', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld({
      zhouInvestiture: new Map([['realm_qin', makeInvestiture('realm_qin', 'duke')]]),
    })
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.zhouInvestiture.has' }),
    ).toBe(true)
  })

  it('returns true when realm has investiture matching rank', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld({
      zhouInvestiture: new Map([['realm_qin', makeInvestiture('realm_qin', 'marquis')]]),
    })
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.zhouInvestiture.has', rank: 'marquis' }),
    ).toBe(true)
  })

  it('returns false when realm has investiture but rank does not match', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld({
      zhouInvestiture: new Map([['realm_qin', makeInvestiture('realm_qin', 'count')]]),
    })
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.zhouInvestiture.has', rank: 'duke' }),
    ).toBe(false)
  })

  it('returns false when realm has no investiture', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.zhouInvestiture.has' }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: realm.zhouInvestiture.absent', () => {
  it('returns true when realm has no investiture', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.zhouInvestiture.absent' }),
    ).toBe(true)
  })

  it('returns false when realm has investiture', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const investiture: ZhouInvestitureState = {
      realmId: 'realm_qin',
      recognizedTitle: 'duke',
      grantedAtTick: 0,
      expiresAtTick: null,
      source: 'zhou',
      rank: 'duke',
    }
    const world = makeEmptyWorld({
      zhouInvestiture: new Map([['realm_qin', investiture]]),
    })
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.zhouInvestiture.absent' }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: realm.id.equals', () => {
  it('returns true when realm id matches value', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.id.equals', value: 'realm_qin' }),
    ).toBe(true)
  })

  it('returns false when realm id does not match value', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.id.equals', value: 'realm_zhao' }),
    ).toBe(false)
  })
})
