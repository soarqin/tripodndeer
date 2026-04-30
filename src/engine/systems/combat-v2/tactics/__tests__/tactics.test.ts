import { describe, expect, it } from 'vitest'

import { TACTIC_EFFECTS } from '~/content/m2/balance'
import type { Army, General } from '~/shared/types'
import type { BattleContext, Composition } from '../../combat-v2'
import { pickTactic } from '../index'

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

function makeContext(overrides: Partial<BattleContext> = {}): BattleContext {
  return {
    attackerArmy: makeArmy(),
    defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 1000 })],
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

describe('pickTactic registry', () => {
  it('triggers bei-shui when general might>=15 and attacker is weak', () => {
    const ctx = makeContext({
      attackerArmy: makeArmy({ manpower: 500 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 2000 })],
      attackerGeneral: makeGeneral({ might: 15 }),
    })

    expect(pickTactic(ctx)).toEqual(TACTIC_EFFECTS['bei-shui'])
  })

  it('does not trigger bei-shui when general might is below 15', () => {
    const ctx = makeContext({
      attackerArmy: makeArmy({ manpower: 500 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 2000 })],
      attackerGeneral: makeGeneral({ might: 14 }),
    })

    expect(pickTactic(ctx)).not.toEqual(TACTIC_EFFECTS['bei-shui'])
  })

  it('triggers wei-shi on siege-assault battle type', () => {
    const ctx = makeContext({ battleType: 'siege-assault' })

    expect(pickTactic(ctx)).toEqual(TACTIC_EFFECTS['wei-shi'])
  })

  it('returns null when no tactics apply (balanced field battle, no general, mid-ratio)', () => {
    const ctx = makeContext({
      attackerArmy: makeArmy({ manpower: 1300 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 1000 })],
      attackerGeneral: null,
      battleType: 'field',
    })

    expect(pickTactic(ctx)).toBeNull()
  })

  it('priority order: bei-shui takes precedence over sheng-dong', () => {
    // Both bei-shui (might>=15 + weak attacker) and sheng-dong (general + field) qualify
    const ctx = makeContext({
      attackerArmy: makeArmy({ manpower: 500 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 2000 })],
      attackerGeneral: makeGeneral({ might: 20 }),
      battleType: 'field',
    })

    const result = pickTactic(ctx)
    expect(result).toEqual(TACTIC_EFFECTS['bei-shui'])
    expect(result).not.toEqual(TACTIC_EFFECTS['sheng-dong'])
  })

  it('only one tactic triggers at a time (single effect returned)', () => {
    // siege-assault qualifies wei-shi; ensure only one tactic effect comes out
    const ctx = makeContext({
      attackerArmy: makeArmy({ manpower: 500 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 2000 })],
      attackerGeneral: makeGeneral({ might: 20 }),
      battleType: 'siege-assault',
    })

    const result = pickTactic(ctx)
    // bei-shui has higher priority than wei-shi in our list
    expect(result).toEqual(TACTIC_EFFECTS['bei-shui'])
  })

  it('triggers pi-di on pass-assault when no higher-priority tactic applies', () => {
    const ctx = makeContext({
      attackerArmy: makeArmy({ manpower: 1000 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 700 })],
      battleType: 'pass-assault',
    })

    // ratio 1.43 -> qi-zheng skip; no general -> sheng-dong/bei-shui skip;
    // 1000 < 700*1.5=1050 -> yi-zhan skip; pi-di triggers on pass-assault
    expect(pickTactic(ctx)).toEqual(TACTIC_EFFECTS['pi-di'])
  })

  it('triggers qi-zheng for roughly equal forces', () => {
    const ctx = makeContext({
      attackerArmy: makeArmy({ manpower: 1000 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 1000 })],
      battleType: 'field',
    })

    expect(pickTactic(ctx)).toEqual(TACTIC_EFFECTS['qi-zheng'])
  })

  it('triggers you-di when attacker is significantly weaker but no general', () => {
    const ctx = makeContext({
      attackerArmy: makeArmy({ manpower: 400 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 2000 })],
      attackerGeneral: null,
      battleType: 'field',
    })

    expect(pickTactic(ctx)).toEqual(TACTIC_EFFECTS['you-di'])
  })

  it('triggers yi-zhan when attacker has clear advantage (>=1.5x)', () => {
    const ctx = makeContext({
      attackerArmy: makeArmy({ manpower: 2000 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 1000 })],
      attackerGeneral: null,
      battleType: 'field',
    })

    expect(pickTactic(ctx)).toEqual(TACTIC_EFFECTS['yi-zhan'])
  })

  it('triggers sheng-dong when general exists and ratio outside qi-zheng range', () => {
    // Need: general exists + field battle, but NOT bei-shui (might<15 OR not weak), NOT qi-zheng (ratio not in [0.8,1.2])
    const ctx = makeContext({
      attackerArmy: makeArmy({ manpower: 2000 }),
      defenderArmies: [makeArmy({ id: 'army_defender', realmId: 'realm_han', manpower: 1000 })],
      attackerGeneral: makeGeneral({ might: 10 }),
      battleType: 'field',
    })

    // ratio 2.0 -> qi-zheng skip; you-di: 2000>=600 skip; pi-di: not pass skip;
    // sheng-dong: general+field => triggers (before yi-zhan in priority)
    expect(pickTactic(ctx)).toEqual(TACTIC_EFFECTS['sheng-dong'])
  })
})
