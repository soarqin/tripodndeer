import { describe, expect, it } from 'vitest'

import { personalityDriftPhase } from '../personality-drift-phase'
import { makeEmptyWorld, TEST_WORLD_DATE } from '~/shared/__tests__/fixtures'
import type {
  DiplomacyEvent,
  Realm,
  RealmId,
  RulerPersonalityProfile,
  RulerState,
  World,
} from '~/shared/types'
import { declareWar } from '~/engine/wars'

const rng = { seed: 42, counter: 0 }

const baseDims: RulerPersonalityProfile = {
  expansionDrive: 0.5,
  diplomaticTrust: 0.5,
  caution: 0.5,
  honor: 0.5,
  vindictiveness: 0.5,
  reformInclination: 0.5,
  patience: 0.5,
  preferredStrategy: 'diplomatic',
}

function makeRealm(id: RealmId, treasury = 1000): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    economy: {
      treasury,
      foodStores: 1000,
      taxRate: 0.1,
    },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
  }
}

function makeRuler(realmId: RealmId, personalityDims = baseDims): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}`,
    age: 40,
    lifespan: 70,
    health: 100,
    personality: 'steward',
    personalityDims,
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function makeWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    realms: new Map([
      ['realm_qin', makeRealm('realm_qin')],
      ['realm_wei', makeRealm('realm_wei')],
    ]),
    rulers: new Map([
      ['realm_qin', makeRuler('realm_qin')],
      ['realm_wei', makeRuler('realm_wei')],
    ]),
    playerRealmId: 'realm_qin',
    ...overrides,
  })
}

function diplomacyEvent(overrides: Partial<DiplomacyEvent>): DiplomacyEvent {
  return {
    id: 'event_1',
    kind: 'combat_observed',
    occurredAt: TEST_WORLD_DATE,
    actorRealmId: null,
    targetRealmId: null,
    ...overrides,
  }
}

describe('personalityDriftPhase', () => {
  it('applies catastrophic_loss as caution +0.05', () => {
    const world = makeWorld({
      diplomacyHistory: [
        diplomacyEvent({
          kind: 'combat_observed',
          actorRealmId: 'realm_qin',
          targetRealmId: 'realm_wei',
          combatPayload: { armySizeTotal: 5000, borderSite: false, victorRealmId: 'realm_qin' },
        }),
      ],
    })

    const result = personalityDriftPhase(world, rng)

    expect(result.world.rulers.get('realm_wei')?.personalityDims.caution).toBeCloseTo(0.55)
    expect(result.nextRng).toBe(rng)
    expect(result.events).toEqual([])
  })

  it('applies repeated_betrayal_success as diplomaticTrust -0.05', () => {
    const world = makeWorld({
      diplomacyHistory: [
        diplomacyEvent({
          kind: 'betrayal',
          actorRealmId: 'realm_wei',
          targetRealmId: 'realm_qin',
        }),
      ],
    })

    const result = personalityDriftPhase(world, rng)

    expect(result.world.rulers.get('realm_wei')?.personalityDims.diplomaticTrust).toBeCloseTo(
      0.45,
    )
  })

  it('applies prolonged_prosperity as reformInclination +0.03', () => {
    const world = makeWorld({
      realms: new Map([
        ['realm_qin', makeRealm('realm_qin')],
        ['realm_wei', makeRealm('realm_wei', 2000)],
      ]),
    })

    const result = personalityDriftPhase(world, rng)

    expect(result.world.rulers.get('realm_wei')?.personalityDims.reformInclination).toBeCloseTo(
      0.53,
    )
  })

  it('keeps all AI ruler dimensions clamped to [0, 1]', () => {
    const world = makeWorld({
      rulers: new Map([
        ['realm_qin', makeRuler('realm_qin')],
        [
          'realm_wei',
          makeRuler('realm_wei', {
            expansionDrive: -0.2,
            diplomaticTrust: 1.2,
            caution: 0.5,
            honor: -1,
            vindictiveness: 2,
            reformInclination: 0.5,
            patience: 1.5,
            preferredStrategy: 'diplomatic',
          }),
        ],
      ]),
    })

    const result = personalityDriftPhase(world, rng)
    const dims = result.world.rulers.get('realm_wei')!.personalityDims

    expect(dims.expansionDrive).toBe(0)
    expect(dims.diplomaticTrust).toBe(1)
    expect(dims.honor).toBe(0)
    expect(dims.vindictiveness).toBe(1)
    expect(dims.patience).toBe(1)
  })

  it('does not change player ruler dimensions', () => {
    const playerDims: RulerPersonalityProfile = { ...baseDims, caution: 0.9 }
    const world = makeWorld({
      rulers: new Map([
        ['realm_qin', makeRuler('realm_qin', playerDims)],
        ['realm_wei', makeRuler('realm_wei')],
      ]),
      diplomacyHistory: [
        diplomacyEvent({
          kind: 'combat_observed',
          actorRealmId: 'realm_wei',
          targetRealmId: 'realm_qin',
          combatPayload: { armySizeTotal: 5000, borderSite: false, victorRealmId: 'realm_wei' },
        }),
      ],
    })

    const result = personalityDriftPhase(world, rng)

    expect(result.world.rulers.get('realm_qin')?.personalityDims).toEqual(playerDims)
  })

  it('does not change archetype', () => {
    const ruler = makeRuler('realm_wei')
    const world = makeWorld({
      rulers: new Map([
        ['realm_qin', makeRuler('realm_qin')],
        ['realm_wei', { ...ruler, personality: 'schemer' }],
      ]),
      diplomacyHistory: [
        diplomacyEvent({
          kind: 'betrayal',
          actorRealmId: 'realm_wei',
          targetRealmId: 'realm_qin',
        }),
      ],
    })

    const result = personalityDriftPhase(world, rng)

    expect(result.world.rulers.get('realm_wei')?.personality).toBe('schemer')
  })

  it('does not apply prosperity drift while realm is currently at war', () => {
    const world = makeWorld({
      realms: new Map([
        ['realm_qin', makeRealm('realm_qin')],
        ['realm_wei', makeRealm('realm_wei', 2000)],
      ]),
      wars: declareWar(new Map(), 'realm_qin', 'realm_wei'),
    })

    const result = personalityDriftPhase(world, rng)

    expect(result.world.rulers.get('realm_wei')?.personalityDims.reformInclination).toBe(0.5)
  })
})
