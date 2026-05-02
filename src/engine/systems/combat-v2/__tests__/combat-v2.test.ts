import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setCombatVarianceEnabled } from '~/engine/random'
import type { Army, General, RNGState, Site, World } from '~/shared/types'
import { resolveCombat as resolveLegacyCombat } from '../../combat/combat'
import { resolveCombat } from '../combat-v2'
import { combatV2Step } from '../combat-v2-step'
import type { BattleContext, Composition } from '../combat-v2'

const rng: RNGState = { seed: 0, counter: 0 }
const infantry: Composition = { infantry: 1, chariot: 0, cavalry: 0, crossbow: 0 }

function makeArmy(overrides: Partial<Army> = {}): Army {
  return {
    id: 'army_attacker',
    realmId: 'realm_qin',
    manpower: 1000,
    location: 'site_1',
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
    ...overrides,
  }
}

function makeGeneral(overrides: Partial<General> = {}): General {
  return {
    id: 'general_qin',
    realmId: 'realm_qin',
    name: 'Qin General',
    might: 0,
    command: 10000,
    loyalty: 80,
    ...overrides,
  }
}

function makeSite(id: string, ownerId: string | null, terrainType?: BattleContext['terrain']): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
    ...(terrainType ? { terrainType } : {}),
  } as Site
}

function makeWorld(
  armies: readonly Army[],
  sites: readonly Site[],
  generals: readonly General[] = [],
  yearBC = 260,
): World {
  return {
    date: { yearBC, season: 'spring', month: 1, xun: 'shang' },
    tick: 0,
    sites: new Map(sites.map((site) => [site.id, site])),
    realms: new Map(),
    armies: new Map(armies.map((army) => [army.id, army])),
    edges: new Map(),
    wars: new Map(),
    peaceProposals: new Map(),
    relations: new Map(),
    diplomaticProposals: new Map(),
    treaties: new Map(),
    diplomacyHistory: [],
    coalitions: new Map(),
    zhouInvestiture: new Map(),
    generals: new Map(generals.map((general) => [general.id, general])),
    rulers: new Map(),
    eventChainStates: new Map(),
    reformStates: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    edicts: new Map(),
    governorAssignments: new Map(),
    playerRealmId: 'realm_qin',
    rngState: rng,
    phases: [],
    pendingOrders: [],
  }
}

function makeContext(overrides: Partial<BattleContext> = {}): BattleContext {
  const attackerArmy = makeArmy()
  const defenderArmies = [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 500 })]

  return {
    attackerArmy,
    defenderArmies,
    attackerGeneral: null,
    defenderGeneral: null,
    terrain: 'plains',
    battleType: 'field',
    passDefenseBonus: 0,
    siegeBonus: 0,
    attackerComposition: infantry,
    defenderComposition: infantry,
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    ...overrides,
  }
}

describe('resolveCombat v2', () => {
  beforeEach(() => setCombatVarianceEnabled(false))
  afterEach(() => setCombatVarianceEnabled(true))

  it('matches legacy winner for neutral infantry on plains', () => {
    const attacker = makeArmy({ manpower: 1000 })
    const defenders = [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 500 })]
    const legacy = resolveLegacyCombat(attacker, defenders)

    const result = resolveCombat(makeContext({ attackerArmy: attacker, defenderArmies: defenders }))

    expect(result.winner).toBe(legacy.winner)
  })

  it('mountain terrain gives the defender a significant advantage', () => {
    const result = resolveCombat(makeContext({
      attackerArmy: makeArmy({ manpower: 1000 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 800 })],
      terrain: 'mountains',
    }))

    expect(result.winner).toBe('defender')
    expect(result.steps.find((step) => step.name === 'terrain')?.defenderMultiplier).toBe(1.5)
  })

  it('pass defense bonus increases defender power', () => {
    const result = resolveCombat(makeContext({
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 1400 })],
      battleType: 'pass-assault',
      passDefenseBonus: 0.2,
    }))

    expect(result.winner).toBe('defender')
    expect(result.steps.some((step) => step.name === 'pass-defense' && step.defenderMultiplier === 1.2)).toBe(true)
  })

  it('commits only attacker manpower within the general command cap', () => {
    const result = resolveCombat(makeContext({
      attackerArmy: makeArmy({ manpower: 8000 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 8000 })],
      attackerGeneral: makeGeneral({ command: 5000 }),
    }))

    expect(result.winner).toBe('defender')
  })

  it('attrs.wu raises the army cap by 100 per point (wu=20 yields +2000)', () => {
    const baseContext = makeContext({
      attackerArmy: makeArmy({ manpower: 8000 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 6500 })],
      attackerGeneral: makeGeneral({ command: 5000 }),
    })
    const wuContext = makeContext({
      attackerArmy: makeArmy({ manpower: 8000 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 6500 })],
      attackerGeneral: makeGeneral({
        command: 5000,
        attrs: { wu: 20, zheng: 0, jiao: 0, mou: 0, xue: 0, po: 0 },
      }),
    })

    const baseResult = resolveCombat(baseContext)
    const wuResult = resolveCombat(wuContext)

    expect(baseResult.winner).toBe('defender')
    expect(wuResult.winner).toBe('attacker')
  })

  it('attrs.wu=0 leaves the army cap unchanged', () => {
    const noAttrsContext = makeContext({
      attackerArmy: makeArmy({ manpower: 8000 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 6500 })],
      attackerGeneral: makeGeneral({ command: 5000 }),
    })
    const zeroWuContext = makeContext({
      attackerArmy: makeArmy({ manpower: 8000 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 6500 })],
      attackerGeneral: makeGeneral({
        command: 5000,
        attrs: { wu: 0, zheng: 10, jiao: 10, mou: 10, xue: 10, po: 10 },
      }),
    })

    const noAttrsResult = resolveCombat(noAttrsContext)
    const zeroWuResult = resolveCombat(zeroWuContext)

    expect(noAttrsResult).toEqual(zeroWuResult)
    expect(zeroWuResult.winner).toBe('defender')
  })

  it('zero defender manpower gives attacker a lossless win', () => {
    const result = resolveCombat(makeContext({ defenderArmies: [] }))

    expect(result).toEqual({ winner: 'attacker', attackerLoss: 0, defenderLoss: 0, deadGenerals: [], steps: [] })
  })

  it('large defender advantage makes defender win', () => {
    const result = resolveCombat(makeContext({
      attackerArmy: makeArmy({ manpower: 500 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 2000 })],
    }))

    expect(result.winner).toBe('defender')
    expect(result.attackerLoss).toBe(150)
    expect(result.defenderLoss).toBe(0)
  })

  it('crossbow attackers have counter advantage against chariots', () => {
    const result = resolveCombat(makeContext({
      attackerComposition: { infantry: 0, chariot: 0, cavalry: 0, crossbow: 1 },
      defenderComposition: { infantry: 0, chariot: 1, cavalry: 0, crossbow: 0 },
    }))

    expect(result.steps.find((step) => step.name === 'counter')?.attackerMultiplier).toBeGreaterThan(1)
  })

  it('chariot attackers have counter disadvantage against crossbows', () => {
    const result = resolveCombat(makeContext({
      attackerComposition: { infantry: 0, chariot: 1, cavalry: 0, crossbow: 0 },
      defenderComposition: { infantry: 0, chariot: 0, cavalry: 0, crossbow: 1 },
    }))

    expect(result.steps.find((step) => step.name === 'counter')?.attackerMultiplier).toBeLessThan(1)
  })

  it('general might adds attacker power', () => {
    const result = resolveCombat(makeContext({
      attackerArmy: makeArmy({ manpower: 900 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 1000 })],
      attackerGeneral: makeGeneral({ might: 12 }),
    }))

    expect(result.winner).toBe('attacker')
    expect(result.steps.find((step) => step.name === 'might')?.attackerMultiplier).toBe(1.12)
  })

  it('ignores general strategy and learning when selecting tactics and resolving combat', () => {
    const baseContext = makeContext({
      attackerArmy: makeArmy({ manpower: 500 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 2000 })],
      attackerGeneral: makeGeneral({ might: 20 }),
      defenderGeneral: makeGeneral({ id: 'general_han', realmId: 'realm_han', name: 'Han General', might: 10 }),
    })
    const tunedContext = makeContext({
      attackerArmy: makeArmy({ manpower: 500 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 2000 })],
      attackerGeneral: makeGeneral({ might: 20, strategy: 12, learning: 9 }),
      defenderGeneral: makeGeneral({
        id: 'general_han',
        realmId: 'realm_han',
        name: 'Han General',
        might: 10,
        strategy: 7,
        learning: 4,
      }),
    })

    const baseResult = resolveCombat(baseContext)
    const tunedResult = resolveCombat(tunedContext)

    expect(baseResult.steps.find((step) => step.name === 'tactic')).toEqual(
      tunedResult.steps.find((step) => step.name === 'tactic'),
    )
    expect(tunedResult).toEqual(baseResult)
  })

  it('records modifier steps in pipeline order', () => {
    const result = resolveCombat(makeContext({ battleType: 'pass-assault', passDefenseBonus: 0.1 }))

    expect(result.steps.map((step) => step.name)).toEqual([
      'base-power',
      'counter',
      'terrain',
      'pass-defense',
      'tactic',
      'variance',
    ])
  })

  it('fixed seed can kill the losing general', () => {
    const defenderGeneral = makeGeneral({ id: 'general_han', realmId: 'realm_han', name: 'Han General' })
    const result = resolveCombat(makeContext({ defenderGeneral, date: { yearBC: 25, season: 'spring', month: 1, xun: 'shang' } }))

    expect(result.winner).toBe('attacker')
    expect(result.deadGenerals).toContain('general_han')
  })

  it('variance off makes identical inputs produce identical outputs', () => {
    const ctx = makeContext()

    expect(resolveCombat(ctx)).toEqual(resolveCombat(ctx))
  })

  it('tracks dead generals in BattleResolution', () => {
    const attackerGeneral = makeGeneral({ id: 'general_qin' })
    const result = resolveCombat(makeContext({
      attackerGeneral,
      date: { yearBC: 34, season: 'spring', month: 1, xun: 'shang' },
    }))

    expect(result.deadGenerals).toEqual(['general_qin'])
  })

  it('applies siege defense instead of pass defense for siege assaults', () => {
    const result = resolveCombat(makeContext({
      battleType: 'siege-assault',
      passDefenseBonus: 0.9,
      siegeBonus: 0.25,
    }))

    expect(result.steps.some((step) => step.name === 'pass-defense')).toBe(false)
    expect(result.steps.find((step) => step.name === 'siege-defense')?.defenderMultiplier).toBe(1.25)
  })
})

describe('combatV2Step', () => {
  beforeEach(() => setCombatVarianceEnabled(false))
  afterEach(() => setCombatVarianceEnabled(true))

  it('removes a dead general from the generals map and emits an event', () => {
    const attacker = makeArmy({
      state: 'marching',
      destination: 'site_2',
      source: 'site_1',
      ticksRemaining: 0,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 500,
      location: 'site_2',
      generalId: 'general_han',
    })
    const defenderGeneral = makeGeneral({ id: 'general_han', realmId: 'realm_han', name: 'Han General' })
    const world = makeWorld(
      [attacker, defender],
      [makeSite('site_1', 'realm_qin'), makeSite('site_2', 'realm_han')],
      [defenderGeneral],
      25,
    )

    const result = combatV2Step(world, rng)

    expect(result.world.generals.has('general_han')).toBe(false)
    expect(result.events).toContainEqual({
      type: 'generalDied',
      payload: {
        generalId: 'general_han',
        generalName: 'Han General',
        realmId: 'realm_han',
        battleSiteId: 'site_2',
      },
    })
  })
})
