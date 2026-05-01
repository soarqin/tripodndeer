import { describe, expect, it } from 'vitest'

import {
  getEdictSettlementModifiers,
  settleRealmEdictsAfterMonthlySettlement,
} from '../edicts'
import type { EdictKind, EdictState } from '~/shared/types'
import {
  M4_EDICT_GRAIN_RESERVE_FOOD_PRODUCTION_BASIS_POINTS,
  M4_EDICT_GRAIN_RESERVE_TREASURY_COST,
  M4_EDICT_TAX_RELIEF_POPULATION_GROWTH_BASIS_POINTS,
  M4_EDICT_TAX_RELIEF_TAX_INCOME_BASIS_POINTS,
} from '~/content/m2/balance'

function makeEdict(
  id: string,
  realmId: string,
  kind: EdictKind,
  remainingMonths: number,
  status: 'active' | 'expired' = 'active',
): EdictState {
  return {
    id,
    realmId,
    kind,
    startedAtTick: 12,
    durationMonths: Math.max(1, remainingMonths),
    remainingMonths,
    status,
  }
}

describe('statecraft edicts', () => {
  it('returns tax relief modifiers only for active edicts in the settlement realm', () => {
    const edicts = new Map([
      ['edict_tax', makeEdict('edict_tax', 'realm_qin', 'edict_tax_relief', 2)],
      ['edict_expired', makeEdict('edict_expired', 'realm_qin', 'edict_tax_relief', 0, 'expired')],
      ['edict_other', makeEdict('edict_other', 'realm_zhao', 'edict_tax_relief', 2)],
    ])

    expect(getEdictSettlementModifiers(edicts, 'realm_qin')).toEqual({
      taxIncomeBasisPoints: M4_EDICT_TAX_RELIEF_TAX_INCOME_BASIS_POINTS,
      populationGrowthBasisPoints: M4_EDICT_TAX_RELIEF_POPULATION_GROWTH_BASIS_POINTS,
      foodProductionBasisPoints: 0,
      treasuryCost: 0,
    })
  })

  it('returns grain reserve food and treasury modifiers only while active', () => {
    const edicts = new Map([
      ['edict_grain', makeEdict('edict_grain', 'realm_qin', 'edict_grain_reserve', 2)],
    ])

    expect(getEdictSettlementModifiers(edicts, 'realm_qin')).toEqual({
      taxIncomeBasisPoints: 0,
      populationGrowthBasisPoints: 0,
      foodProductionBasisPoints: M4_EDICT_GRAIN_RESERVE_FOOD_PRODUCTION_BASIS_POINTS,
      treasuryCost: M4_EDICT_GRAIN_RESERVE_TREASURY_COST,
    })
  })

  it('expires a one-month edict after applying one monthly settlement', () => {
    const edict = makeEdict('edict_one_month', 'realm_qin', 'edict_tax_relief', 1)
    const edicts = new Map([
      ['edict_one_month', edict],
    ])

    const settled = settleRealmEdictsAfterMonthlySettlement(edicts, 'realm_qin')

    expect(settled).not.toBe(edicts)
    expect(settled.get('edict_one_month')).toEqual({
      ...edict,
      remainingMonths: 0,
      status: 'expired',
    })
    expect(edicts.get('edict_one_month')?.status).toBe('active')
  })

  it('leaves expired and unrelated realm edicts unchanged', () => {
    const edicts = new Map([
      ['edict_expired', makeEdict('edict_expired', 'realm_qin', 'edict_tax_relief', 0, 'expired')],
      ['edict_other', makeEdict('edict_other', 'realm_zhao', 'edict_grain_reserve', 2)],
    ])

    const settled = settleRealmEdictsAfterMonthlySettlement(edicts, 'realm_qin')

    expect(settled).toBe(edicts)
    expect(settled).toEqual(edicts)
  })

  it('settles active edicts in deterministic id order', () => {
    const edicts = new Map([
      ['edict_b', makeEdict('edict_b', 'realm_qin', 'edict_grain_reserve', 2)],
      ['edict_a', makeEdict('edict_a', 'realm_qin', 'edict_tax_relief', 2)],
    ])

    const first = settleRealmEdictsAfterMonthlySettlement(edicts, 'realm_qin')
    const second = settleRealmEdictsAfterMonthlySettlement(edicts, 'realm_qin')

    expect([...first.keys()]).toEqual(['edict_a', 'edict_b'])
    expect(first).toEqual(second)
  })
})
