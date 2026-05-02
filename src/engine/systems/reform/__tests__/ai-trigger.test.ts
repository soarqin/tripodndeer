import { describe, expect, it } from 'vitest'

import { reformPhase } from '../reform-phase'
import { makeTestWorld } from '~/engine/__tests__/world-test-fixtures'
import type {
  PersonalityArchetype,
  Realm,
  ReformDefinition,
  RulerState,
  World,
} from '~/shared/types'

function makeRealm(): Realm {
  return {
    id: 'realm_qin',
    displayName: 'Qin',
    fullTitle: 'Qin',
    color: '#ff0000',
    capital: 'site_qin_capital',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 5000, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeRuler(personality: PersonalityArchetype): RulerState {
  return {
    realmId: 'realm_qin',
    generalId: 'gen_ruler',
    age: 30,
    lifespan: 60,
    health: 100,
    personality,
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function makeReformDef(): ReformDefinition {
  return {
    id: 'test_reform',
    displayName: 'Test Reform',
    displayNameZh: '测试',
    trigger: { kind: 'realm.id', value: 'realm_qin' },
    oneShot: true,
    stages: [
      {
        id: 'stage1',
        textZh: 'Stage 1',
        choices: [
          { id: 'pick', labelZh: 'Pick', effects: [], outcome: 'success' },
        ],
        advanceAfterMonths: 12,
      },
    ],
    successTrait: 'shang_yang_reform_done',
    failureTrait: 'reform_failed_scar',
  }
}

function buildWorld(personality: PersonalityArchetype): World {
  return makeTestWorld({
    realms: new Map([['realm_qin', makeRealm()]]),
    rulers: new Map([['realm_qin', makeRuler(personality)]]),
    playerRealmId: 'realm_other',
  })
}

function countTriggers(personality: PersonalityArchetype, samples: number): number {
  const world = buildWorld(personality)
  const def = makeReformDef()
  let triggers = 0
  for (let counter = 1; counter <= samples; counter++) {
    const result = reformPhase(world, { seed: 42, counter }, [def])
    if (result.world.reformStates.has('realm_qin')) triggers++
  }
  return triggers
}

describe('reformPhase AI trigger: builder propensity 0.4', () => {
  it('triggers ~40% over 1000 RNG samples', () => {
    const triggers = countTriggers('builder', 1000)
    expect(triggers).toBeGreaterThanOrEqual(350)
    expect(triggers).toBeLessThanOrEqual(450)
  })
})

describe('reformPhase AI trigger: conqueror propensity 0.25', () => {
  it('triggers ~25% over 1000 RNG samples', () => {
    const triggers = countTriggers('conqueror', 1000)
    expect(triggers).toBeGreaterThanOrEqual(200)
    expect(triggers).toBeLessThanOrEqual(300)
  })
})

describe('reformPhase AI trigger: zero-propensity personalities', () => {
  it('steward: 0 triggers over 1000 samples', () => {
    expect(countTriggers('steward', 1000)).toBe(0)
  })

  it('schemer: 0 triggers over 100 samples', () => {
    expect(countTriggers('schemer', 100)).toBe(0)
  })

  it('learned: 0 triggers over 100 samples', () => {
    expect(countTriggers('learned', 100)).toBe(0)
  })

  it('tyrant: 0 triggers over 100 samples', () => {
    expect(countTriggers('tyrant', 100)).toBe(0)
  })

  it('incompetent: 0 triggers over 100 samples', () => {
    expect(countTriggers('incompetent', 100)).toBe(0)
  })

  it('benevolent: 0 triggers over 100 samples', () => {
    expect(countTriggers('benevolent', 100)).toBe(0)
  })
})

describe('reformPhase AI trigger: determinism', () => {
  it('same world + same seed yields same reform state, events, and nextRng', () => {
    const world = buildWorld('builder')
    const def = makeReformDef()
    const a = reformPhase(world, { seed: 42, counter: 7 }, [def])
    const b = reformPhase(world, { seed: 42, counter: 7 }, [def])
    expect(a.world.reformStates).toEqual(b.world.reformStates)
    expect(a.events).toEqual(b.events)
    expect(a.nextRng).toEqual(b.nextRng)
  })

  it('different seeds produce independent results', () => {
    const world = buildWorld('builder')
    const def = makeReformDef()
    let lastSize = -1
    let sawDifferent = false
    for (let seed = 1; seed <= 50; seed++) {
      const result = reformPhase(world, { seed, counter: 1 }, [def])
      const size = result.world.reformStates.size
      if (lastSize !== -1 && size !== lastSize) sawDifferent = true
      lastSize = size
    }
    expect(sawDifferent).toBe(true)
  })
})

describe('reformPhase AI trigger: missing ruler personality', () => {
  it('realm without ruler → 0 triggers (defensive guard)', () => {
    const world = makeTestWorld({
      realms: new Map([['realm_qin', makeRealm()]]),
      rulers: new Map(),
      playerRealmId: 'realm_other',
    })
    const def = makeReformDef()
    let triggers = 0
    for (let counter = 1; counter <= 200; counter++) {
      const result = reformPhase(world, { seed: 42, counter }, [def])
      if (result.world.reformStates.has('realm_qin')) triggers++
    }
    expect(triggers).toBe(0)
  })
})
