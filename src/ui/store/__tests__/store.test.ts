import { beforeEach, describe, expect, it } from 'vitest'
import { relationKey } from '~/engine/systems/diplomacy'
import type {
  CoalitionState,
  DiplomaticProposal,
  DiplomaticRelation,
  EdictState,
  GovernorAssignment,
  Treaty,
  ZhouInvestitureState,
} from '~/shared/types'
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
  selectPlayerActiveEdicts,
  selectPlayerFoodStores,
  selectPlayerGovernorAssignments,
  selectPlayerMonthlyEconomyDeltas,
  selectPendingDiplomaticProposals,
  selectPlayerRealm,
  selectPlayerOwnedSiteEconomyTotals,
  selectPlayerTaxRate,
  selectPlayerTreasury,
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

  it('showBanner records the active world tick after clock advancement', () => {
    const state = useGameStore.getState()
    state.setSpeed('5x')
    state.tick(10000)

    const activeTick = useGameStore.getState().world.tick
    useGameStore.getState().showBanner('after tick')

    expect(activeTick).toBeGreaterThan(0)
    expect(selectTransientBanner(useGameStore.getState())).toEqual({
      text: 'after tick',
      createdAt: activeTick,
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

  it('activatePlayerEdict enqueues a typed M4 order without mutating world economy state', () => {
    const before = useGameStore.getState()
    const originalRealms = before.world.realms
    const originalSites = before.world.sites
    const originalEdicts = before.world.edicts
    const originalGovernorAssignments = before.world.governorAssignments

    before.activatePlayerEdict({
      edictId: 'edict_player_tax_relief',
      kind: 'edict_tax_relief',
      durationMonths: 3,
    })

    const after = useGameStore.getState()
    expect(after.world.pendingOrders).toEqual([
      {
        type: 'activate-edict',
        edictId: 'edict_player_tax_relief',
        realmId: before.playerRealmId,
        kind: 'edict_tax_relief',
        durationMonths: 3,
      },
    ])
    expect(after.world.realms).toBe(originalRealms)
    expect(after.world.sites).toBe(originalSites)
    expect(after.world.edicts).toBe(originalEdicts)
    expect(after.world.governorAssignments).toBe(originalGovernorAssignments)
  })

  it('assignPlayerGovernor enqueues a typed M4 order without mutating world economy state', () => {
    const before = useGameStore.getState()
    const siteId = [...before.world.sites.keys()][0]!
    const generalId = [...before.world.generals.keys()][0] ?? 'general_player_1'
    const originalRealms = before.world.realms
    const originalSites = before.world.sites
    const originalEdicts = before.world.edicts
    const originalGovernorAssignments = before.world.governorAssignments

    before.assignPlayerGovernor({ siteId, generalId })

    const after = useGameStore.getState()
    expect(after.world.pendingOrders).toEqual([
      {
        type: 'assign-governor',
        siteId,
        generalId,
      },
    ])
    expect(after.world.realms).toBe(originalRealms)
    expect(after.world.sites).toBe(originalSites)
    expect(after.world.edicts).toBe(originalEdicts)
    expect(after.world.governorAssignments).toBe(originalGovernorAssignments)
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

describe('ui store M4 economy selectors', () => {
  it('returns exact player economy, site totals, active edicts, governor assignments, and recent monthly deltas', () => {
    const state = useGameStore.getState()
    const playerRealmId = state.playerRealmId
    const enemyRealmId = [...state.world.realms.keys()].find((realmId) => realmId !== playerRealmId)!
    const [siteA, siteB, siteC] = [...state.world.sites.values()]
    const playerRealm = state.world.realms.get(playerRealmId)!
    const enemyRealm = state.world.realms.get(enemyRealmId)!

    const sites = new Map(
      [...state.world.sites].map(([siteId, site]) => [
        siteId,
        {
          ...site,
          ownerId: enemyRealmId,
          economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
        },
      ]),
    )
    sites.set(siteA!.id, {
      ...siteA!,
      ownerId: playerRealmId,
      economy: { population: 1200, households: 240, taxBase: 240, foodProduction: 500 },
    })
    sites.set(siteB!.id, {
      ...siteB!,
      ownerId: playerRealmId,
      economy: { population: 800, households: 160, taxBase: 160, foodProduction: 350 },
    })
    sites.set(siteC!.id, {
      ...siteC!,
      ownerId: enemyRealmId,
      economy: { population: 9999, households: 999, taxBase: 999, foodProduction: 999 },
    })

    const activeEdict: EdictState = {
      id: 'edict_active_player',
      realmId: playerRealmId,
      kind: 'edict_tax_relief',
      startedAtTick: state.world.tick,
      durationMonths: 3,
      remainingMonths: 3,
      status: 'active',
    }
    const expiredEdict: EdictState = {
      ...activeEdict,
      id: 'edict_expired_player',
      status: 'expired',
    }
    const enemyEdict: EdictState = {
      ...activeEdict,
      id: 'edict_active_enemy',
      realmId: enemyRealmId,
    }
    const assignmentA: GovernorAssignment = {
      siteId: siteB!.id,
      realmId: playerRealmId,
      generalId: 'general_player_b',
      assignedAtTick: state.world.tick,
      modifierKind: 'food_efficiency',
    }
    const assignmentB: GovernorAssignment = {
      siteId: siteA!.id,
      realmId: playerRealmId,
      generalId: 'general_player_a',
      assignedAtTick: state.world.tick,
      modifierKind: 'tax_efficiency',
    }
    const enemyAssignment: GovernorAssignment = {
      siteId: siteC!.id,
      realmId: enemyRealmId,
      generalId: 'general_enemy',
      assignedAtTick: state.world.tick,
      modifierKind: 'tax_efficiency',
    }

    useGameStore.setState({
      world: {
        ...state.world,
        realms: new Map([
          [playerRealmId, { ...playerRealm, economy: { treasury: 12345, foodStores: 6789, taxRate: 17 } }],
          [enemyRealmId, enemyRealm],
        ]),
        sites,
        edicts: new Map([
          [activeEdict.id, activeEdict],
          [expiredEdict.id, expiredEdict],
          [enemyEdict.id, enemyEdict],
        ]),
        governorAssignments: new Map([
          [assignmentA.siteId, assignmentA],
          [assignmentB.siteId, assignmentB],
          [enemyAssignment.siteId, enemyAssignment],
        ]),
      },
      events: [
        { type: 'economySettlement', payload: { realmId: playerRealmId, treasuryDelta: 25, foodStoresDelta: -10, populationDelta: 3, householdsDelta: 1, settledAtTick: state.world.tick } },
        { type: 'economySettlement', payload: { realmId: playerRealmId, treasuryDelta: 5, foodStoresDelta: 2, populationDelta: 7, householdsDelta: 2, settledAtTick: state.world.tick } },
        { type: 'economySettlement', payload: { realmId: enemyRealmId, treasuryDelta: 999, foodStoresDelta: 999, populationDelta: 999, householdsDelta: 999, settledAtTick: state.world.tick } },
      ],
    })

    const nextState = useGameStore.getState()
    expect(selectPlayerTreasury(nextState)).toBe(12345)
    expect(selectPlayerFoodStores(nextState)).toBe(6789)
    expect(selectPlayerTaxRate(nextState)).toBe(17)
    expect(selectPlayerMonthlyEconomyDeltas(nextState)).toEqual({
      treasuryDelta: 30,
      foodStoresDelta: -8,
      populationDelta: 10,
      householdsDelta: 3,
    })
    expect(selectPlayerOwnedSiteEconomyTotals(nextState)).toEqual({ population: 2000, households: 400 })
    expect(selectPlayerActiveEdicts(nextState)).toEqual([activeEdict])
    expect(selectPlayerGovernorAssignments(nextState)).toEqual([assignmentB, assignmentA])
  })

  it('returns zero/default M4 selector values when the player realm is absent', () => {
    const state = useGameStore.getState()
    const realms = new Map(state.world.realms)
    realms.delete(state.playerRealmId)
    useGameStore.setState({
      world: {
        ...state.world,
        realms,
        edicts: new Map(),
        governorAssignments: new Map(),
      },
      events: [],
    })

    const nextState = useGameStore.getState()
    expect(selectPlayerTreasury(nextState)).toBe(0)
    expect(selectPlayerFoodStores(nextState)).toBe(0)
    expect(selectPlayerTaxRate(nextState)).toBe(0)
    expect(selectPlayerMonthlyEconomyDeltas(nextState)).toEqual({
      treasuryDelta: 0,
      foodStoresDelta: 0,
      populationDelta: 0,
      householdsDelta: 0,
    })
    expect(selectPlayerActiveEdicts(nextState)).toEqual([])
    expect(selectPlayerGovernorAssignments(nextState)).toEqual([])
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

  it('submitPlayerDiplomacyAction stamps feedback with the active world tick', () => {
    const state = useGameStore.getState()
    state.setSpeed('5x')
    state.tick(10000)
    const activeTick = useGameStore.getState().world.tick
    const targetRealmId = [...useGameStore.getState().world.realms.keys()].find((realmId) => realmId !== state.playerRealmId)!

    useGameStore.getState().submitPlayerDiplomacyAction({ kind: 'envoy', targetRealmId })

    expect(selectDiplomacyFeedback(useGameStore.getState())[0]?.createdAtTick).toBe(activeTick)
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
