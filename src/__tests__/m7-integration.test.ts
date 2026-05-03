/* eslint-disable max-lines-per-function */
import { describe, expect, it, vi } from 'vitest'

import { espionagePhase } from '~/engine/systems/espionage/espionage-phase'
import { planEspionageAction } from '~/engine/systems/ai/ai'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  FactionInfluenceState,
  General,
  GeneralId,
  PersonalityArchetype,
  Realm,
  RealmId,
  RNGState,
  RulerState,
  SpyMission,
  SpyMissionId,
} from '~/shared/types'

const SPY_REALM: RealmId = 'realm_qin'
const TARGET_REALM: RealmId = 'realm_chu'

const SUCCESS_RNG: RNGState = { seed: 1, counter: 0 }

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
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function makeSpy(id: GeneralId, realmId: RealmId, mou: number = 18): General {
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

function makeFactionInfluence(
  realmId: RealmId,
  conservatives: number = 50,
): FactionInfluenceState {
  return {
    realmId,
    influences: new Map([
      ['royal_kin', 50],
      ['noble_clans', 50],
      ['military_meritocracy', 50],
      ['reformists', 50],
      ['conservatives', conservatives],
      ['foreign_clients', 50],
    ]),
  }
}

function makeMission(
  id: SpyMissionId,
  overrides: Partial<SpyMission> = {},
): SpyMission {
  return {
    id,
    spyGeneralId: 'gen_qin_spy',
    spyRealmId: SPY_REALM,
    targetRealmId: TARGET_REALM,
    action: 'reconnaissance',
    startTick: 0,
    resolveTick: 5,
    status: 'in_progress',
    targetGeneralId: null,
    ...overrides,
  }
}

describe('M7 integration: edge cases', () => {
  it('1. spy realm conquered: active mission auto-cancels (spy general removed with realm)', () => {
    // When spy realm is conquered, the spy general is realistically removed too.
    // The phase detects spy_missing → cancels mission deterministically.
    const mission = makeMission('mission_spy_realm_lost')
    const world = makeEmptyWorld({
      tick: 10,
      realms: new Map([
        // SPY_REALM removed (conquered)
        [TARGET_REALM, makeRealm(TARGET_REALM)],
      ]),
      generals: new Map(), // spy general removed too
      spyMissions: new Map([[mission.id, mission]]),
    })

    const result = espionagePhase(world, SUCCESS_RNG)
    const finalMission = result.world.spyMissions.get(mission.id)!

    expect(finalMission.status).toBe('cancelled')
    const cancelEvent = result.events.find((e) => e.type === 'spyMissionCancelled')
    expect(cancelEvent).toBeDefined()
    const payload = cancelEvent!.payload as Record<string, unknown>
    expect(payload.reason).toBe('spy_missing')
    expect(payload.missionId).toBe(mission.id)

    // No effect should be applied: coverage map untouched
    expect(result.world.intelligenceCoverage.size).toBe(0)
  })

  it('2. target realm conquered: active mission resolves but effects gracefully no-op', () => {
    // Spy still exists, but target realm is gone (conquered between mission start and resolveTick).
    // The mission resolves to success (high recon success rate) but applyEventEffect for missing
    // factionInfluences silently no-ops, so target realm state remains untouched.
    const spy = makeSpy('gen_qin_spy', SPY_REALM, 18)
    const mission = makeMission('mission_target_realm_lost', { action: 'rumor' })
    const world = makeEmptyWorld({
      tick: 10,
      realms: new Map([
        [SPY_REALM, makeRealm(SPY_REALM)],
        // TARGET_REALM removed (conquered)
      ]),
      generals: new Map<GeneralId, General>([[spy.id, spy]]),
      // factionInfluences for TARGET_REALM also removed
      factionInfluences: new Map(),
      spyMissions: new Map([[mission.id, mission]]),
    })

    const result = espionagePhase(world, SUCCESS_RNG)
    const finalMission = result.world.spyMissions.get(mission.id)!

    // Mission resolves (not cancelled — current implementation only cancels on spy missing)
    expect(['success', 'failed', 'exposed']).toContain(finalMission.status)

    // Critical: no crash, no orphan factionInfluences entry created
    expect(result.world.factionInfluences.size).toBe(0)
    expect(result.world.factionInfluences.get(TARGET_REALM)).toBeUndefined()
  })

  it('3. spy general dies: active mission auto-cancels via spy_missing', () => {
    // characterLifecyclePhase removes dead spy from generals map.
    // Espionage phase detects spy_missing and cancels mission.
    const mission = makeMission('mission_spy_died')
    const world = makeEmptyWorld({
      tick: 10,
      realms: new Map([
        [SPY_REALM, makeRealm(SPY_REALM)],
        [TARGET_REALM, makeRealm(TARGET_REALM)],
      ]),
      generals: new Map(), // spy general died
      spyMissions: new Map([[mission.id, mission]]),
    })

    const result = espionagePhase(world, SUCCESS_RNG)
    const finalMission = result.world.spyMissions.get(mission.id)!

    expect(finalMission.status).toBe('cancelled')
    const cancelEvent = result.events.find((e) => e.type === 'spyMissionCancelled')
    expect(cancelEvent).toBeDefined()
    const payload = cancelEvent!.payload as Record<string, unknown>
    expect(payload.reason).toBe('spy_missing')

    // No coverage gained
    expect(result.world.intelligenceCoverage.size).toBe(0)
  })

  it('4. M7_ENABLED=false toggle: active missions are not resolved (world unchanged)', async () => {
    vi.resetModules()
    vi.doMock('~/content/m2/balance', async () => {
      const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
        '~/content/m2/balance',
      )
      return { ...actual, M7_ENABLED: false }
    })
    const { espionagePhase: gatedPhase } = await import(
      '~/engine/systems/espionage/espionage-phase'
    )

    const spy = makeSpy('gen_qin_spy', SPY_REALM, 18)
    const mission = makeMission('mission_disabled')
    const world = makeEmptyWorld({
      tick: 10,
      realms: new Map([
        [SPY_REALM, makeRealm(SPY_REALM)],
        [TARGET_REALM, makeRealm(TARGET_REALM)],
      ]),
      generals: new Map<GeneralId, General>([[spy.id, spy]]),
      factionInfluences: new Map([[TARGET_REALM, makeFactionInfluence(TARGET_REALM)]]),
      spyMissions: new Map([[mission.id, mission]]),
    })

    const result = gatedPhase(world, SUCCESS_RNG)

    // World identity preserved — same reference, no mutation
    expect(result.world).toBe(world)
    expect(result.events).toHaveLength(0)
    // Mission still in_progress (untouched)
    expect(result.world.spyMissions.get(mission.id)!.status).toBe('in_progress')

    vi.doUnmock('~/content/m2/balance')
    vi.resetModules()
  })

  it('5. multiple missions same tick: resolved in ID-sorted order (RNG contract)', () => {
    // Two missions with different insertion order should produce identical results
    // when keyed by ID after sorting. Verifies RNG reproducibility contract.
    const spy = makeSpy('gen_qin_spy', SPY_REALM, 18)
    const m1 = makeMission('mission_aaa', { action: 'reconnaissance' })
    const m2 = makeMission('mission_zzz', { action: 'reconnaissance' })

    const realms = new Map<RealmId, Realm>([
      [SPY_REALM, makeRealm(SPY_REALM)],
      [TARGET_REALM, makeRealm(TARGET_REALM)],
    ])
    const generals = new Map<GeneralId, General>([[spy.id, spy]])

    const worldA = makeEmptyWorld({
      tick: 10,
      realms,
      generals,
      spyMissions: new Map([
        [m1.id, m1],
        [m2.id, m2],
      ]),
    })
    const worldB = makeEmptyWorld({
      tick: 10,
      realms,
      generals,
      // Reverse insertion order
      spyMissions: new Map([
        [m2.id, m2],
        [m1.id, m1],
      ]),
    })

    const rngSeed: RNGState = { seed: 42, counter: 0 }
    const resultA = espionagePhase(worldA, rngSeed)
    const resultB = espionagePhase(worldB, rngSeed)

    // Same RNG state after both — proves sort by ID is the contract
    expect(resultA.nextRng).toEqual(resultB.nextRng)
    // Same status outcomes per mission ID
    expect(resultA.world.spyMissions.get(m1.id)!.status).toBe(
      resultB.world.spyMissions.get(m1.id)!.status,
    )
    expect(resultA.world.spyMissions.get(m2.id)!.status).toBe(
      resultB.world.spyMissions.get(m2.id)!.status,
    )
    // Both missions advanced past in_progress
    expect(['success', 'failed', 'exposed']).toContain(
      resultA.world.spyMissions.get(m1.id)!.status,
    )
    expect(['success', 'failed', 'exposed']).toContain(
      resultA.world.spyMissions.get(m2.id)!.status,
    )
  })

  it('6. mission complete: spy is reusable for next mission (D-A3 sequential reuse)', () => {
    // After a mission resolves (status != in_progress), planEspionageAction
    // may dispatch the same spy on a new mission. Verifies D-A3 contract.
    const spy = makeSpy('gen_qin_spy', SPY_REALM, 18)
    const completedMission: SpyMission = {
      ...makeMission('mission_completed_first'),
      status: 'success', // already resolved
    }

    const realms = new Map<RealmId, Realm>([
      [SPY_REALM, makeRealm(SPY_REALM)],
      [TARGET_REALM, makeRealm(TARGET_REALM)],
    ])
    const generals = new Map<GeneralId, General>([[spy.id, spy]])
    const rulers = new Map<RealmId, RulerState>([
      [SPY_REALM, makeRuler(SPY_REALM, 'schemer')],
    ])

    const world = makeEmptyWorld({
      tick: 20,
      realms,
      generals,
      rulers,
      spyMissions: new Map([[completedMission.id, completedMission]]),
      playerRealmId: 'realm_player_unused',
    })

    const realm = world.realms.get(SPY_REALM)!
    const result = planEspionageAction(world, realm, { seed: 7, counter: 0 })

    // Spy can take a new mission because the previous mission is no longer in_progress
    expect(result.ok).toBe(true)
    const allMissions = [...result.world.spyMissions.values()]
    // Old completed mission preserved + new in_progress mission added
    expect(allMissions).toHaveLength(2)
    const newMission = allMissions.find((m) => m.id !== completedMission.id)!
    expect(newMission.status).toBe('in_progress')
    expect(newMission.spyGeneralId).toBe(spy.id)
    expect(newMission.spyRealmId).toBe(SPY_REALM)
    expect(newMission.startTick).toBe(20)
    // The prior mission remains in success state (history preserved)
    expect(result.world.spyMissions.get(completedMission.id)!.status).toBe('success')
  })
})
