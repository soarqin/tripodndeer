import { describe, expect, it } from 'vitest'

import linXiangruEvent from '~/content/m5/events/lin-xiangru-bi.json'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { General, Realm, World } from '~/shared/types'
import { applyEventChainChoice, getCurrentStage } from '../event-chain-engine'

function makeRealm(id: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: 'site_1',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 500, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeGeneral(id: string, realmId: string, loyalty = 70): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty,
    loyaltyState: 'loyal',
    age: 30,
  }
}

function worldAtStage(stageId: string): World {
  return makeEmptyWorld({
    tick: 12,
    realms: new Map([['realm_zhao', makeRealm('realm_zhao')]]),
    generals: new Map([['gen_lin_xiangru', makeGeneral('gen_lin_xiangru', 'realm_zhao')]]),
    eventChainStates: new Map([
      [
        linXiangruEvent.id,
        {
          id: linXiangruEvent.id,
          currentStageId: stageId,
          completed: false,
          startedAtTick: 10,
          choiceHistory: [],
        },
      ],
    ]),
  })
}

describe('event chain stage progression', () => {
  it('advances to nextStageId, records choice history, and emits eventChainAdvanced', () => {
    const world = worldAtStage('stage1')

    const result = applyEventChainChoice(world, linXiangruEvent.id, 'send_lin')

    expect(result.world.eventChainStates.get(linXiangruEvent.id)?.currentStageId).toBe('stage2')
    expect(result.world.eventChainStates.get(linXiangruEvent.id)?.choiceHistory).toEqual([
      { stageId: 'stage1', choiceId: 'send_lin' },
    ])
    expect(result.events).toEqual([
      {
        type: 'eventChainAdvanced',
        payload: { chainId: linXiangruEvent.id, fromStageId: 'stage1', toStageId: 'stage2', choiceId: 'send_lin' },
      },
    ])
    expect(getCurrentStage(result.world, linXiangruEvent.id)?.id).toBe('stage2')
  })

  it('marks chain completed and emits eventChainCompleted when choice has no nextStageId', () => {
    const world = worldAtStage('stage2')

    const result = applyEventChainChoice(world, linXiangruEvent.id, 'continue')

    expect(result.world.eventChainStates.get(linXiangruEvent.id)?.completed).toBe(true)
    expect(result.world.eventChainStates.get(linXiangruEvent.id)?.choiceHistory).toEqual([
      { stageId: 'stage2', choiceId: 'continue' },
    ])
    expect(result.events).toEqual([
      {
        type: 'eventChainCompleted',
        payload: { chainId: linXiangruEvent.id, stageId: 'stage2', choiceId: 'continue' },
      },
    ])
  })

  it('returns unchanged world and no events for invalid choiceId', () => {
    const world = worldAtStage('stage1')

    const result = applyEventChainChoice(world, linXiangruEvent.id, 'missing_choice')

    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
  })

  it('applies selected choice effects before advancing stage', () => {
    const world = worldAtStage('stage1')

    const result = applyEventChainChoice(world, linXiangruEvent.id, 'send_lin')

    expect(result.world.realms.get('realm_zhao')?.traits).toEqual(['lin_xiangru_diplomacy'])
    expect(result.world.generals.get('gen_lin_xiangru')?.loyalty).toBe(80)
  })

  it('does not reapply a completed chain', () => {
    const completed = worldAtStage('stage2')
    const eventChainStates = new Map(completed.eventChainStates)
    const state = eventChainStates.get(linXiangruEvent.id)!
    eventChainStates.set(linXiangruEvent.id, { ...state, completed: true })
    const world = { ...completed, eventChainStates }

    const result = applyEventChainChoice(world, linXiangruEvent.id, 'continue')

    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
  })
})
