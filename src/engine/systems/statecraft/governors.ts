import type { GovernorAssignment, Site, SiteId } from '~/shared/types'
import {
  M4_GOVERNOR_FOOD_MODIFIER,
  M4_GOVERNOR_TAX_MODIFIER,
} from '~/content/m2/balance'

export interface GovernorSettlementModifiers {
  readonly taxBaseDelta: number
  readonly foodProductionDelta: number
}

export function getGovernorSettlementModifiers(
  assignments: ReadonlyMap<SiteId, GovernorAssignment>,
  site: Site,
): GovernorSettlementModifiers {
  const assignment = assignments.get(site.id)
  if (assignment === undefined || !isAssignmentForOwnedSite(assignment, site)) {
    return { taxBaseDelta: 0, foodProductionDelta: 0 }
  }

  if (assignment.modifierKind === 'tax_efficiency') {
    return { taxBaseDelta: M4_GOVERNOR_TAX_MODIFIER, foodProductionDelta: 0 }
  }

  return { taxBaseDelta: 0, foodProductionDelta: M4_GOVERNOR_FOOD_MODIFIER }
}

function isAssignmentForOwnedSite(assignment: GovernorAssignment, site: Site): boolean {
  return site.ownerId !== null
    && assignment.siteId === site.id
    && assignment.realmId === site.ownerId
}
