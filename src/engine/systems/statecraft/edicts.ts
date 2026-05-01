import type { EdictId, EdictState, RealmId } from '~/shared/types'
import {
  M4_EDICT_GRAIN_RESERVE_FOOD_PRODUCTION_BASIS_POINTS,
  M4_EDICT_GRAIN_RESERVE_TREASURY_COST,
  M4_EDICT_TAX_RELIEF_POPULATION_GROWTH_BASIS_POINTS,
  M4_EDICT_TAX_RELIEF_TAX_INCOME_BASIS_POINTS,
} from '~/content/m2/balance'

export interface EdictSettlementModifiers {
  readonly taxIncomeBasisPoints: number
  readonly populationGrowthBasisPoints: number
  readonly foodProductionBasisPoints: number
  readonly treasuryCost: number
}

export function getEdictSettlementModifiers(
  edicts: ReadonlyMap<EdictId, EdictState>,
  realmId: RealmId,
): EdictSettlementModifiers {
  let taxIncomeBasisPoints = 0
  let populationGrowthBasisPoints = 0
  let foodProductionBasisPoints = 0
  let treasuryCost = 0

  for (const edict of sortedActiveEdictsForRealm(edicts, realmId)) {
    if (edict.kind === 'edict_tax_relief') {
      taxIncomeBasisPoints += M4_EDICT_TAX_RELIEF_TAX_INCOME_BASIS_POINTS
      populationGrowthBasisPoints += M4_EDICT_TAX_RELIEF_POPULATION_GROWTH_BASIS_POINTS
    } else if (edict.kind === 'edict_grain_reserve') {
      foodProductionBasisPoints += M4_EDICT_GRAIN_RESERVE_FOOD_PRODUCTION_BASIS_POINTS
      treasuryCost += M4_EDICT_GRAIN_RESERVE_TREASURY_COST
    }
  }

  return { taxIncomeBasisPoints, populationGrowthBasisPoints, foodProductionBasisPoints, treasuryCost }
}

export function settleRealmEdictsAfterMonthlySettlement(
  edicts: ReadonlyMap<EdictId, EdictState>,
  realmId: RealmId,
): ReadonlyMap<EdictId, EdictState> {
  const activeEdicts = sortedActiveEdictsForRealm(edicts, realmId)
  if (activeEdicts.length === 0) return edicts

  const updatedEdicts = new Map(edicts)
  for (const edict of activeEdicts) {
    const remainingMonths = Math.max(0, edict.remainingMonths - 1)
    updatedEdicts.set(edict.id, {
      ...edict,
      remainingMonths,
      status: remainingMonths === 0 ? 'expired' : 'active',
    })
  }

  return new Map([...updatedEdicts.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function sortedActiveEdictsForRealm(
  edicts: ReadonlyMap<EdictId, EdictState>,
  realmId: RealmId,
): readonly EdictState[] {
  return [...edicts.values()]
    .filter(edict => edict.realmId === realmId && edict.status === 'active')
    .sort((left, right) => left.id.localeCompare(right.id))
}
