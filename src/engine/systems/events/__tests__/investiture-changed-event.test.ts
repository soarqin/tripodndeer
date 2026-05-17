import { describe, expect, it, vi } from 'vitest'

import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { EventChainState, Realm, World } from '~/shared/types'

vi.mock('~/content/m5/events/lin-xiangru-bi.json', () => ({
  default: {
    id: 'test_investiture_chain',
    scope: 'realm-scoped',
    oneShot: true,
    between: { earliest_year_bc: 999, latest_year_bc: null },
    trigger: {
      type: 'state',
      realmId: 'realm_test_only',
      predicate: { kind: 'realm.id', value: 'realm_test_only' },
    },
    stages: [
      {
        id: 'request',
        text: 'test',
        choices: [
          {
            id: 'accept_duke',
            label: 'duke',
            effects: [{ type: 'zhouInvestiture.grant', realmId: 'realm_qin', rank: 'duke' }],
          },
          {
            id: 'accept_marquis',
            label: 'marquis',
            effects: [
              { type: 'zhouInvestiture.grant', realmId: 'realm_qin', rank: 'marquis' },
              { type: 'realm.prestige.delta', realmId: 'realm_qin', delta: 7 },
            ],
          },
          {
            id: 'decline',
            label: 'decline',
            effects: [],
          },
        ],
      },
    ],
  },
}))

const { applyEventChainChoice } = await import('../event-chain-engine')

const TEST_CHAIN_ID = 'test_investiture_chain'
const REQUEST_STAGE_ID = 'request'

function makeRealm(id: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: 'site_1',
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 1000, foodStores: 500, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function worldAtRequestStage(): World {
  const state: EventChainState = {
    id: TEST_CHAIN_ID,
    currentStageId: REQUEST_STAGE_ID,
    completed: false,
    startedAtTick: 0,
    choiceHistory: [],
  }
  return makeEmptyWorld({
    tick: 12,
    realms: new Map([['realm_qin', makeRealm('realm_qin')]]),
    eventChainStates: new Map([[TEST_CHAIN_ID, state]]),
  })
}

describe('applyEventChainChoice — investitureChanged event emission', () => {
  it('emits investitureChanged with duke rank when accept_duke choice applied', () => {
    const world = worldAtRequestStage()

    const result = applyEventChainChoice(world, TEST_CHAIN_ID, 'accept_duke')

    const investitureEvents = result.events.filter((e) => e.type === 'investitureChanged')
    expect(investitureEvents).toHaveLength(1)
    expect(investitureEvents[0]).toEqual({
      type: 'investitureChanged',
      payload: { newHolderId: 'realm_qin', rank: 'duke' },
    })
  })

  it('emits investitureChanged with marquis rank when accept_marquis choice applied', () => {
    const world = worldAtRequestStage()

    const result = applyEventChainChoice(world, TEST_CHAIN_ID, 'accept_marquis')

    const investitureEvents = result.events.filter((e) => e.type === 'investitureChanged')
    expect(investitureEvents).toHaveLength(1)
    expect(investitureEvents[0]).toEqual({
      type: 'investitureChanged',
      payload: { newHolderId: 'realm_qin', rank: 'marquis' },
    })
  })

  it('does NOT emit investitureChanged when decline choice (no effects) applied', () => {
    const world = worldAtRequestStage()

    const result = applyEventChainChoice(world, TEST_CHAIN_ID, 'decline')

    const investitureEvents = result.events.filter((e) => e.type === 'investitureChanged')
    expect(investitureEvents).toHaveLength(0)
  })

  it('persists zhouInvestiture state in world after grant effect applies', () => {
    const world = worldAtRequestStage()

    const result = applyEventChainChoice(world, TEST_CHAIN_ID, 'accept_duke')

    const investiture = result.world.zhouInvestiture.get('realm_qin')
    expect(investiture).toBeDefined()
    expect(investiture?.rank).toBe('duke')
    expect(investiture?.source).toBe('zhou')
  })
})
