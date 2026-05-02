import { describe, it, expect } from 'vitest'
import { TradeRouteSchema } from '~/shared/schemas'
import tradeRoutes from '../trade-routes-initial.json'

describe('trade routes initial data', () => {
  it('has 4-8 initial routes', () => {
    expect(tradeRoutes.length).toBeGreaterThanOrEqual(4)
    expect(tradeRoutes.length).toBeLessThanOrEqual(8)
  })
  
  it('all routes pass TradeRouteSchema', () => {
    for (const route of tradeRoutes) {
      expect(() => TradeRouteSchema.parse(route)).not.toThrow()
    }
  })
  
  it('all routes have unique IDs', () => {
    const ids = tradeRoutes.map(r => r.id)
    expect(new Set(ids).size).toBe(tradeRoutes.length)
  })
  
  it('no route has same fromSiteId and toSiteId', () => {
    for (const route of tradeRoutes) {
      expect(route.fromSiteId).not.toBe(route.toSiteId)
    }
  })
  
  it('no route has same fromRealmId and toRealmId', () => {
    for (const route of tradeRoutes) {
      expect(route.fromRealmId).not.toBe(route.toRealmId)
    }
  })
  
  it('all routes have status active initially', () => {
    for (const route of tradeRoutes) {
      expect(route.status).toBe('active')
    }
  })
  
  it('all routes have baseIncomePerXun = 50', () => {
    for (const route of tradeRoutes) {
      expect(route.baseIncomePerXun).toBe(50)
    }
  })
  
  it('fromRealmId and toRealmId values are valid realm IDs', () => {
    const validRealms = new Set(['realm_qin', 'realm_zhao', 'realm_chu', 'realm_qi', 'realm_wei', 'realm_yan', 'realm_han'])
    for (const route of tradeRoutes) {
      expect(validRealms.has(route.fromRealmId)).toBe(true)
      expect(validRealms.has(route.toRealmId)).toBe(true)
    }
  })

  it('all siteIds exist in M1 scenario', async () => {
    const scenario = await import('../../m1/scenario.json')
    const validSiteIds = new Set(scenario.default.sites?.map((s: {id: string}) => s.id) ?? [])
    
    for (const route of tradeRoutes) {
      expect(validSiteIds.has(route.fromSiteId), `fromSiteId ${route.fromSiteId} not in scenario`).toBe(true)
      expect(validSiteIds.has(route.toSiteId), `toSiteId ${route.toSiteId} not in scenario`).toBe(true)
    }
  })
})
