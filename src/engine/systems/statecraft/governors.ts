import type { General, GeneralId, GovernorAssignment, Site, SiteId } from '~/shared/types'
import {
  M5_GOVERNOR_FOOD_BONUS_PER_ZHENG,
  M5_GOVERNOR_TAX_BONUS_PER_ZHENG,
} from '~/content/m2/balance'

export interface GovernorSettlementModifiers {
  readonly taxBaseDelta: number
  readonly foodProductionDelta: number
}

export function getGovernorSettlementModifiers(
  assignments: ReadonlyMap<SiteId, GovernorAssignment>,
  generals: ReadonlyMap<GeneralId, General>,
  site: Site,
): GovernorSettlementModifiers {
  const assignment = assignments.get(site.id)
  if (assignment === undefined || !isAssignmentForOwnedSite(assignment, site)) {
    return { taxBaseDelta: 0, foodProductionDelta: 0 }
  }

  const general = generals.get(assignment.generalId)
  if (general === undefined || general.attrs === undefined) {
    return { taxBaseDelta: 0, foodProductionDelta: 0 }
  }

  const zheng = general.attrs.zheng

  if (assignment.modifierKind === 'tax_efficiency') {
    return {
      taxBaseDelta: Math.floor(M5_GOVERNOR_TAX_BONUS_PER_ZHENG * zheng),
      foodProductionDelta: 0,
    }
  }

  return {
    taxBaseDelta: 0,
    foodProductionDelta: Math.floor(M5_GOVERNOR_FOOD_BONUS_PER_ZHENG * zheng),
  }
}

function isAssignmentForOwnedSite(assignment: GovernorAssignment, site: Site): boolean {
  return site.ownerId !== null
    && assignment.siteId === site.id
    && assignment.realmId === site.ownerId
}
