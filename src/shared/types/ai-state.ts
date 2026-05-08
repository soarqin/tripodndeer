import type { ArmyId, RealmId, SiteId } from './core'
import type { ReformId } from './reform-disaster-trade'

export interface StrategicPlan {
  targetSiteId: SiteId | null
  mainEnemyRealmId: RealmId | null
  mainAllyRealmId: RealmId | null
  reformIntentId: ReformId | null
  decidedAtTick: number
  decidedForYearBC: number
}

export type OperationalDirectiveKind =
  | 'declare_war'
  | 'dispatch_army'
  | 'support_front'
  | 'retreat'
  | 'diplomacy'
  | 'espionage'

export interface OperationalDirective {
  id: string
  kind: OperationalDirectiveKind
  priority: number
  targetRealmId?: RealmId
  targetSiteId?: SiteId
  armyId?: ArmyId
  createdAtTick: number
  expiresAtTick: number
}

export interface AIState {
  strategic: StrategicPlan | null
  operational: readonly OperationalDirective[]
}
