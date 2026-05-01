import { describe, expect, it } from 'vitest'

import { getGovernorSettlementModifiers } from '../governors'
import type { General, GovernorAssignment, GovernorModifierKind, Site } from '~/shared/types'
import {
  M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
  M4_HOUSEHOLD_DIVISOR,
  M5_GOVERNOR_FOOD_BONUS_PER_ZHENG,
  M5_GOVERNOR_TAX_BONUS_PER_ZHENG,
} from '~/content/m2/balance'

function makeSite(id: string, ownerId: string | null, population: number): Site {
  const households = Math.floor(population / M4_HOUSEHOLD_DIVISOR)
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: {
      population,
      households,
      taxBase: households,
      foodProduction: households * M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
    },
  }
}

function makeAssignment(
  siteId: string,
  realmId: string,
  modifierKind: GovernorModifierKind,
): GovernorAssignment {
  return {
    siteId,
    realmId,
    generalId: `general_${realmId}`,
    assignedAtTick: 12,
    modifierKind,
  }
}

function makeGeneralWithZheng(id: string, realmId: string, zheng: number): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty: 50,
    attrs: { wu: 0, zheng, jiao: 0, mou: 0, xue: 0, po: 0 },
  }
}

describe('statecraft governors', () => {
  it('returns tax and food modifiers scaled by general attrs.zheng', () => {
    const taxSite = makeSite('site_tax', 'realm_qin', 1000)
    const foodSite = makeSite('site_food', 'realm_qin', 1000)
    const assignments = new Map([
      ['site_tax', makeAssignment('site_tax', 'realm_qin', 'tax_efficiency')],
      ['site_food', makeAssignment('site_food', 'realm_qin', 'food_efficiency')],
    ])
    const generals = new Map([
      ['general_realm_qin', makeGeneralWithZheng('general_realm_qin', 'realm_qin', 10)],
    ])

    expect(getGovernorSettlementModifiers(assignments, generals, taxSite)).toEqual({
      taxBaseDelta: Math.floor(M5_GOVERNOR_TAX_BONUS_PER_ZHENG * 10),
      foodProductionDelta: 0,
    })
    expect(getGovernorSettlementModifiers(assignments, generals, foodSite)).toEqual({
      taxBaseDelta: 0,
      foodProductionDelta: Math.floor(M5_GOVERNOR_FOOD_BONUS_PER_ZHENG * 10),
    })
  })

  it('returns zero bonus when general lacks attrs (legacy fallback)', () => {
    const site = makeSite('site_qin', 'realm_qin', 1000)
    const assignments = new Map([
      ['site_qin', makeAssignment('site_qin', 'realm_qin', 'tax_efficiency')],
    ])
    const legacyGeneral: General = {
      id: 'general_realm_qin',
      realmId: 'realm_qin',
      name: 'legacy',
      might: 50,
      command: 50,
      loyalty: 50,
    }
    const generals = new Map([['general_realm_qin', legacyGeneral]])

    expect(getGovernorSettlementModifiers(assignments, generals, site)).toEqual({
      taxBaseDelta: 0,
      foodProductionDelta: 0,
    })
  })

  it('returns zero bonus when generalId is dangling (general not found)', () => {
    const site = makeSite('site_qin', 'realm_qin', 1000)
    const assignments = new Map([
      ['site_qin', makeAssignment('site_qin', 'realm_qin', 'tax_efficiency')],
    ])
    const generals = new Map<string, General>()

    expect(getGovernorSettlementModifiers(assignments, generals, site)).toEqual({
      taxBaseDelta: 0,
      foodProductionDelta: 0,
    })
  })

  it('filters by exact site id, owned site, and matching assignment realm', () => {
    const assignments = new Map([
      ['site_owned', makeAssignment('site_owned', 'realm_qin', 'tax_efficiency')],
      ['site_enemy', makeAssignment('site_enemy', 'realm_qin', 'food_efficiency')],
      ['site_unowned', makeAssignment('site_unowned', 'realm_qin', 'tax_efficiency')],
      ['site_mismatch', makeAssignment('site_other', 'realm_qin', 'tax_efficiency')],
    ])
    const generals = new Map([
      ['general_realm_qin', makeGeneralWithZheng('general_realm_qin', 'realm_qin', 10)],
    ])

    expect(getGovernorSettlementModifiers(assignments, generals, makeSite('site_owned', 'realm_qin', 1000))).toEqual({
      taxBaseDelta: Math.floor(M5_GOVERNOR_TAX_BONUS_PER_ZHENG * 10),
      foodProductionDelta: 0,
    })
    expect(getGovernorSettlementModifiers(assignments, generals, makeSite('site_enemy', 'realm_zhao', 1000))).toEqual({
      taxBaseDelta: 0,
      foodProductionDelta: 0,
    })
    expect(getGovernorSettlementModifiers(assignments, generals, makeSite('site_unowned', null, 1000))).toEqual({
      taxBaseDelta: 0,
      foodProductionDelta: 0,
    })
    expect(getGovernorSettlementModifiers(assignments, generals, makeSite('site_mismatch', 'realm_qin', 1000))).toEqual({
      taxBaseDelta: 0,
      foodProductionDelta: 0,
    })
  })

  it('replays deterministically for repeated site lookups', () => {
    const site = makeSite('site_qin', 'realm_qin', 1000)
    const assignments = new Map([
      ['site_qin', makeAssignment('site_qin', 'realm_qin', 'food_efficiency')],
    ])
    const generals = new Map([
      ['general_realm_qin', makeGeneralWithZheng('general_realm_qin', 'realm_qin', 10)],
    ])

    const first = getGovernorSettlementModifiers(assignments, generals, site)
    const second = getGovernorSettlementModifiers(assignments, generals, site)

    expect(first).toEqual(second)
  })
})
