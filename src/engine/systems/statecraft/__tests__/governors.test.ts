import { describe, expect, it } from 'vitest'

import { getGovernorSettlementModifiers } from '../governors'
import type { GovernorAssignment, GovernorModifierKind, Site } from '~/shared/types'
import {
  M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
  M4_GOVERNOR_FOOD_MODIFIER,
  M4_GOVERNOR_TAX_MODIFIER,
  M4_HOUSEHOLD_DIVISOR,
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

describe('statecraft governors', () => {
  it('returns fixed tax and food modifiers from assignment kind only', () => {
    const taxSite = makeSite('site_tax', 'realm_qin', 1000)
    const foodSite = makeSite('site_food', 'realm_qin', 1000)
    const assignments = new Map([
      ['site_tax', makeAssignment('site_tax', 'realm_qin', 'tax_efficiency')],
      ['site_food', makeAssignment('site_food', 'realm_qin', 'food_efficiency')],
    ])

    expect(getGovernorSettlementModifiers(assignments, taxSite)).toEqual({
      taxBaseDelta: M4_GOVERNOR_TAX_MODIFIER,
      foodProductionDelta: 0,
    })
    expect(getGovernorSettlementModifiers(assignments, foodSite)).toEqual({
      taxBaseDelta: 0,
      foodProductionDelta: M4_GOVERNOR_FOOD_MODIFIER,
    })
  })

  it('filters by exact site id, owned site, and matching assignment realm', () => {
    const assignments = new Map([
      ['site_owned', makeAssignment('site_owned', 'realm_qin', 'tax_efficiency')],
      ['site_enemy', makeAssignment('site_enemy', 'realm_qin', 'food_efficiency')],
      ['site_unowned', makeAssignment('site_unowned', 'realm_qin', 'tax_efficiency')],
      ['site_mismatch', makeAssignment('site_other', 'realm_qin', 'tax_efficiency')],
    ])

    expect(getGovernorSettlementModifiers(assignments, makeSite('site_owned', 'realm_qin', 1000))).toEqual({
      taxBaseDelta: M4_GOVERNOR_TAX_MODIFIER,
      foodProductionDelta: 0,
    })
    expect(getGovernorSettlementModifiers(assignments, makeSite('site_enemy', 'realm_zhao', 1000))).toEqual({
      taxBaseDelta: 0,
      foodProductionDelta: 0,
    })
    expect(getGovernorSettlementModifiers(assignments, makeSite('site_unowned', null, 1000))).toEqual({
      taxBaseDelta: 0,
      foodProductionDelta: 0,
    })
    expect(getGovernorSettlementModifiers(assignments, makeSite('site_mismatch', 'realm_qin', 1000))).toEqual({
      taxBaseDelta: 0,
      foodProductionDelta: 0,
    })
  })

  it('replays deterministically for repeated site lookups', () => {
    const site = makeSite('site_qin', 'realm_qin', 1000)
    const assignments = new Map([
      ['site_qin', makeAssignment('site_qin', 'realm_qin', 'food_efficiency')],
    ])

    const first = getGovernorSettlementModifiers(assignments, site)
    const second = getGovernorSettlementModifiers(assignments, site)

    expect(first).toEqual(second)
  })
})
