import { describe, expect, it } from 'vitest'

import { planEspionageAction } from '~/engine/systems/ai/ai'
import { espionagePhase } from '~/engine/systems/espionage/espionage-phase'
import { relationKey } from '~/engine/systems/diplomacy'
import { createInitialRng } from '~/engine/random'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import {
  M7_DISCORD_LOYALTY_DELTA,
} from '~/content/m2/balance'
import type {
  DiplomaticRelation,
  General,
  GeneralId,
  PersonalityArchetype,
  Realm,
  RealmId,
  RNGState,
  RulerState,
  SpyMission,
} from '~/shared/types'

const SPY_REALM: RealmId = 'realm_qin'
const TARGET_REALM: RealmId = 'realm_chu'

function makeRealm(id: RealmId): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeRuler(realmId: RealmId, personality: PersonalityArchetype): RulerState {
  return {
    realmId,
    generalId: `gen_${realmId}_ruler`,
    age: 40,
    lifespan: 70,
    health: 80,
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

function makeSpy(id: GeneralId, realmId: RealmId, mou: number = 0): General {
  return {
    id,
    realmId,
    name: id,
    might: 10,
    command: 10,
    loyalty: 80,
    loyaltyState: 'loyal',
    posts: [],
    age: 35,
    ambition: 'mid',
    specialty: 'spy',
    attrs: { wu: 5, zheng: 5, jiao: 12, mou, xue: 8, po: 8 },
  }
}

function makeCommander(id: GeneralId, realmId: RealmId, loyalty: number = 80): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty,
    loyaltyState: 'loyal',
    posts: [],
    age: 40,
    ambition: 'mid',
    specialty: 'commander',
    attrs: { wu: 15, zheng: 10, jiao: 8, mou: 10, xue: 8, po: 12 },
  }
}

function makeLowTrustRelation(
  spyRealmId: RealmId,
  targetRealmId: RealmId,
): DiplomaticRelation {
  return {
    key: relationKey(spyRealmId, targetRealmId),
    realmAId: spyRealmId < targetRealmId ? spyRealmId : targetRealmId,
    realmBId: spyRealmId < targetRealmId ? targetRealmId : spyRealmId,
    attitude: -50,
    trust: 5,
    updatedAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
  }
}

describe('§12.3.A: spy detected → spyExposedHighRisk event emitted (player observable)', () => {
  it('§12.3.A — discord mission failure with high-risk exposure emits spyExposedHighRisk event', () => {
    const targetGen = makeCommander('gen_chu_target', TARGET_REALM)
    const spy = makeSpy('gen_qin_spy', SPY_REALM, 0)
    const mission: SpyMission = {
      id: 'mission_a_discord',
      spyGeneralId: spy.id,
      spyRealmId: SPY_REALM,
      targetRealmId: TARGET_REALM,
      action: 'discord',
      startTick: 0,
      resolveTick: 5,
      status: 'in_progress',
      targetGeneralId: targetGen.id,
    }
    const world = makeEmptyWorld({
      tick: 10,
      realms: new Map([
        [SPY_REALM, makeRealm(SPY_REALM)],
        [TARGET_REALM, makeRealm(TARGET_REALM)],
      ]),
      generals: new Map<GeneralId, General>([
        [spy.id, spy],
        [targetGen.id, targetGen],
      ]),
      spyMissions: new Map([[mission.id, mission]]),
    })

    let foundHighRiskExposure = false
    let exposedEventEmitted = false
    for (let seed = 1; seed <= 500; seed++) {
      const result = espionagePhase(world, { seed, counter: 0 })
      const finalMission = result.world.spyMissions.get(mission.id)!
      if (finalMission.status === 'exposed') {
        const hasHighRiskEvent = result.events.some((e) => e.type === 'spyExposedHighRisk')
        const hasExposedEvent = result.events.some((e) => e.type === 'spyExposed')
        if (hasHighRiskEvent && hasExposedEvent) {
          foundHighRiskExposure = true
          exposedEventEmitted = true
          const highRiskEvent = result.events.find((e) => e.type === 'spyExposedHighRisk')!
          const payload = highRiskEvent.payload as Record<string, unknown>
          expect(payload).toMatchObject({
            missionId: mission.id,
            spyRealmId: SPY_REALM,
            targetRealmId: TARGET_REALM,
            action: 'discord',
          })
          break
        }
      }
    }

    expect(foundHighRiskExposure, 'discord failure should produce spyExposedHighRisk event').toBe(true)
    expect(exposedEventEmitted, 'spyExposed event should also be emitted alongside high-risk').toBe(true)
  })
})

describe('§12.3.B: Schemer + low trust → mission with action=rumor generated', () => {
  it('§12.3.B — schemer ruler facing low-trust target picks rumor action via M7_ESPIONAGE_WEIGHTS', () => {
    const spy = makeSpy('gen_qin_spy', SPY_REALM, 18)
    const targetGen = makeCommander('gen_chu_commander', TARGET_REALM)
    const realms = new Map<RealmId, Realm>([
      [SPY_REALM, makeRealm(SPY_REALM)],
      [TARGET_REALM, makeRealm(TARGET_REALM)],
    ])
    const generals = new Map<GeneralId, General>([
      [spy.id, spy],
      [targetGen.id, targetGen],
    ])
    const rulers = new Map<RealmId, RulerState>([
      [SPY_REALM, makeRuler(SPY_REALM, 'schemer')],
    ])
    const relations = new Map([
      [
        relationKey(SPY_REALM, TARGET_REALM),
        makeLowTrustRelation(SPY_REALM, TARGET_REALM),
      ],
    ])
    const world = makeEmptyWorld({
      tick: 5,
      realms,
      generals,
      rulers,
      relations,
      playerRealmId: 'realm_player_unused',
    })
    const realm = world.realms.get(SPY_REALM)!

    const result = planEspionageAction(world, realm, createInitialRng(7))

    expect(result.ok).toBe(true)
    const missions = [...result.world.spyMissions.values()]
    expect(missions).toHaveLength(1)
    const created = missions[0]!
    expect(created.action).toBe('rumor')
    expect(created.spyRealmId).toBe(SPY_REALM)
    expect(created.targetRealmId).toBe(TARGET_REALM)
    expect(created.status).toBe('in_progress')

    const targetRelation = world.relations.get(relationKey(SPY_REALM, TARGET_REALM))!
    expect(targetRelation.trust).toBeLessThan(20)
  })
})

describe('§12.3.C: discord success → target general loyalty -15', () => {
  const SUCCESS_RNG: RNGState = { seed: 1, counter: 0 }

  it('§12.3.C — discord success applies M7_DISCORD_LOYALTY_DELTA (-15) to target general', () => {
    const targetInitialLoyalty = 80
    const spy = makeSpy('gen_qin_spy', SPY_REALM, 18)
    const targetGen = makeCommander('gen_chu_target', TARGET_REALM, targetInitialLoyalty)
    const mission: SpyMission = {
      id: 'mission_c_discord',
      spyGeneralId: spy.id,
      spyRealmId: SPY_REALM,
      targetRealmId: TARGET_REALM,
      action: 'discord',
      startTick: 0,
      resolveTick: 5,
      status: 'in_progress',
      targetGeneralId: targetGen.id,
    }
    const world = makeEmptyWorld({
      tick: 10,
      realms: new Map([
        [SPY_REALM, makeRealm(SPY_REALM)],
        [TARGET_REALM, makeRealm(TARGET_REALM)],
      ]),
      generals: new Map<GeneralId, General>([
        [spy.id, spy],
        [targetGen.id, targetGen],
      ]),
      spyMissions: new Map([[mission.id, mission]]),
    })

    const result = espionagePhase(world, SUCCESS_RNG)

    const updatedMission = result.world.spyMissions.get(mission.id)!
    expect(updatedMission.status).toBe('success')

    const updatedTarget = result.world.generals.get(targetGen.id)!
    expect(M7_DISCORD_LOYALTY_DELTA).toBe(-15)
    expect(updatedTarget.loyalty).toBe(targetInitialLoyalty + M7_DISCORD_LOYALTY_DELTA)
    expect(updatedTarget.loyalty).toBe(65)
    expect(targetInitialLoyalty - updatedTarget.loyalty).toBe(Math.abs(M7_DISCORD_LOYALTY_DELTA))
  })

  it('§12.3.C — loyalty change uses Effect path (immutable, preserves all other general fields)', () => {
    const spy = makeSpy('gen_qin_spy', SPY_REALM, 18)
    const targetGen = makeCommander('gen_chu_target', TARGET_REALM, 80)
    const mission: SpyMission = {
      id: 'mission_c_immutable',
      spyGeneralId: spy.id,
      spyRealmId: SPY_REALM,
      targetRealmId: TARGET_REALM,
      action: 'discord',
      startTick: 0,
      resolveTick: 5,
      status: 'in_progress',
      targetGeneralId: targetGen.id,
    }
    const world = makeEmptyWorld({
      tick: 10,
      realms: new Map([
        [SPY_REALM, makeRealm(SPY_REALM)],
        [TARGET_REALM, makeRealm(TARGET_REALM)],
      ]),
      generals: new Map<GeneralId, General>([
        [spy.id, spy],
        [targetGen.id, targetGen],
      ]),
      spyMissions: new Map([[mission.id, mission]]),
    })

    const before = world.generals.get(targetGen.id)!
    const result = espionagePhase(world, SUCCESS_RNG)
    const after = result.world.generals.get(targetGen.id)!

    expect(after.id).toBe(before.id)
    expect(after.realmId).toBe(before.realmId)
    expect(after.specialty).toBe(before.specialty)
    expect(after.attrs).toEqual(before.attrs)
    expect(after.loyalty).not.toBe(before.loyalty)
    expect(world.generals.get(targetGen.id)!.loyalty).toBe(80)
  })
})
