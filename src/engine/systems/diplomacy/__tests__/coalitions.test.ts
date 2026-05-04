import { describe, expect, it } from 'vitest'
import type {
  Army,
  CoalitionState,
  GameDate,
  PersonalityArchetype,
  Realm,
  RealmId,
  RulerState,
  Site,
  World,
} from '~/shared/types'
import { warKey } from '~/engine/wars'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { applyDiplomacyAction, createCoalitionId, diplomacyLifecycleStep, updateCoalitionPressure } from '../index'

const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const qin = 'realm_qin'
const han = 'realm_han'
const wei = 'realm_wei'
const zhao = 'realm_zhao'
const yan = 'realm_yan'

function makeRealm(id: string, manpowerPool: number): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'aggressive_random',
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    stats: { manpowerPool, manpowerCap: Math.max(5000, manpowerPool), warWeariness: 0 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeSite(id: string, ownerId: string | null): Site {
  return { id, name: id, position: [0, 0], boundary: [], ownerId, polygon: [], adjacency: [], economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 } }
}

function makeArmy(id: string, realmId: string, manpower: number): Army {
  return {
    id,
    realmId,
    manpower,
    location: `${realmId}_capital`,
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
  }
}

function makeRuler(realmId: RealmId, personality: PersonalityArchetype): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}_ruler`,
    age: 40,
    lifespan: 70,
    health: 80,
    personality,
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function baseWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    date: DATE,
    tick: 12,
    sites: new Map([
      ['site_qin_1', makeSite('site_qin_1', qin)],
      ['site_qin_2', makeSite('site_qin_2', qin)],
      ['site_qin_3', makeSite('site_qin_3', qin)],
      ['site_han', makeSite('site_han', han)],
      ['site_wei', makeSite('site_wei', wei)],
      ['site_zhao', makeSite('site_zhao', zhao)],
      ['site_yan', makeSite('site_yan', yan)],
    ]),
    realms: new Map([
      [han, makeRealm(han, 1000)],
      [qin, makeRealm(qin, 160_000)],
      [wei, makeRealm(wei, 1000)],
      [zhao, makeRealm(zhao, 1000)],
      [yan, makeRealm(yan, 1000)],
    ]),
    armies: new Map([
      ['army_qin', makeArmy('army_qin', qin, 40_000)],
      ['army_han', makeArmy('army_han', han, 1000)],
      ['army_wei', makeArmy('army_wei', wei, 1000)],
      ['army_zhao', makeArmy('army_zhao', zhao, 1000)],
      ['army_yan', makeArmy('army_yan', yan, 1000)],
    ]),
    playerRealmId: qin,
    rngState: { seed: 42, counter: 0 },
    ...overrides,
  })
}

function serializeDiplomacy(world: World): string {
  return JSON.stringify({
    relations: [...world.relations.values()].sort((a, b) => a.key.localeCompare(b.key)),
    coalitions: [...world.coalitions.values()].sort((a, b) => a.id.localeCompare(b.id)),
    history: world.diplomacyHistory,
  })
}

function antiQinThreatWorld(threat: number, memberPersonality: PersonalityArchetype, current?: CoalitionState): World {
  const memberRealmIds = [han, wei, zhao, yan]
  return baseWorld({
    realms: new Map([
      [han, makeRealm(han, 1000)],
      [qin, makeRealm(qin, (threat - 18) * 1000)],
      [wei, makeRealm(wei, 1000)],
      [zhao, makeRealm(zhao, 1000)],
      [yan, makeRealm(yan, 1000)],
    ]),
    armies: new Map([
      ['army_qin', makeArmy('army_qin', qin, 0)],
      ['army_han', makeArmy('army_han', han, 1000)],
      ['army_wei', makeArmy('army_wei', wei, 1000)],
      ['army_zhao', makeArmy('army_zhao', zhao, 1000)],
      ['army_yan', makeArmy('army_yan', yan, 1000)],
    ]),
    rulers: new Map(memberRealmIds.map(realmId => [realmId, makeRuler(realmId, memberPersonality)])),
    coalitions: current ? new Map([[current.id, current]]) : new Map(),
  })
}

function coalitionRatio(world: World, memberRealmIds: readonly RealmId[]): number {
  const resolver = (realmId: RealmId): PersonalityArchetype => world.rulers.get(realmId)?.personality ?? 'incompetent'
  const coalition = updateCoalitionPressure(world, resolver).world.coalitions.get(createCoalitionId(qin))
  return (coalition?.memberRealmIds.length ?? 0) / memberRealmIds.length
}

describe('coalition pressure', () => {
  it('applies personality bias to coalition join and leave pressure ratios', () => {
    const memberRealmIds = [han, wei, zhao, yan]
    const current: CoalitionState = {
      id: createCoalitionId(qin),
      targetRealmId: qin,
      memberRealmIds,
      status: 'active',
      formedAt: DATE,
      dissolvedAt: null,
    }

    const schemerJoinAtMid = coalitionRatio(antiQinThreatWorld(60, 'schemer'), memberRealmIds)
    const learnedJoinAtMid = coalitionRatio(antiQinThreatWorld(60, 'learned'), memberRealmIds)
    const tyrantJoinAtMid = coalitionRatio(antiQinThreatWorld(60, 'tyrant'), memberRealmIds)
    const conquerorJoinAtBase = coalitionRatio(antiQinThreatWorld(70, 'conqueror'), memberRealmIds)
    const learnedJoinAtBase = coalitionRatio(antiQinThreatWorld(70, 'learned'), memberRealmIds)
    const incompetentJoinAtBase = coalitionRatio(antiQinThreatWorld(70, 'incompetent'), memberRealmIds)
    const benevolentJoinAtBase = coalitionRatio(antiQinThreatWorld(70, 'benevolent'), memberRealmIds)
    const learnedJoinAtHigh = coalitionRatio(antiQinThreatWorld(84, 'learned'), memberRealmIds)
    const tyrantJoinAtHigh = coalitionRatio(antiQinThreatWorld(84, 'tyrant'), memberRealmIds)
    const schemerStayBelowDissolve = coalitionRatio(antiQinThreatWorld(40, 'schemer', current), memberRealmIds)
    const benevolentStayBelowDissolve = coalitionRatio(antiQinThreatWorld(40, 'benevolent', current), memberRealmIds)

    expect(schemerJoinAtMid).toBeGreaterThan(learnedJoinAtMid)
    expect(schemerJoinAtMid).toBeGreaterThan(tyrantJoinAtMid)
    expect(conquerorJoinAtBase).toBeGreaterThan(learnedJoinAtBase)
    expect(incompetentJoinAtBase).toBeGreaterThan(benevolentJoinAtBase)
    expect(learnedJoinAtHigh).toBeGreaterThan(tyrantJoinAtHigh)
    expect(schemerStayBelowDissolve).toBeGreaterThan(benevolentStayBelowDissolve)
  })

  it('forms, updates, and dissolves flat coalition state at deterministic threshold crossings', () => {
    const formed = updateCoalitionPressure(baseWorld())
    const coalitionId = createCoalitionId(qin)

    expect(formed.world.coalitions.get(coalitionId)).toMatchObject({
      id: coalitionId,
      targetRealmId: qin,
      memberRealmIds: [han, wei, yan, zhao].sort((a, b) => a.localeCompare(b)),
      status: 'active',
      dissolvedAt: null,
    })

    const updated = updateCoalitionPressure({
      ...formed.world,
      realms: new Map([...formed.world.realms].filter(([realmId]) => realmId !== yan)),
    })
    expect(updated.world.coalitions.get(coalitionId)?.memberRealmIds).toEqual([han, wei, zhao])

    const dissolved = updateCoalitionPressure({
      ...updated.world,
      realms: new Map([
        [han, makeRealm(han, 1000)],
        [qin, makeRealm(qin, 1000)],
        [wei, makeRealm(wei, 1000)],
        [zhao, makeRealm(zhao, 1000)],
      ]),
      sites: new Map([
        ['site_qin', makeSite('site_qin', qin)],
        ['site_han', makeSite('site_han', han)],
        ['site_wei', makeSite('site_wei', wei)],
        ['site_zhao', makeSite('site_zhao', zhao)],
      ]),
      armies: new Map([
        ['army_qin', makeArmy('army_qin', qin, 1000)],
        ['army_han', makeArmy('army_han', han, 1000)],
        ['army_wei', makeArmy('army_wei', wei, 1000)],
        ['army_zhao', makeArmy('army_zhao', zhao, 1000)],
      ]),
    })

    expect(dissolved.world.coalitions.get(coalitionId)).toMatchObject({ status: 'dissolved', memberRealmIds: [], dissolvedAt: DATE })
    expect(dissolved.world.diplomacyHistory.map(event => event.kind)).toEqual([
      'coalition_changed',
      'coalition_changed',
      'coalition_changed',
    ])
  })

  it('converges non-Qin realms into anti-Qin pressure deterministically across repeated fixed-seed runs', () => {
    function runScenario(): string {
      const firstWar = applyDiplomacyAction(baseWorld(), { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })
      if (!firstWar.ok) throw new Error('first declaration failed')
      const secondWar = applyDiplomacyAction(firstWar.world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: wei })
      if (!secondWar.ok) throw new Error('second declaration failed')
      const tick = diplomacyLifecycleStep(secondWar.world, secondWar.world.rngState)
      return serializeDiplomacy(tick.world)
    }

    const first = runScenario()
    const second = runScenario()
    const parsed = JSON.parse(first) as { coalitions: readonly { id: string; memberRealmIds: readonly string[]; status: string }[] }
    const antiQin = parsed.coalitions.find(coalition => coalition.id === createCoalitionId(qin))

    expect(first).toBe(second)
    expect(antiQin).toMatchObject({ status: 'active', memberRealmIds: [han, wei, yan, zhao].sort((a, b) => a.localeCompare(b)) })
    expect([...baseWorld().wars.keys()].sort((a, b) => a.localeCompare(b))).toEqual([])
    expect([warKey(qin, han), warKey(qin, wei)].sort((a, b) => a.localeCompare(b))).toEqual(['realm_han:realm_qin', 'realm_qin:realm_wei'].sort((a, b) => a.localeCompare(b)))
  })
})
