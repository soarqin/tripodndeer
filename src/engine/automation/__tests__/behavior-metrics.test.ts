import { describe, expect, it } from 'vitest'

import { warKey } from '~/engine/wars'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  DiplomacyEvent,
  DiplomaticTreatyKind,
  DiplomaticTreatyStatus,
  GameDate,
  PersonalityArchetype,
  Realm,
  RealmId,
  RulerState,
  Treaty,
  WarState,
} from '~/shared/types'

import { computeBehaviorMetrics, getCurrentArchetype } from '../behavior-metrics'
import { SCENARIO_START_DATES } from '../date-utils'

const SCENARIO_START: GameDate = SCENARIO_START_DATES.m9

function makeRealm(id: RealmId): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ffffff',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 50 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeRuler(realmId: RealmId, personality: PersonalityArchetype): RulerState {
  return {
    realmId,
    generalId: `${realmId}_ruler`,
    age: 40,
    lifespan: 70,
    health: 100,
    personality,
    personalityDims: {
      expansionDrive: 0.5,
      diplomaticTrust: 0.5,
      caution: 0.5,
      honor: 0.5,
      vindictiveness: 0.5,
      reformInclination: 0.5,
      patience: 0.5,
      preferredStrategy: 'diplomatic',
    },
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function makeWarState(declaredAt: GameDate): WarState {
  return {
    casusBelli: null,
    declaredAt,
    occupiedSites: new Map(),
    peaceProposalId: null,
  }
}

function makeTreaty(
  id: string,
  kind: DiplomaticTreatyKind,
  realmAId: RealmId,
  realmBId: RealmId,
  signedAtTick: number,
  status: DiplomaticTreatyStatus = 'active',
): Treaty {
  return {
    id,
    kind,
    realmAId,
    realmBId,
    status,
    signedAt: SCENARIO_START,
    signedAtTick,
    expiresAt: null,
    expiresAtTick: null,
    endedAt: null,
    endedAtTick: null,
    sourceProposalId: null,
  }
}

function makeWarDeclaredEvent(
  id: string,
  occurredAt: GameDate,
  actor: RealmId,
  target: RealmId,
): DiplomacyEvent {
  return {
    id,
    kind: 'war_declared',
    occurredAt,
    actorRealmId: actor,
    targetRealmId: target,
  }
}

describe('getCurrentArchetype', () => {
  it('returns personality for realm with ruler', () => {
    const world = makeEmptyWorld({
      realms: new Map([['realm_a', makeRealm('realm_a')]]),
      rulers: new Map([['realm_a', makeRuler('realm_a', 'conqueror')]]),
    })
    expect(getCurrentArchetype(world, 'realm_a')).toBe('conqueror')
  })

  it('returns null for realm without ruler', () => {
    const world = makeEmptyWorld({
      realms: new Map([['realm_a', makeRealm('realm_a')]]),
    })
    expect(getCurrentArchetype(world, 'realm_a')).toBeNull()
  })
})

describe('computeBehaviorMetrics — conqueror', () => {
  it('counts 3 war_declared events from one conqueror realm', () => {
    const events: DiplomacyEvent[] = [
      makeWarDeclaredEvent('e1', SCENARIO_START, 'realm_q', 'realm_y'),
      makeWarDeclaredEvent('e2', SCENARIO_START, 'realm_q', 'realm_z'),
      makeWarDeclaredEvent('e3', SCENARIO_START, 'realm_q', 'realm_w'),
    ]
    const world = makeEmptyWorld({
      realms: new Map([
        ['realm_q', makeRealm('realm_q')],
        ['realm_y', makeRealm('realm_y')],
      ]),
      rulers: new Map([
        ['realm_q', makeRuler('realm_q', 'conqueror')],
        ['realm_y', makeRuler('realm_y', 'steward')],
      ]),
      diplomacyHistory: events,
    })

    const metrics = computeBehaviorMetrics(world, SCENARIO_START)
    expect(metrics.conqueror.warsDeclared).toBe(3)
    expect(metrics.conqueror.sampleSize).toBe(1)
  })
})

describe('computeBehaviorMetrics — steward', () => {
  it('computes active war years from world.wars (world.tick=200, declared at scenarioStart)', () => {
    const wars = new Map([
      [warKey('realm_x', 'realm_y'), makeWarState(SCENARIO_START)],
    ])
    const world = makeEmptyWorld({
      tick: 200,
      realms: new Map([
        ['realm_x', makeRealm('realm_x')],
        ['realm_y', makeRealm('realm_y')],
      ]),
      rulers: new Map([
        ['realm_x', makeRuler('realm_x', 'steward')],
        ['realm_y', makeRuler('realm_y', 'conqueror')],
      ]),
      wars,
    })

    const metrics = computeBehaviorMetrics(world, SCENARIO_START)
    expect(metrics.steward.warYears).toBeCloseTo(200 / 36, 2)
    expect(metrics.steward.sampleSize).toBe(1)
  })

  it('computes ended war years from war_declared event + matching truce', () => {
    const events: DiplomacyEvent[] = [
      makeWarDeclaredEvent('e1', SCENARIO_START, 'realm_x', 'realm_y'),
    ]
    const treaties = new Map([
      ['t1', makeTreaty('t1', 'truce', 'realm_x', 'realm_y', 100)],
    ])
    const world = makeEmptyWorld({
      tick: 500,
      realms: new Map([
        ['realm_x', makeRealm('realm_x')],
        ['realm_y', makeRealm('realm_y')],
      ]),
      rulers: new Map([
        ['realm_x', makeRuler('realm_x', 'steward')],
        ['realm_y', makeRuler('realm_y', 'conqueror')],
      ]),
      diplomacyHistory: events,
      treaties,
    })

    const metrics = computeBehaviorMetrics(world, SCENARIO_START)
    expect(metrics.steward.warYears).toBeCloseTo(100 / 36, 2)
  })

  it('merges overlapping intervals to avoid double-counting', () => {
    const oneYearLater: GameDate = { ...SCENARIO_START, yearBC: 452 }
    const wars = new Map([
      [warKey('realm_x', 'realm_y'), makeWarState(SCENARIO_START)],
      [warKey('realm_x', 'realm_z'), makeWarState(oneYearLater)],
    ])
    const world = makeEmptyWorld({
      tick: 200,
      realms: new Map([
        ['realm_x', makeRealm('realm_x')],
        ['realm_y', makeRealm('realm_y')],
        ['realm_z', makeRealm('realm_z')],
      ]),
      rulers: new Map([
        ['realm_x', makeRuler('realm_x', 'steward')],
        ['realm_y', makeRuler('realm_y', 'conqueror')],
        ['realm_z', makeRuler('realm_z', 'conqueror')],
      ]),
      wars,
    })

    const metrics = computeBehaviorMetrics(world, SCENARIO_START)
    expect(metrics.steward.warYears).toBeCloseTo(200 / 36, 2)
    const sumWithoutMerge = 200 / 36 + (200 - 36) / 36
    expect(metrics.steward.warYears).toBeLessThan(sumWithoutMerge)
  })

  it('skips wars with no matching truce and no active entry', () => {
    const events: DiplomacyEvent[] = [
      makeWarDeclaredEvent('e1', SCENARIO_START, 'realm_x', 'realm_y'),
    ]
    const world = makeEmptyWorld({
      tick: 500,
      realms: new Map([
        ['realm_x', makeRealm('realm_x')],
        ['realm_y', makeRealm('realm_y')],
      ]),
      rulers: new Map([
        ['realm_x', makeRuler('realm_x', 'steward')],
        ['realm_y', makeRuler('realm_y', 'conqueror')],
      ]),
      diplomacyHistory: events,
    })

    const metrics = computeBehaviorMetrics(world, SCENARIO_START)
    expect(metrics.steward.warYears).toBe(0)
    expect(metrics.steward.sampleSize).toBe(1)
  })
})

describe('computeBehaviorMetrics — schemer', () => {
  it('counts all alliance treaties (active and expired)', () => {
    const treaties = new Map([
      ['t1', makeTreaty('t1', 'alliance', 'realm_s', 'realm_a', 50, 'active')],
      ['t2', makeTreaty('t2', 'alliance', 'realm_s', 'realm_b', 100, 'expired')],
    ])
    const world = makeEmptyWorld({
      realms: new Map([
        ['realm_s', makeRealm('realm_s')],
        ['realm_a', makeRealm('realm_a')],
        ['realm_b', makeRealm('realm_b')],
      ]),
      rulers: new Map([
        ['realm_s', makeRuler('realm_s', 'schemer')],
        ['realm_a', makeRuler('realm_a', 'conqueror')],
        ['realm_b', makeRuler('realm_b', 'conqueror')],
      ]),
      treaties,
    })

    const metrics = computeBehaviorMetrics(world, SCENARIO_START)
    expect(metrics.schemer.alliances).toBe(2)
    expect(metrics.schemer.sampleSize).toBe(1)
  })
})

describe('computeBehaviorMetrics — unattributed', () => {
  it('counts war_declared events from realms without ruler, excludes from archetype buckets', () => {
    const events: DiplomacyEvent[] = [
      makeWarDeclaredEvent('e1', SCENARIO_START, 'realm_orphan', 'realm_other'),
    ]
    const world = makeEmptyWorld({
      realms: new Map([
        ['realm_orphan', makeRealm('realm_orphan')],
        ['realm_other', makeRealm('realm_other')],
      ]),
      diplomacyHistory: events,
    })

    const metrics = computeBehaviorMetrics(world, SCENARIO_START)
    expect(metrics.unattributedActions).toBe(1)
    expect(metrics.conqueror.warsDeclared).toBe(0)
    expect(metrics.conqueror.sampleSize).toBe(0)
    expect(metrics.steward.sampleSize).toBe(0)
    expect(metrics.schemer.sampleSize).toBe(0)
  })
})
