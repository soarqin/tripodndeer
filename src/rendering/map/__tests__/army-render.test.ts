import { describe, it, expect, vi } from 'vitest'
import { drawArmies } from '../army-render'
import type { Army, Site, Realm } from '~/shared/types'

// Mock canvas context
function makeMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D
}

function makeArmy(id: string, location: string, realmId: string): Army {
  return {
    id, realmId, manpower: 5000, location,
    state: 'idle', destination: null, ticksRemaining: 0, source: null,
  } as Army
}

function makeSite(id: string): Site {
  return {
    id, name: id, position: [100, 200] as [number, number],
    boundary: [], ownerId: null, polygon: [], adjacency: [],
    economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
  } as Site
}

function makeRealm(id: string, color: string): Realm {
  return {
    id, displayName: '秦', fullTitle: '秦国', color,
    capital: 'site_1', initialSites: [], initialArmies: [], aiPersonality: 'aggressive_random',
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  } as Realm
}

describe('drawArmies', () => {
  it('calls arc for each army', () => {
    const ctx = makeMockCtx()
    const armies = new Map([
      ['army_1', makeArmy('army_1', 'site_1', 'realm_qin')],
      ['army_2', makeArmy('army_2', 'site_2', 'realm_han')],
    ])
    const sites = new Map([
      ['site_1', makeSite('site_1')],
      ['site_2', makeSite('site_2')],
    ])
    const realms = new Map([
      ['realm_qin', makeRealm('realm_qin', '#1A1A1A')],
      ['realm_han', makeRealm('realm_han', '#D8741A')],
    ])
    drawArmies(ctx, armies, sites, realms, null)
    expect(ctx.arc).toHaveBeenCalledTimes(2)
  })

  it('calls stroke for selected army', () => {
    const ctx = makeMockCtx()
    const armies = new Map([['army_1', makeArmy('army_1', 'site_1', 'realm_qin')]])
    const sites = new Map([['site_1', makeSite('site_1')]])
    const realms = new Map([['realm_qin', makeRealm('realm_qin', '#1A1A1A')]])
    drawArmies(ctx, armies, sites, realms, 'army_1')
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it('does not call stroke for non-selected army', () => {
    const ctx = makeMockCtx()
    const armies = new Map([['army_1', makeArmy('army_1', 'site_1', 'realm_qin')]])
    const sites = new Map([['site_1', makeSite('site_1')]])
    const realms = new Map([['realm_qin', makeRealm('realm_qin', '#1A1A1A')]])
    drawArmies(ctx, armies, sites, realms, null)
    expect(ctx.stroke).not.toHaveBeenCalled()
  })

  it('skips army if site not found', () => {
    const ctx = makeMockCtx()
    const armies = new Map([['army_1', makeArmy('army_1', 'missing_site', 'realm_qin')]])
    const sites = new Map<string, Site>()
    const realms = new Map([['realm_qin', makeRealm('realm_qin', '#1A1A1A')]])
    drawArmies(ctx, armies, sites, realms, null)
    expect(ctx.arc).not.toHaveBeenCalled()
  })
})
