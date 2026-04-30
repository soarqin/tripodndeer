import { describe, expect, it } from 'vitest'

import type { Army, RNGState, Site, World } from '~/shared/types'
import { combatStep, resolveCombat } from '../combat'

const rng: RNGState = { seed: 0, counter: 0 }

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

function makeSite(id: string, ownerId: string | null): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
  }
}

function makeWorld(armies: readonly Army[], sites: readonly Site[] = []): World {
  return {
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: 0,
    sites: new Map(sites.map((site) => [site.id, site])),
    realms: new Map(),
    armies: new Map(armies.map((army) => [army.id, army])),
    edges: new Map(),
    wars: new Map(),
    peaceProposals: new Map(),
    generals: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    playerRealmId: 'realm_qin',
    rngState: rng,
    phases: [],
    pendingOrders: [],
  }
}

const combatCases: readonly {
  readonly name: string
  readonly attackerManpower: number
  readonly defenderManpowers: readonly number[]
  readonly expected: ReturnType<typeof resolveCombat>
}[] = [
  {
    name: 'attacker 1000 beats defender 500 with bonus 650',
    attackerManpower: 1000,
    defenderManpowers: [500],
    expected: { winner: 'attacker', attackerLoss: 250, defenderLoss: 500 },
  },
  {
    name: 'attacker 500 loses to defender 500 with bonus 650',
    attackerManpower: 500,
    defenderManpowers: [500],
    expected: { winner: 'defender', attackerLoss: 150, defenderLoss: 0 },
  },
  {
    name: 'empty site gives attacker a lossless win',
    attackerManpower: 500,
    defenderManpowers: [],
    expected: { winner: 'attacker', attackerLoss: 0, defenderLoss: 0 },
  },
  {
    name: 'attacker 700 beats defender 500 with bonus 650',
    attackerManpower: 700,
    defenderManpowers: [500],
    expected: { winner: 'attacker', attackerLoss: 250, defenderLoss: 500 },
  },
  {
    name: 'boundary attacker 651 beats defender effective 650',
    attackerManpower: 651,
    defenderManpowers: [500],
    expected: { winner: 'attacker', attackerLoss: 250, defenderLoss: 500 },
  },
  {
    name: 'boundary attacker 650 ties defender effective 650 and loses',
    attackerManpower: 650,
    defenderManpowers: [500],
    expected: { winner: 'defender', attackerLoss: 195, defenderLoss: 0 },
  },
  {
    name: 'attacker 2000 beats two defenders totaling effective 1950',
    attackerManpower: 2000,
    defenderManpowers: [750, 750],
    expected: { winner: 'attacker', attackerLoss: 750, defenderLoss: 1500 },
  },
  {
    name: 'attacker 1950 ties two defenders totaling effective 1950 and loses',
    attackerManpower: 1950,
    defenderManpowers: [750, 750],
    expected: { winner: 'defender', attackerLoss: 585, defenderLoss: 0 },
  },
]

describe('resolveCombat', () => {
  it.each(combatCases)('$name', ({ attackerManpower, defenderManpowers, expected }) => {
    const attacker = makeArmy({ manpower: attackerManpower })
    const defenders = defenderManpowers.map((manpower, index) =>
      makeArmy({
        id: `army_defender_${index}`,
        realmId: 'realm_han',
        manpower,
        location: 'site_2',
      }),
    )

    expect(resolveCombat(attacker, defenders)).toEqual(expected)
  })
})

describe('combatStep', () => {
  it('marching army with ticksRemaining 0 triggers combat', () => {
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
    })
    const world = makeWorld([attacker, defender], [makeSite('site_2', 'realm_han')])

    const result = combatStep(world, rng)

    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.type).toBe('siteConquered')
    expect(result.nextRng).toBe(rng)
  })

  it('idle army is not affected', () => {
    const attacker = makeArmy({ state: 'idle', destination: 'site_2', ticksRemaining: 0 })
    const defender = makeArmy({ id: 'army_defender', realmId: 'realm_han', location: 'site_2' })
    const world = makeWorld([attacker, defender], [makeSite('site_2', 'realm_han')])

    const result = combatStep(world, rng)

    expect(result.events).toHaveLength(0)
    expect(result.world.armies.get(attacker.id)).toEqual(attacker)
    expect(result.world.armies.get(defender.id)).toEqual(defender)
  })

  it('marching army with ticksRemaining greater than 0 is not affected', () => {
    const attacker = makeArmy({ state: 'marching', destination: 'site_2', ticksRemaining: 1 })
    const world = makeWorld([attacker], [makeSite('site_2', 'realm_han')])

    const result = combatStep(world, rng)

    expect(result.events).toHaveLength(0)
    expect(result.world.armies.get(attacker.id)).toEqual(attacker)
  })

})

describe('combatStep attacker victory', () => {
  it('changes site ownership and removes defenders', () => {
    const attacker = makeArmy({
      manpower: 1000,
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
    })
    const world = makeWorld(
      [attacker, defender],
      [makeSite('site_1', 'realm_qin'), makeSite('site_2', 'realm_han')],
    )

    const result = combatStep(world, rng)

    expect(result.world.sites.get('site_2')?.ownerId).toBe('realm_qin')
    expect(result.world.armies.get(attacker.id)).toMatchObject({
      location: 'site_2',
      state: 'idle',
      destination: null,
      source: null,
      manpower: 750,
    })
    expect(result.world.armies.has(defender.id)).toBe(false)
    expect(result.events).toEqual([
      {
        type: 'siteConquered',
        payload: { siteId: 'site_2', byRealm: 'realm_qin', fromRealm: 'realm_han' },
      },
    ])
  })
})
