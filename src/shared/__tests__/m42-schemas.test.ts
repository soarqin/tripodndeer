import { describe, it, expect } from 'vitest'
import {
  DisasterDefinitionSchema,
  DisasterChoiceSchema,
  DisasterStateSchema,
  TradeRouteSchema,
  FactionInfluenceStateSchema,
  FactionImbalanceEventSchema,
  EffectSchema,
} from '../schemas'

describe('M4.2 Zod schemas', () => {
  describe('DisasterChoiceSchema', () => {
    it('parses valid choice', () => {
      const result = DisasterChoiceSchema.parse({
        id: 'open_granary',
        labelZh: '开仓赈灾',
        costType: 'foodStores',
        costAmount: 1000,
        effects: [],
        outcomeZh: '民心大振',
      })
      expect(result.id).toBe('open_granary')
    })
    it('rejects invalid costType', () => {
      expect(() => DisasterChoiceSchema.parse({
        id: 'x', labelZh: 'x', costType: 'invalid', costAmount: 0, effects: [], outcomeZh: 'x',
      })).toThrow()
    })
  })

  describe('DisasterDefinitionSchema', () => {
    const validDef = {
      id: 'disaster_da_han',
      displayName: 'Drought',
      displayNameZh: '大旱',
      trigger: { kind: 'and', children: [] },
      baseProbabilityBp: 400,
      effects: [],
      playerChoices: [
        { id: 'open_granary', labelZh: '开仓', costType: 'foodStores', costAmount: 1000, effects: [], outcomeZh: '好' },
        { id: 'reduce_tax', labelZh: '减税', costType: 'treasury', costAmount: 500, effects: [], outcomeZh: '好' },
        { id: 'forced_levy', labelZh: '强征', costType: 'none', costAmount: 0, effects: [], outcomeZh: '坏' },
        { id: 'ignore', labelZh: '不管', costType: 'none', costAmount: 0, effects: [], outcomeZh: '坏' },
      ],
      durationMonths: 3,
    }
    it('parses valid definition', () => {
      const result = DisasterDefinitionSchema.parse(validDef)
      expect(result.playerChoices.length).toBe(4)
    })
    it('rejects < 4 playerChoices', () => {
      const bad = { ...validDef, playerChoices: validDef.playerChoices.slice(0, 3) }
      expect(() => DisasterDefinitionSchema.parse(bad)).toThrow()
    })
  })

  describe('DisasterStateSchema', () => {
    it('parses awaiting_decision state', () => {
      const result = DisasterStateSchema.parse({
        realmId: 'realm_qin',
        disasterId: 'disaster_da_han',
        siteId: 'site_01',
        startedAtTick: 100,
        status: 'awaiting_decision',
      })
      expect(result.status).toBe('awaiting_decision')
    })
    it('parses with optional chosenChoiceId', () => {
      const result = DisasterStateSchema.parse({
        realmId: 'realm_qin', disasterId: 'disaster_da_han', siteId: 'site_01',
        startedAtTick: 100, status: 'resolved', chosenChoiceId: 'open_granary', resolvedAtTick: 103,
      })
      expect(result.chosenChoiceId).toBe('open_granary')
    })
  })

  describe('TradeRouteSchema', () => {
    it('parses valid route', () => {
      const result = TradeRouteSchema.parse({
        id: 'route_01',
        fromSiteId: 'site_qin_01',
        toSiteId: 'site_wei_01',
        fromRealmId: 'realm_qin',
        toRealmId: 'realm_wei',
        establishedAtTick: 0,
        baseIncomePerXun: 50,
        status: 'active',
      })
      expect(result.status).toBe('active')
    })
    it('rejects missing fromSiteId', () => {
      expect(() => TradeRouteSchema.parse({
        id: 'route_01', toSiteId: 'site_01', fromRealmId: 'realm_qin', toRealmId: 'realm_wei',
        establishedAtTick: 0, baseIncomePerXun: 50, status: 'active',
      })).toThrow()
    })
  })

  describe('FactionInfluenceStateSchema', () => {
    it('parses valid influence state', () => {
      const result = FactionInfluenceStateSchema.parse({
        realmId: 'realm_qin',
        influences: { military_meritocracy: 70, reformists: 60 },
      })
      expect(result.influences.military_meritocracy).toBe(70)
    })
  })

  describe('FactionImbalanceEventSchema', () => {
    it('parses coup event', () => {
      const result = FactionImbalanceEventSchema.parse({
        id: 'event_coup',
        kind: 'coup',
        triggerPredicate: { kind: 'and', children: [] },
        effects: [],
        cooldownYears: 5,
        displayNameZh: '政变',
      })
      expect(result.kind).toBe('coup')
    })
    it('rejects invalid kind', () => {
      expect(() => FactionImbalanceEventSchema.parse({
        id: 'x', kind: 'assassination', triggerPredicate: { kind: 'and', children: [] },
        effects: [], cooldownYears: 5, displayNameZh: 'x',
      })).toThrow()
    })
  })

  describe('EffectSchema new types', () => {
    it('parses site.population.delta', () => {
      const result = EffectSchema.parse({ type: 'site.population.delta', siteId: 'site_01', delta: -5000 })
      expect(result.type).toBe('site.population.delta')
    })
    it('parses realm.faction.delta', () => {
      const result = EffectSchema.parse({ type: 'realm.faction.delta', realmId: 'realm_qin', faction: 'military_meritocracy', delta: 10 })
      expect(result.type).toBe('realm.faction.delta')
    })
    it('parses realm.warWeariness.delta', () => {
      const result = EffectSchema.parse({ type: 'realm.warWeariness.delta', realmId: 'realm_qin', delta: 5 })
      expect(result.type).toBe('realm.warWeariness.delta')
    })
    it('parses realm.foodStores.delta', () => {
      const result = EffectSchema.parse({ type: 'realm.foodStores.delta', realmId: 'realm_qin', delta: -2000 })
      expect(result.type).toBe('realm.foodStores.delta')
    })
    it('backward compat: existing realm.treasury effect still works', () => {
      const result = EffectSchema.parse({ type: 'realm.treasury', realmId: 'realm_qin', delta: 100 })
      expect(result.type).toBe('realm.treasury')
    })
  })
})
