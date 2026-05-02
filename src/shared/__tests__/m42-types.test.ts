import { describe, it, expect } from 'vitest'
import type {
  DisasterDefinition,
  DisasterChoice,
  DisasterState,
  TradeRoute,
  FactionInfluenceState,
  FactionImbalanceEvent,
  DisasterId,
  TradeRouteId,
  FactionImbalanceEventId,
} from '../types'

describe('M4.2 types', () => {
  it('DisasterId is a string alias', () => {
    const id: DisasterId = 'disaster_da_han'
    expect(typeof id).toBe('string')
  })

  it('TradeRouteId is a string alias', () => {
    const id: TradeRouteId = 'route_qin_wei'
    expect(typeof id).toBe('string')
  })

  it('FactionImbalanceEventId is a string alias', () => {
    const id: FactionImbalanceEventId = 'event_coup'
    expect(typeof id).toBe('string')
  })

  it('DisasterChoice has required fields', () => {
    const choice: DisasterChoice = {
      id: 'open_granary',
      labelZh: '开仓赈灾',
      costType: 'foodStores',
      costAmount: 1000,
      effects: [],
      outcomeZh: '民心大振',
    }
    expect(choice.id).toBe('open_granary')
    expect(choice.costType).toBe('foodStores')
  })

  it('DisasterDefinition has required fields', () => {
    const def: DisasterDefinition = {
      id: 'disaster_da_han',
      displayName: 'Great Drought',
      displayNameZh: '大旱',
      trigger: { kind: 'and', children: [] },
      baseProbabilityBp: 500,
      effects: [],
      playerChoices: [],
      durationMonths: 12,
    }
    expect(def.id).toBe('disaster_da_han')
    expect(def.baseProbabilityBp).toBe(500)
  })

  it('DisasterState has required status values', () => {
    const state: DisasterState = {
      realmId: 'realm_qin',
      disasterId: 'disaster_da_han',
      siteId: 'site_01',
      startedAtTick: 0,
      status: 'awaiting_decision',
    }
    expect(state.status).toBe('awaiting_decision')
  })

  it('DisasterState supports optional fields', () => {
    const state: DisasterState = {
      realmId: 'realm_qin',
      disasterId: 'disaster_da_han',
      siteId: 'site_01',
      startedAtTick: 0,
      status: 'resolved',
      chosenChoiceId: 'open_granary',
      resolvedAtTick: 100,
    }
    expect(state.chosenChoiceId).toBe('open_granary')
    expect(state.resolvedAtTick).toBe(100)
  })

  it('TradeRoute has required fields', () => {
    const route: TradeRoute = {
      id: 'route_01',
      fromSiteId: 'site_01',
      toSiteId: 'site_02',
      fromRealmId: 'realm_qin',
      toRealmId: 'realm_wei',
      establishedAtTick: 0,
      baseIncomePerXun: 50,
      status: 'active',
    }
    expect(route.status).toBe('active')
  })

  it('TradeRoute status can be cut', () => {
    const route: TradeRoute = {
      id: 'route_02',
      fromSiteId: 'site_03',
      toSiteId: 'site_04',
      fromRealmId: 'realm_chu',
      toRealmId: 'realm_zhao',
      establishedAtTick: 50,
      baseIncomePerXun: 75,
      status: 'cut',
    }
    expect(route.status).toBe('cut')
  })

  it('FactionInfluenceState has realmId and influences map', () => {
    const state: FactionInfluenceState = {
      realmId: 'realm_qin',
      influences: new Map([['military_meritocracy', 70]]),
    }
    expect(state.influences.get('military_meritocracy')).toBe(70)
  })

  it('FactionInfluenceState supports multiple faction influences', () => {
    const state: FactionInfluenceState = {
      realmId: 'realm_wei',
      influences: new Map([
        ['royal_kin', 50],
        ['noble_clans', 60],
        ['military_meritocracy', 40],
      ]),
    }
    expect(state.influences.size).toBe(3)
    expect(state.influences.get('royal_kin')).toBe(50)
  })

  it('FactionImbalanceEvent kind is limited to 3 values', () => {
    const event: FactionImbalanceEvent = {
      id: 'event_coup',
      kind: 'coup',
      triggerPredicate: { kind: 'and', children: [] },
      effects: [],
      cooldownYears: 5,
      displayNameZh: '政变',
    }
    expect(['coup', 'split', 'overthrow']).toContain(event.kind)
  })

  it('FactionImbalanceEvent supports all three kinds', () => {
    const coup: FactionImbalanceEvent = {
      id: 'event_1',
      kind: 'coup',
      triggerPredicate: { kind: 'and', children: [] },
      effects: [],
      cooldownYears: 5,
      displayNameZh: '政变',
    }
    const split: FactionImbalanceEvent = {
      id: 'event_2',
      kind: 'split',
      triggerPredicate: { kind: 'and', children: [] },
      effects: [],
      cooldownYears: 10,
      displayNameZh: '分裂',
    }
    const overthrow: FactionImbalanceEvent = {
      id: 'event_3',
      kind: 'overthrow',
      triggerPredicate: { kind: 'and', children: [] },
      effects: [],
      cooldownYears: 15,
      displayNameZh: '推翻',
    }
    expect(coup.kind).toBe('coup')
    expect(split.kind).toBe('split')
    expect(overthrow.kind).toBe('overthrow')
  })
})
