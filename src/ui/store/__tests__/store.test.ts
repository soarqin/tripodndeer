import { beforeEach, describe, expect, it } from 'vitest'
import { relationKey } from '~/engine/systems/diplomacy'
import type { CoalitionState, DiplomaticProposal, DiplomaticRelation, Treaty, ZhouInvestitureState } from '~/shared/types'
import { useGameStore } from '../game-store'
import {
  selectActivePanel,
  selectActiveDiplomaticTreaties,
  selectAllPlayerArmies,
  selectCoalitionPressure,
  selectContextMenu,
  selectDiplomacyFeedback,
  selectDiplomacyRelationSummaries,
  selectIdlePlayerArmies,
  selectPendingDiplomaticProposals,
  selectPlayerRealm,
  selectPlayerZhouInvestiture,
  selectSelectedArmy,
  selectTransientBanner,
} from '../selectors'

beforeEach(() => {
  useGameStore.getState().reset()
})

describe('store tick at 1x speed', () => {
  it('advances world by one tick for 5500ms with 500ms residual accumulator', () => {
    const initial = useGameStore.getState()
    initial.setSpeed('1x')
    initial.tick(5500)

    const next = useGameStore.getState()
    expect(next.world.tick).toBe(1)
    expect(next.clockState.realTimeAccum).toBe(500)
  })
})

describe('store setSpeed', () => {
  it('resets realTimeAccum to 0 and stores new speed when changing speed mid-cycle', () => {
    const store = useGameStore.getState()
    store.setSpeed('1x')
    store.tick(4000)
    expect(useGameStore.getState().clockState.realTimeAccum).toBe(4000)

    useGameStore.getState().setSpeed('5x')
    const after = useGameStore.getState()
    expect(after.clockState.realTimeAccum).toBe(0)
    expect(after.clockState.speed).toBe('5x')
  })
})

describe('store reset', () => {
  it('returns world.tick to 0 and speed to pause after running ticks', () => {
    const store = useGameStore.getState()
    store.setSpeed('5x')
    store.tick(10000)
    expect(useGameStore.getState().world.tick).toBeGreaterThan(0)

    useGameStore.getState().reset()
    const after = useGameStore.getState()
    expect(after.world.tick).toBe(0)
    expect(after.clockState.speed).toBe('pause')
    expect(after.clockState.realTimeAccum).toBe(0)
  })
})

describe('store pause speed', () => {
  it('does not advance world.tick or accumulate time while paused', () => {
    useGameStore.getState().tick(60000)

    const state = useGameStore.getState()
    expect(state.world.tick).toBe(0)
    expect(state.clockState.realTimeAccum).toBe(0)
    expect(state.clockState.speed).toBe('pause')
  })
})

describe('store consecutive ticks', () => {
  it('accumulates partial deltas across multiple tick calls at 1x speed', () => {
    const store = useGameStore.getState()
    store.setSpeed('1x')

    store.tick(2000)
    expect(useGameStore.getState().world.tick).toBe(0)
    expect(useGameStore.getState().clockState.realTimeAccum).toBe(2000)

    useGameStore.getState().tick(3500)
    const after = useGameStore.getState()
    expect(after.world.tick).toBe(1)
    expect(after.clockState.realTimeAccum).toBe(500)
  })
})

describe('ui store selection actions', () => {
  it('selectArmy sets selectedArmyId', () => {
    const armyId = [...useGameStore.getState().world.armies.keys()][0]!
    useGameStore.getState().selectArmy(armyId)

    expect(useGameStore.getState().selectedArmyId).toBe(armyId)
  })

  it('clearSelection clears selectedArmyId', () => {
    const armyId = [...useGameStore.getState().world.armies.keys()][0]!
    useGameStore.getState().selectArmy(armyId)
    useGameStore.getState().clearSelection()

    expect(useGameStore.getState().selectedArmyId).toBeNull()
  })
})

describe('ui store context menu actions', () => {
  it('openContextMenu sets contextMenu with correct coords', () => {
    const payload = { siteId: [...useGameStore.getState().world.sites.keys()][0]!, x: 120, y: 240 }
    useGameStore.getState().openContextMenu(payload)

    expect(selectContextMenu(useGameStore.getState())).toEqual(payload)
  })

  it('closeContextMenu clears contextMenu', () => {
    const payload = { siteId: [...useGameStore.getState().world.sites.keys()][0]!, x: 120, y: 240 }
    useGameStore.getState().openContextMenu(payload)
    useGameStore.getState().closeContextMenu()

    expect(useGameStore.getState().contextMenu).toBeNull()
  })
})

describe('ui store panel and banner actions', () => {
  it('setActivePanel sets activePanel', () => {
    useGameStore.getState().setActivePanel('junshi')

    expect(selectActivePanel(useGameStore.getState())).toBe('junshi')
  })

  it('showBanner sets transientBanner with text', () => {
    const state = useGameStore.getState()
    state.showBanner('hello banner')

    expect(selectTransientBanner(useGameStore.getState())).toEqual({
      text: 'hello banner',
      createdAt: useGameStore.getState().world.tick,
    })
  })
})

describe('ui store order actions', () => {
  it('issueOrder adds order to world.pendingOrders', () => {
    const armyId = [...useGameStore.getState().world.armies.keys()][0]!
    const targetSiteId = [...useGameStore.getState().world.sites.keys()][0]!
    const order = { type: 'march', armyId, targetSiteId } as const

    useGameStore.getState().issueOrder(order)

    expect(useGameStore.getState().world.pendingOrders).toEqual([order])
  })
})

describe('ui store army selector', () => {
  it('selectSelectedArmy returns correct army after selectArmy', () => {
    const armyId = [...useGameStore.getState().world.armies.keys()][0]!
    useGameStore.getState().selectArmy(armyId)

    expect(selectSelectedArmy(useGameStore.getState())?.id).toBe(armyId)
  })
})

describe('ui store realm selectors', () => {
  it('selectPlayerRealm returns the configured player realm', () => {
    const state = useGameStore.getState()
    const realmId = [...state.world.realms.keys()][0]!
    const testState = { ...state, playerRealmId: realmId }

    expect(selectPlayerRealm(testState)?.id).toBe(realmId)
  })

  it('selectAllPlayerArmies returns only armies for the player realm', () => {
    const state = useGameStore.getState()
    const realmId = [...state.world.realms.keys()][0]!
    const testState = { ...state, playerRealmId: realmId }

    expect(selectAllPlayerArmies(testState)).toEqual(
      [...state.world.armies.values()].filter((army) => army.realmId === realmId),
    )
  })

  it('selectIdlePlayerArmies returns only idle player armies', () => {
    const state = useGameStore.getState()
    const realmId = [...state.world.realms.keys()][0]!
    const testState = { ...state, playerRealmId: realmId }

    expect(selectIdlePlayerArmies(testState)).toEqual(
      [...state.world.armies.values()].filter(
        (army) => army.realmId === realmId && army.state === 'idle',
      ),
    )
  })
})

describe('ui store diplomacy actions', () => {
  it('submitPlayerDiplomacyAction records a valid envoy proposal and deterministic feedback', () => {
    const state = useGameStore.getState()
    const targetRealmId = [...state.world.realms.keys()].find((realmId) => realmId !== state.playerRealmId)!

    const result = state.submitPlayerDiplomacyAction({ kind: 'envoy', targetRealmId })

    expect(result.ok).toBe(true)

    const after = useGameStore.getState()
    const pendingProposals = selectPendingDiplomaticProposals(after)
    expect(pendingProposals).toHaveLength(1)
    const pendingProposal = pendingProposals[0]!
    expect(pendingProposal).toMatchObject({
      kind: 'envoy',
      proposingRealmId: after.playerRealmId,
      targetRealmId,
      status: 'pending',
    })
    expect(selectDiplomacyFeedback(after)).toEqual([
      expect.objectContaining({
        status: 'submitted',
        reason: null,
        kind: 'envoy',
        proposingRealmId: after.playerRealmId,
        targetRealmId,
        createdAtTick: after.world.tick,
        relationKey: relationKey(after.playerRealmId, targetRealmId),
        proposalId: pendingProposal.id,
      }),
    ])
    expect(after.world.wars.size).toBe(0)
  })

  it('submitPlayerDiplomacyAction rejects truce-blocked declare_war without mutating war state', () => {
    const state = useGameStore.getState()
    const targetRealmId = [...state.world.realms.keys()].find((realmId) => realmId !== state.playerRealmId)!
    const truce: Treaty = {
      id: 'treaty_truce_player_target',
      kind: 'truce',
      realmAId: state.playerRealmId,
      realmBId: targetRealmId,
      status: 'active',
      signedAt: state.world.date,
      signedAtTick: 0,
      expiresAt: null,
      expiresAtTick: state.world.tick + 10,
      endedAt: null,
      endedAtTick: null,
      sourceProposalId: null,
    }

    useGameStore.setState({
      world: {
        ...state.world,
        treaties: new Map([[truce.id, truce]]),
      },
    })

    const result = useGameStore.getState().submitPlayerDiplomacyAction({
      kind: 'declare_war',
      targetRealmId,
    })

    expect(result).toMatchObject({ ok: false, reason: 'truce_active' })

    const after = useGameStore.getState()
    expect(after.world.wars.size).toBe(0)
    expect(selectPendingDiplomaticProposals(after)).toEqual([])
    expect(selectDiplomacyFeedback(after)).toEqual([
      expect.objectContaining({
        status: 'rejected',
        reason: 'truce_active',
        kind: 'declare_war',
        targetRealmId,
      }),
    ])
  })
})

describe('ui store diplomacy selectors', () => {
  it('returns deterministic player-scoped relation, treaty, proposal, coalition, and investiture slices', () => {
    const state = useGameStore.getState()
    const playerRealmId = state.playerRealmId
    const otherRealmIds = [...state.world.realms.keys()].filter((realmId) => realmId !== playerRealmId).sort()
    const hanRealmId = otherRealmIds[0]!
    const weiRealmId = otherRealmIds[1]!

    const relations = new Map<string, DiplomaticRelation>([
      [relationKey(playerRealmId, weiRealmId), {
        key: relationKey(playerRealmId, weiRealmId),
        realmAId: playerRealmId,
        realmBId: weiRealmId,
        attitude: 10,
        trust: 20,
        updatedAt: state.world.date,
      }],
      [relationKey(playerRealmId, hanRealmId), {
        key: relationKey(playerRealmId, hanRealmId),
        realmAId: playerRealmId,
        realmBId: hanRealmId,
        attitude: 30,
        trust: 40,
        updatedAt: state.world.date,
      }],
    ])

    const treaties = new Map<string, Treaty>([
      ['treaty_z', {
        id: 'treaty_z',
        kind: 'non_aggression',
        realmAId: playerRealmId,
        realmBId: weiRealmId,
        status: 'active',
        signedAt: state.world.date,
        signedAtTick: 1,
        expiresAt: null,
        expiresAtTick: null,
        endedAt: null,
        endedAtTick: null,
        sourceProposalId: null,
      }],
      ['treaty_a', {
        id: 'treaty_a',
        kind: 'truce',
        realmAId: playerRealmId,
        realmBId: hanRealmId,
        status: 'active',
        signedAt: state.world.date,
        signedAtTick: 2,
        expiresAt: null,
        expiresAtTick: state.world.tick + 5,
        endedAt: null,
        endedAtTick: null,
        sourceProposalId: null,
      }],
    ])

    const diplomaticProposals = new Map<string, DiplomaticProposal>([
      ['proposal_z', {
        id: 'proposal_z',
        kind: 'tribute',
        proposingRealmId: weiRealmId,
        targetRealmId: playerRealmId,
        status: 'pending',
        proposedAt: state.world.date,
        proposedAtTick: state.world.tick,
        expiresAt: state.world.date,
        expiresAtTick: state.world.tick + 5,
        resolvedAt: null,
        resolvedAtTick: null,
        treatyId: null,
      }],
      ['proposal_a', {
        id: 'proposal_a',
        kind: 'envoy',
        proposingRealmId: playerRealmId,
        targetRealmId: hanRealmId,
        status: 'pending',
        proposedAt: state.world.date,
        proposedAtTick: state.world.tick,
        expiresAt: state.world.date,
        expiresAtTick: state.world.tick + 5,
        resolvedAt: null,
        resolvedAtTick: null,
        treatyId: null,
      }],
    ])

    const coalitions = new Map<string, CoalitionState>([
      ['coalition_z', {
        id: 'coalition_z',
        targetRealmId: playerRealmId,
        memberRealmIds: [weiRealmId, hanRealmId],
        status: 'active',
        formedAt: state.world.date,
        dissolvedAt: null,
      }],
      ['coalition_a', {
        id: 'coalition_a',
        targetRealmId: playerRealmId,
        memberRealmIds: [hanRealmId],
        status: 'forming',
        formedAt: state.world.date,
        dissolvedAt: null,
      }],
    ])

    const zhouInvestiture: ZhouInvestitureState = {
      realmId: playerRealmId,
      recognizedTitle: '伯',
      grantedAtTick: state.world.tick - 1,
      expiresAtTick: state.world.tick + 5,
      source: 'zhou',
    }

    useGameStore.setState({
      world: {
        ...state.world,
        relations,
        treaties,
        diplomaticProposals,
        coalitions,
        zhouInvestiture: new Map([[playerRealmId, zhouInvestiture]]),
      },
      diplomacyFeedback: [
        {
          id: 'feedback_z',
          kind: 'declare_war',
          proposingRealmId: playerRealmId,
          targetRealmId: weiRealmId,
          relationKey: relationKey(playerRealmId, weiRealmId),
          createdAtTick: state.world.tick,
          status: 'rejected',
          reason: 'truce_active',
          proposalId: null,
          acceptanceScore: null,
        },
        {
          id: 'feedback_a',
          kind: 'envoy',
          proposingRealmId: playerRealmId,
          targetRealmId: hanRealmId,
          relationKey: relationKey(playerRealmId, hanRealmId),
          createdAtTick: state.world.tick,
          status: 'submitted',
          reason: null,
          proposalId: 'proposal_a',
          acceptanceScore: 0,
        },
      ],
    })

    const nextState = useGameStore.getState()
    expect(selectDiplomacyRelationSummaries(nextState).map((summary) => summary.counterpartRealmId)).toEqual([
      hanRealmId,
      weiRealmId,
    ])
    expect(selectActiveDiplomaticTreaties(nextState).map((treaty) => treaty.id)).toEqual(['treaty_a', 'treaty_z'])
    expect(selectPendingDiplomaticProposals(nextState).map((proposal) => proposal.id)).toEqual(['proposal_a', 'proposal_z'])
    expect(selectCoalitionPressure(nextState).map((coalition) => coalition.id)).toEqual(['coalition_a', 'coalition_z'])
    expect(selectDiplomacyFeedback(nextState).map((entry) => entry.id)).toEqual(['feedback_a', 'feedback_z'])
    expect(selectPlayerZhouInvestiture(nextState)).toEqual(zhouInvestiture)
  })
})
