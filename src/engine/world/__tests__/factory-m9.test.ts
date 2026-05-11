import { describe, expect, it } from 'vitest'

import { createWorldFromM9Data, loadM9Data } from '../factory'
import { PHASE_ORDER } from '@/engine/phases'
import { aiStrategicStep } from '@/engine/systems/ai/strategic'
import { aiOperationalStep } from '@/engine/systems/ai/operational'
import { aiTacticalStep } from '@/engine/systems/ai/tactical-step'
import { characterLifecyclePhase, characterSpawnPhase } from '@/engine/systems/character'
import { personalityDriftPhase } from '@/engine/systems/character/personality-drift-phase'
import { combatV2Step } from '@/engine/systems/combat-v2'
import { culturalIdentityPhase } from '@/engine/systems/culture/cultural-identity-phase'
import { ideologyDriftPhase } from '@/engine/systems/culture/ideology-drift-phase'
import { prestigeUpdatePhase } from '@/engine/systems/culture/prestige-update-phase'
import { diplomacyLifecycleStep } from '@/engine/systems/diplomacy'
import { diplomaticMemoryPhase } from '@/engine/systems/diplomacy/diplomatic-memory-phase'
import { disasterPhase } from '@/engine/systems/disaster/disaster-phase'
import { economyPhase } from '@/engine/systems/economy'
import { espionagePhase } from '@/engine/systems/espionage/espionage-phase'
import { factionPhase } from '@/engine/systems/faction/faction-phase'
import { historicalEventsPhase } from '@/engine/systems/events'
import { manpowerTick } from '@/engine/systems/manpower'
import { marchStep } from '@/engine/systems/march'
import { orderApplyStep } from '@/engine/systems/orders'
import { recruitmentPhase } from '@/engine/systems/recruitment'
import { reformPhase } from '@/engine/systems/reform'
import { rulerLifecyclePhase } from '@/engine/systems/ruler'
import { siegeStep } from '@/engine/systems/siege'
import { tradePhase } from '@/engine/systems/trade/trade-phase'
import { tutorialPhase } from '@/engine/systems/tutorial/tutorial-phase'
import { victoryCheckStep } from '@/engine/systems/victory'
import { realmDeactivationPhase } from '@/engine/wars/realm-deactivation'
import type { TickPhase } from '@/shared/types'

function phaseName(phase: TickPhase): string {
  if (phase === aiStrategicStep) return 'aiStrategic'
  if (phase === aiOperationalStep) return 'aiOperational'
  if (phase === aiTacticalStep) return 'aiTactical'
  if (phase === orderApplyStep) return 'orderApply'
  if (phase === marchStep) return 'march'
  if (phase === siegeStep) return 'siege'
  if (phase === combatV2Step) return 'combat-v2'
  if (phase === culturalIdentityPhase) return 'culturalIdentity'
  if (phase === manpowerTick) return 'manpower'
  if (phase === espionagePhase) return 'espionage'
  if (phase === rulerLifecyclePhase) return 'rulerLifecycle'
  if (phase === characterLifecyclePhase) return 'characterLifecycle'
  if (phase === characterSpawnPhase) return 'characterSpawn'
  if (phase === recruitmentPhase) return 'recruitment'
  if (phase === ideologyDriftPhase) return 'ideologyDrift'
  if (phase === reformPhase) return 'reform'
  if (phase === victoryCheckStep) return 'victoryCheck'
  if (phase === diplomacyLifecycleStep) return 'diplomacyLifecycle'
  if (phase === economyPhase) return 'economy'
  if (phase === disasterPhase) return 'disaster'
  if (phase === tradePhase) return 'trade'
  if (phase === factionPhase) return 'faction'
  if (phase === historicalEventsPhase) return 'historicalEvents'
  if (phase === diplomaticMemoryPhase) return 'diplomaticMemory'
  if (phase === personalityDriftPhase) return 'personalityDrift'
  if (phase === prestigeUpdatePhase) return 'prestigeUpdate'
  if (phase === realmDeactivationPhase) return 'realmDeactivation'
  if (phase === tutorialPhase) return 'tutorialPhase'
  return 'unknown'
}

describe('loadM9Data', () => {
  it('parses M9 raw JSON through Zod and returns typed M9Data', async () => {
    const data = await loadM9Data()

    expect(data.realms.length).toBe(12)
    expect(data.sites.length).toBe(250)
    expect(data.provinces.length).toBe(38)
    expect(data.regions.length).toBe(9)
    expect(data.characterTemplates.length).toBe(90)
    expect(data.meta.startYearBC).toBe(453)
    expect(data.meta.endYearBC).toBe(221)
    expect(data.meta.playableRealms).toContain('realm_qin')
  })

  it('translates snake_case raw fields to camelCase M9Data fields', async () => {
    const data = await loadM9Data()

    const qin = data.realms.find(r => r.id === 'realm_qin')
    expect(qin).toBeDefined()
    expect(qin?.fullTitle).toBe('秦国')
    expect(qin?.startingTreasury).toBe(500)
    expect(qin?.startingManpower).toBe(800)
    expect(qin?.archetypePersonality).toBe('conqueror')

    const xianyang = data.sites.find(s => s.id === 'site_xianyang')
    expect(xianyang).toBeDefined()
    expect(xianyang?.defenseValue).toBe(4)
    expect(xianyang?.populationBase).toBe(80000)
    expect(xianyang?.historicalOwner).toBe('realm_qin')
  })

  it('filters M9 passes to only runtime-shaped entries', async () => {
    const data = await loadM9Data()
    expect(data.passes.length).toBe(5)
    for (const pass of data.passes) {
      expect(pass.edgeId).toBeTruthy()
      expect(pass.controllerId).toBeTruthy()
      expect(typeof pass.defenseBonus).toBe('number')
      expect(typeof pass.fortification).toBe('number')
    }
  })
})

describe('createWorldFromM9Data — structure', () => {
  it('builds a world with the expected entity counts', async () => {
    const data = await loadM9Data()
    const world = createWorldFromM9Data(data, 42, 'realm_qin')

    expect(world.sites.size).toBe(250)
    expect(world.realms.size).toBe(12)
    expect(world.provinces.size).toBe(38)
    expect(world.regions.size).toBe(9)
    expect(world.characterTemplates.size).toBe(90)
  })

  it('uses M9 start date (453 BC) and seed', async () => {
    const data = await loadM9Data()
    const world = createWorldFromM9Data(data, 42, 'realm_qin')

    expect(world.date).toEqual({ yearBC: 453, season: 'spring', month: 1, xun: 'shang' })
    expect(world.tick).toBe(0)
    expect(world.rngState).toEqual({ seed: 42, counter: 0 })
    expect(world.playerRealmId).toBe('realm_qin')
  })

  it('starts with empty diplomatic and combat collections', async () => {
    const data = await loadM9Data()
    const world = createWorldFromM9Data(data, 42, 'realm_qin')

    expect(world.armies.size).toBe(0)
    expect(world.wars.size).toBe(0)
    expect(world.peaceProposals.size).toBe(0)
    expect(world.relations.size).toBe(0)
    expect(world.treaties.size).toBe(0)
    expect(world.diplomacyHistory).toEqual([])
    expect(world.coalitions.size).toBe(0)
    expect(world.sieges.size).toBe(0)
    expect(world.generals.size).toBe(0)
    expect(world.rulers.size).toBe(0)
    expect(world.adjacencyEdges.size).toBe(0)
    expect(world.edges.size).toBe(0)
  })

  it('loads 5 runtime passes from M9 data', async () => {
    const data = await loadM9Data()
    const world = createWorldFromM9Data(data, 42, 'realm_qin')

    expect(world.passes.size).toBe(5)
    expect(world.passes.has('pass_hangu')).toBe(true)
    expect(world.passes.has('pass_wu')).toBe(true)
  })

  it('seeds intelligenceCoverage and counterIntelStates for every realm', async () => {
    const data = await loadM9Data()
    const world = createWorldFromM9Data(data, 42, 'realm_qin')

    expect(world.counterIntelStates.size).toBe(12)
    expect(world.intelligenceCoverage.size).toBe(12 * 11)
  })

  it('attaches phase pipeline matching PHASE_ORDER', async () => {
    const data = await loadM9Data()
    const world = createWorldFromM9Data(data, 42, 'realm_qin')

    expect(world.phases.map(phaseName)).toEqual(PHASE_ORDER)
  })
})

describe('createWorldFromM9Data — derivation', () => {
  it('derives province.siteIds from site.provinceId (every province has at least one site)', async () => {
    const data = await loadM9Data()
    const world = createWorldFromM9Data(data, 42, 'realm_qin')

    let siteCountAcrossProvinces = 0
    for (const province of world.provinces.values()) {
      expect(province.siteIds.length).toBeGreaterThan(0)
      siteCountAcrossProvinces += province.siteIds.length
    }
    expect(siteCountAcrossProvinces).toBe(250)
  })

  it('derives region.provinceIds from province.regionId (sum across regions equals total provinces)', async () => {
    const data = await loadM9Data()
    const world = createWorldFromM9Data(data, 42, 'realm_qin')

    let provinceCountAcrossRegions = 0
    let regionsWithProvinces = 0
    for (const region of world.regions.values()) {
      if (region.provinceIds.length > 0) regionsWithProvinces++
      provinceCountAcrossRegions += region.provinceIds.length
    }
    expect(provinceCountAcrossRegions).toBe(38)
    expect(regionsWithProvinces).toBeGreaterThanOrEqual(8)
  })

  it('assigns each site to its historical owner and derives realm.initialSites', async () => {
    const data = await loadM9Data()
    const world = createWorldFromM9Data(data, 42, 'realm_qin')

    let totalInitialSites = 0
    for (const realm of world.realms.values()) {
      totalInitialSites += realm.initialSites.length
    }
    expect(totalInitialSites).toBe(250)

    const xianyang = world.sites.get('site_xianyang')
    expect(xianyang?.ownerId).toBe('realm_qin')
    expect(xianyang?.occupation?.occupierId).toBe('realm_qin')
    expect(xianyang?.occupation?.controlLevel).toBe(100)
  })

  it('populates realm.economy from starting_treasury / starting_manpower', async () => {
    const data = await loadM9Data()
    const world = createWorldFromM9Data(data, 42, 'realm_qin')

    const qin = world.realms.get('realm_qin')
    expect(qin?.economy.treasury).toBe(500)
    expect(qin?.economy.foodStores).toBe(800)
  })

  it('preserves M9 ideologyLean per realm', async () => {
    const data = await loadM9Data()
    const world = createWorldFromM9Data(data, 42, 'realm_qin')

    const qin = world.realms.get('realm_qin')
    expect(qin?.ideologyLean).toEqual({ fa: 80, ru: 10, dao: 5, mo: 5, zonghen: 0, bing: 0 })
  })
})
