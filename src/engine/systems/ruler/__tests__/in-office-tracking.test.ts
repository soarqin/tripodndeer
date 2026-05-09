import { describe, expect, it } from 'vitest'
import { rulerLifecyclePhase } from '../ruler-lifecycle'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { RulerStateSchema } from '~/shared/schemas'
import type {
  GameDate,
  General,
  GeneralId,
  Realm,
  RealmId,
  RulerState,
} from '~/shared/types'

const yearStart: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const rng = { seed: 42, counter: 0 }

function makeGeneral(id: GeneralId, realmId: RealmId, overrides: Partial<General> = {}): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty: 80,
    age: 35,
    attrs: { wu: 50, zheng: 50, jiao: 50, mou: 50, xue: 50, po: 50 },
    specialty: 'administrator',
    loyaltyState: 'loyal',
    ...overrides,
  }
}

function makeRuler(realmId: RealmId, overrides: Partial<RulerState> = {}): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}`,
    age: 64,
    lifespan: 65,
    health: 80,
    personality: 'steward',
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
    ...overrides,
  }
}

function makeRealm(id: RealmId, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ffffff',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 1000, taxRate: 0.1 },
    rulerId: `general_${id}`,
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

describe('RulerState.inOfficeSinceTick', () => {
  it('schema requires inOfficeSinceTick (defaults to 0)', () => {
    const validRuler = {
      realmId: 'realm_qin',
      generalId: 'gen_zhao_xiang',
      age: 45,
      lifespan: 70,
      health: 80,
      personality: 'conqueror' as const,
      successionLawId: 'primogeniture' as const,
      inOfficeSinceTick: 100,
    }
    const result = RulerStateSchema.safeParse(validRuler)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.inOfficeSinceTick).toBe(100)
    }
  })

  it('rulerLifecyclePhase sets inOfficeSinceTick = world.tick when AI heir takes office', () => {
    const realmId: RealmId = 'realm_zhao'
    const oldRulerGen = makeGeneral(`general_${realmId}`, realmId)
    const heir = makeGeneral('g_heir_zhao', realmId, { loyalty: 90, specialty: 'commander' })

    const world = makeEmptyWorld({
      date: yearStart,
      tick: 42,
      playerRealmId: 'realm_qin',
      rulers: new Map([[realmId, makeRuler(realmId, { age: 64, lifespan: 65 })]]),
      generals: new Map([
        [oldRulerGen.id, oldRulerGen],
        [heir.id, heir],
      ]),
      realms: new Map([[realmId, makeRealm(realmId)]]),
    })

    const result = rulerLifecyclePhase(world, rng)

    const newRuler = result.world.rulers.get(realmId)
    expect(newRuler).toBeDefined()
    expect(newRuler?.generalId).toBe('g_heir_zhao')
    expect(newRuler?.inOfficeSinceTick).toBe(42)
  })

  it('player ruler crisis preserves the original inOfficeSinceTick (UI handles installation)', () => {
    const realmId: RealmId = 'realm_qin'
    const oldRulerGen = makeGeneral(`general_${realmId}`, realmId)
    const heir = makeGeneral('g_heir_qin', realmId, { loyalty: 90 })

    const world = makeEmptyWorld({
      date: yearStart,
      tick: 99,
      playerRealmId: 'realm_qin',
      rulers: new Map([
        [realmId, makeRuler(realmId, { age: 64, lifespan: 65, inOfficeSinceTick: 5 })],
      ]),
      generals: new Map([
        [oldRulerGen.id, oldRulerGen],
        [heir.id, heir],
      ]),
      realms: new Map([[realmId, makeRealm(realmId)]]),
    })

    const result = rulerLifecyclePhase(world, rng)

    expect(result.world.rulers.get(realmId)?.inOfficeSinceTick).toBe(5)
  })

  it('healthy ruler keeps original inOfficeSinceTick across years', () => {
    const realmId: RealmId = 'realm_zhao'
    const world = makeEmptyWorld({
      date: yearStart,
      tick: 200,
      rulers: new Map([
        [realmId, makeRuler(realmId, { age: 30, lifespan: 65, health: 80, inOfficeSinceTick: 12 })],
      ]),
    })

    const result = rulerLifecyclePhase(world, rng)

    expect(result.world.rulers.get(realmId)?.inOfficeSinceTick).toBe(12)
  })
})
