import type {
  Army,
  CoalitionState,
  DiplomaticProposal,
  DiplomaticTreatyStatus,
  EdgeId,
  GameDate,
  RelationKey,
  MapEdge,
  Realm,
  RealmId,
  Site,
  SiteId,
  SpeedTier,
  GeneralId,
  General,
  Treaty,
  ZhouInvestitureState,
} from '~/shared/types'
import { isAtWar } from '~/engine/wars'
import type { DiplomacyActionFeedback, GameStoreState } from './game-store'
import { useGameStore } from './game-store'

/**
 * 细粒度 React selector hooks。
 * 每个 hook 只订阅 store 的单一字段，借助 zustand 默认 strict-equality
 * 比较自动避免无关字段变更导致的重渲染。
 */

export function useWorldDate(): GameDate {
  return useGameStore((s) => s.world.date)
}

export function useWorldTick(): number {
  return useGameStore((s) => s.world.tick)
}

export function useSpeed(): SpeedTier {
  return useGameStore((s) => s.clockState.speed)
}

export function useSites(): ReadonlyMap<SiteId, Site> {
  return useGameStore((s) => s.world.sites)
}

export function useRealms(): ReadonlyMap<RealmId, Realm> {
  return useGameStore((s) => s.world.realms)
}

export function useEdges(): ReadonlyMap<EdgeId, MapEdge> {
  return useGameStore((s) => s.world.edges)
}

export function useGenerals(): ReadonlyMap<GeneralId, General> {
  return useGameStore((s) => s.world.generals)
}

export const selectSelectedArmy = (state: GameStoreState): Army | null => {
  if (!state.selectedArmyId) return null
  return state.world.armies.get(state.selectedArmyId) ?? null
}

export const selectContextMenu = (state: GameStoreState) => state.contextMenu

export const selectActivePanel = (state: GameStoreState) => state.activePanel

export const selectDiplomacyTargetRealmId = (state: GameStoreState) => state.diplomacyTargetRealmId

export const selectPlayerRealm = (state: GameStoreState): Realm | null =>
  state.world.realms.get(state.playerRealmId) ?? null

export const selectTransientBanner = (state: GameStoreState) => state.transientBanner

export const selectAllPlayerArmies = (state: GameStoreState): Army[] =>
  [...state.world.armies.values()].filter((a) => a.realmId === state.playerRealmId)

export const selectIdlePlayerArmies = (state: GameStoreState): Army[] =>
  [...state.world.armies.values()].filter(
    (a) => a.realmId === state.playerRealmId && a.state === 'idle',
  )

export interface DiplomacyRelationSummary {
  readonly relationKey: RelationKey
  readonly counterpartRealmId: RealmId
  readonly counterpartRealmName: string
  readonly attitude: number
  readonly trust: number
  readonly atWar: boolean
  readonly activeTreatyIds: readonly string[]
  readonly pendingProposalIds: readonly string[]
  readonly hasActiveTruce: boolean
}

export const selectDiplomacyRelationSummaries = (state: GameStoreState): DiplomacyRelationSummary[] => {
  const activeTreaties = selectActiveDiplomaticTreaties(state)
  const pendingProposals = selectPendingDiplomaticProposals(state)

  return [...state.world.relations.values()]
    .filter(
      (relation) => relation.realmAId === state.playerRealmId || relation.realmBId === state.playerRealmId,
    )
    .map((relation) => {
      const counterpartRealmId = relation.realmAId === state.playerRealmId ? relation.realmBId : relation.realmAId
      const counterpartRealmName = state.world.realms.get(counterpartRealmId)?.displayName ?? counterpartRealmId
      const relationTreaties = activeTreaties.filter(
        (treaty) => includesRealmPair(treaty, state.playerRealmId, counterpartRealmId),
      )
      const relationProposals = pendingProposals.filter(
        (proposal) => includesRealmPair(proposal, state.playerRealmId, counterpartRealmId),
      )

      return {
        relationKey: relation.key,
        counterpartRealmId,
        counterpartRealmName,
        attitude: relation.attitude,
        trust: relation.trust,
        atWar: isAtWar(state.world.wars, state.playerRealmId, counterpartRealmId),
        activeTreatyIds: relationTreaties.map((treaty) => treaty.id),
        pendingProposalIds: relationProposals.map((proposal) => proposal.id),
        hasActiveTruce: relationTreaties.some((treaty) => treaty.kind === 'truce'),
      }
    })
    .sort((left, right) => left.counterpartRealmId.localeCompare(right.counterpartRealmId))
}

export const selectActiveDiplomaticTreaties = (state: GameStoreState): Treaty[] =>
  [...state.world.treaties.values()]
    .filter((treaty) => isActiveTreaty(treaty, state.world.tick))
    .filter((treaty) => treaty.realmAId === state.playerRealmId || treaty.realmBId === state.playerRealmId)
    .sort((left, right) => left.id.localeCompare(right.id))

export const selectPendingDiplomaticProposals = (state: GameStoreState): DiplomaticProposal[] =>
  [...state.world.diplomaticProposals.values()]
    .filter((proposal) => proposal.status === 'pending')
    .filter(
      (proposal) => proposal.proposingRealmId === state.playerRealmId || proposal.targetRealmId === state.playerRealmId,
    )
    .sort((left, right) => left.id.localeCompare(right.id))

export const selectDiplomacyFeedback = (state: GameStoreState): DiplomacyActionFeedback[] =>
  [...state.diplomacyFeedback].sort((left, right) => left.id.localeCompare(right.id))

export const selectCoalitionPressure = (state: GameStoreState): CoalitionState[] =>
  [...state.world.coalitions.values()]
    .filter((coalition) => coalition.targetRealmId === state.playerRealmId)
    .filter((coalition) => coalition.status !== 'dissolved')
    .sort((left, right) => left.id.localeCompare(right.id))

export const selectPlayerZhouInvestiture = (state: GameStoreState): ZhouInvestitureState | null => {
  const investiture = state.world.zhouInvestiture.get(state.playerRealmId)
  if (!investiture || investiture.source !== 'zhou') return null
  if (investiture.expiresAtTick !== null && investiture.expiresAtTick <= state.world.tick) return null
  return investiture
}

function includesRealmPair(
  item: Pick<Treaty, 'realmAId' | 'realmBId'> | Pick<DiplomaticProposal, 'proposingRealmId' | 'targetRealmId'>,
  playerRealmId: RealmId,
  counterpartRealmId: RealmId,
): boolean {
  if ('realmAId' in item) {
    return (item.realmAId === playerRealmId && item.realmBId === counterpartRealmId)
      || (item.realmAId === counterpartRealmId && item.realmBId === playerRealmId)
  }

  return (item.proposingRealmId === playerRealmId && item.targetRealmId === counterpartRealmId)
    || (item.proposingRealmId === counterpartRealmId && item.targetRealmId === playerRealmId)
}

function isActiveTreaty(treaty: Treaty, tick: number): treaty is Treaty & { status: Exclude<DiplomaticTreatyStatus, 'expired' | 'cancelled' | 'broken'> } {
  return treaty.status === 'active' && (treaty.expiresAtTick === null || treaty.expiresAtTick > tick)
}
