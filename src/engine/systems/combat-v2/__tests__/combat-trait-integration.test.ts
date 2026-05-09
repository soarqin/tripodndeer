import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setCombatVarianceEnabled } from '~/engine/random'
import type { Army, Realm } from '~/shared/types'
import { resolveCombat } from '../combat-v2'
import type { BattleContext, Composition } from '../combat-v2'

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

function makeRealm(id: string, traits: readonly string[]): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits,
    politicalSystem: 'enfeoffment',
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

describe('combat-v2 trait integration', () => {
  beforeEach(() => setCombatVarianceEnabled(false))
  afterEach(() => setCombatVarianceEnabled(true))

  it('attacker with shang_yang_reform_done trait gets +10% combat power', () => {
    const attackerRealm = makeRealm('realm_qin', ['shang_yang_reform_done'])
    const result = resolveCombat(makeContext({ attackerRealm }))

    const traitStep = result.steps.find((s) => s.name === 'trait-multiplier')
    expect(traitStep).toBeDefined()
    expect(traitStep?.attackerMultiplier).toBeCloseTo(1.1, 5)
    expect(traitStep?.defenderMultiplier).toBe(1)
  })

  it('defender with hu_fu_qi_she_done trait gets +20% combat power', () => {
    const defenderRealm = makeRealm('realm_zhao', ['hu_fu_qi_she_done'])
    const result = resolveCombat(makeContext({ defenderRealm }))

    const traitStep = result.steps.find((s) => s.name === 'trait-multiplier')
    expect(traitStep).toBeDefined()
    expect(traitStep?.attackerMultiplier).toBe(1)
    expect(traitStep?.defenderMultiplier).toBeCloseTo(1.2, 5)
  })

  it('no traits on either realm produces no trait-multiplier step', () => {
    const attackerRealm = makeRealm('realm_qin', [])
    const defenderRealm = makeRealm('realm_han', [])
    const result = resolveCombat(makeContext({ attackerRealm, defenderRealm }))

    const traitStep = result.steps.find((s) => s.name === 'trait-multiplier')
    expect(traitStep).toBeUndefined()
  })

  it('both attacker and defender traits combine correctly', () => {
    const attackerRealm = makeRealm('realm_qin', ['shang_yang_reform_done'])
    const defenderRealm = makeRealm('realm_zhao', ['hu_fu_qi_she_done'])
    const result = resolveCombat(makeContext({ attackerRealm, defenderRealm }))

    const traitStep = result.steps.find((s) => s.name === 'trait-multiplier')
    expect(traitStep).toBeDefined()
    expect(traitStep?.attackerMultiplier).toBeCloseTo(1.1, 5)
    expect(traitStep?.defenderMultiplier).toBeCloseTo(1.2, 5)
  })

  it('regression: combat without realm context produces same result as before', () => {
    const noRealmCtx = makeContext()
    const noTraitCtx = makeContext({
      attackerRealm: makeRealm('realm_qin', []),
      defenderRealm: makeRealm('realm_han', []),
    })

    const noRealmResult = resolveCombat(noRealmCtx)
    const noTraitResult = resolveCombat(noTraitCtx)

    expect(noRealmResult.winner).toBe(noTraitResult.winner)
    expect(noRealmResult.attackerLoss).toBe(noTraitResult.attackerLoss)
    expect(noRealmResult.defenderLoss).toBe(noTraitResult.defenderLoss)
  })
})
