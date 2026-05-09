import { describe, it, expect, vi } from 'vitest'
import { drawArmies } from '../army-render'
import type { Army, Site, Realm } from '~/shared/types'
import { makeCoverageKey } from '~/shared/types'

interface MockResult {
  ctx: CanvasRenderingContext2D
  strokeCalls: string[]
}

function makeMockCtx(): MockResult {
  const strokeCalls: string[] = []
  let currentStroke = ''
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(() => { strokeCalls.push(currentStroke) }),
    fillText: vi.fn(),
    fillStyle: '',
    get strokeStyle() { return currentStroke },
    set strokeStyle(v: string) { currentStroke = v },
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, strokeCalls }
}

const PLAYER = 'realm_qin'
const ENEMY = 'realm_wei'
const SILVER = '#C0C0C0'
const GOLD = '#FFD700'

interface ArgsOverrides {
  coverage?: number
  isAlly?: boolean
  isOwnRealm?: boolean
  m7Enabled?: boolean
  selected?: boolean
}

interface DrawArgs {
  armies: Map<string, Army>
  sites: Map<string, Site>
  realms: Map<string, Realm>
  selectedArmyId: string | null
  playerRealmId: string
  intelligenceCoverage: Map<string, number>
  activeAllies: ReadonlySet<string>
  m7Enabled: boolean
}

function makeArgs(overrides: ArgsOverrides = {}): DrawArgs {
  const armyRealmId = overrides.isOwnRealm ? PLAYER : ENEMY
  const army = {
    id: 'army_1',
    realmId: armyRealmId,
    manpower: 5000,
    location: 'site_1',
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
  } as unknown as Army
  const site = {
    id: 'site_1',
    name: 's',
    position: [100, 200] as [number, number],
    boundary: [],
    ownerId: null,
    polygon: [],
    adjacency: [],
    economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
  } as unknown as Site
  const realm = {
    id: armyRealmId,
    displayName: 'X',
    fullTitle: 'X',
    color: '#ff0000',
    capital: 'site_1',
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  } as unknown as Realm
  const coverage = overrides.coverage ?? 0
  const cov = new Map<string, number>([[makeCoverageKey(PLAYER, ENEMY), coverage]])
  const allies: ReadonlySet<string> = overrides.isAlly ? new Set([ENEMY]) : new Set()
  return {
    armies: new Map([['army_1', army]]),
    sites: new Map([['site_1', site]]),
    realms: new Map([[armyRealmId, realm]]),
    selectedArmyId: overrides.selected ? 'army_1' : null,
    playerRealmId: PLAYER,
    intelligenceCoverage: cov,
    activeAllies: allies,
    m7Enabled: overrides.m7Enabled ?? true,
  }
}

function callDraw(ctx: CanvasRenderingContext2D, args: DrawArgs): void {
  drawArmies(
    ctx,
    args.armies,
    args.sites,
    args.realms,
    args.selectedArmyId,
    args.playerRealmId,
    args.intelligenceCoverage,
    args.activeAllies,
    args.m7Enabled,
  )
}

describe('drawArmies fog-of-war tier gating', () => {
  it('m7Enabled=false → full visibility regardless of coverage', () => {
    const { ctx } = makeMockCtx()
    const args = makeArgs({ coverage: 0, m7Enabled: false })
    callDraw(ctx, args)
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('own realm → full visibility (manpower visible)', () => {
    const { ctx } = makeMockCtx()
    const args = makeArgs({ isOwnRealm: true, coverage: 0, m7Enabled: true })
    callDraw(ctx, args)
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('active ally → full visibility (manpower visible)', () => {
    const { ctx } = makeMockCtx()
    const args = makeArgs({ isAlly: true, coverage: 0, m7Enabled: true })
    callDraw(ctx, args)
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('enemy hidden tier (coverage = 0) → no dot, no manpower', () => {
    const { ctx } = makeMockCtx()
    const args = makeArgs({ coverage: 0 })
    callDraw(ctx, args)
    expect(ctx.arc).not.toHaveBeenCalled()
    expect(ctx.fillText).not.toHaveBeenCalled()
  })

  it('enemy hidden tier (coverage = 29) → no dot at boundary', () => {
    const { ctx } = makeMockCtx()
    const args = makeArgs({ coverage: 29 })
    callDraw(ctx, args)
    expect(ctx.arc).not.toHaveBeenCalled()
    expect(ctx.fillText).not.toHaveBeenCalled()
  })

  it('enemy low tier (coverage = 30) → dot visible, manpower hidden', () => {
    const { ctx } = makeMockCtx()
    const args = makeArgs({ coverage: 30 })
    callDraw(ctx, args)
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fillText).not.toHaveBeenCalled()
  })

  it('enemy mid tier (coverage = 60) → dot + manpower visible, no high border', () => {
    const { ctx, strokeCalls } = makeMockCtx()
    const args = makeArgs({ coverage: 60 })
    callDraw(ctx, args)
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalled()
    expect(strokeCalls).not.toContain(SILVER)
    expect(strokeCalls).not.toContain(GOLD)
  })

  it('enemy high tier (coverage = 90) → dot + manpower + silver border', () => {
    const { ctx, strokeCalls } = makeMockCtx()
    const args = makeArgs({ coverage: 90 })
    callDraw(ctx, args)
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalled()
    expect(strokeCalls).toContain(SILVER)
  })

  it('enemy high tier (coverage = 100) → silver border', () => {
    const { ctx, strokeCalls } = makeMockCtx()
    const args = makeArgs({ coverage: 100 })
    callDraw(ctx, args)
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalled()
    expect(strokeCalls).toContain(SILVER)
  })

  it('selected enemy at low tier → gold border (selection wins over no-border)', () => {
    const { ctx, strokeCalls } = makeMockCtx()
    const args = makeArgs({ coverage: 30, selected: true })
    callDraw(ctx, args)
    expect(ctx.arc).toHaveBeenCalled()
    expect(strokeCalls).toContain(GOLD)
  })

  it('selected enemy at high tier → gold border (selection takes priority over silver)', () => {
    const { ctx, strokeCalls } = makeMockCtx()
    const args = makeArgs({ coverage: 90, selected: true })
    callDraw(ctx, args)
    expect(strokeCalls).toContain(GOLD)
    expect(strokeCalls).not.toContain(SILVER)
  })

  it('selected own army → full visibility + gold border', () => {
    const { ctx, strokeCalls } = makeMockCtx()
    const args = makeArgs({ isOwnRealm: true, selected: true })
    callDraw(ctx, args)
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalled()
    expect(strokeCalls).toContain(GOLD)
  })

  it('multiple armies: own visible + hidden enemy skipped', () => {
    const { ctx } = makeMockCtx()
    const ownArmy = {
      id: 'army_own',
      realmId: PLAYER,
      manpower: 3000,
      location: 'site_1',
      state: 'idle',
      destination: null,
      ticksRemaining: 0,
      source: null,
    } as unknown as Army
    const enemyArmy = {
      id: 'army_enemy',
      realmId: ENEMY,
      manpower: 4000,
      location: 'site_2',
      state: 'idle',
      destination: null,
      ticksRemaining: 0,
      source: null,
    } as unknown as Army
    const site1 = {
      id: 'site_1', name: '1', position: [50, 50] as [number, number],
      boundary: [], ownerId: null, polygon: [], adjacency: [],
      economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
    } as unknown as Site
    const site2 = {
      id: 'site_2', name: '2', position: [150, 150] as [number, number],
      boundary: [], ownerId: null, polygon: [], adjacency: [],
      economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
    } as unknown as Site
    const realmQin = {
      id: PLAYER, displayName: 'Q', fullTitle: 'Q', color: '#1a1a1a',
      capital: 'site_1', initialSites: [], initialArmies: [],
      economy: { treasury: 0, foodStores: 0, taxRate: 10 }, traits: [],
      politicalSystem: 'enfeoffment',
    } as unknown as Realm
    const realmWei = {
      id: ENEMY, displayName: 'W', fullTitle: 'W', color: '#ff0000',
      capital: 'site_2', initialSites: [], initialArmies: [],
      economy: { treasury: 0, foodStores: 0, taxRate: 10 }, traits: [],
      politicalSystem: 'enfeoffment',
    } as unknown as Realm

    drawArmies(
      ctx,
      new Map([['army_own', ownArmy], ['army_enemy', enemyArmy]]),
      new Map([['site_1', site1], ['site_2', site2]]),
      new Map([[PLAYER, realmQin], [ENEMY, realmWei]]),
      null,
      PLAYER,
      new Map([[makeCoverageKey(PLAYER, ENEMY), 0]]),
      new Set(),
      true,
    )

    expect(ctx.arc).toHaveBeenCalledTimes(1)
    expect(ctx.fillText).toHaveBeenCalledTimes(1)
  })

  it('tier boundary: coverage = 89 → mid tier (no silver border)', () => {
    const { ctx, strokeCalls } = makeMockCtx()
    const args = makeArgs({ coverage: 89 })
    callDraw(ctx, args)
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalled()
    expect(strokeCalls).not.toContain(SILVER)
  })

  it('tier boundary: coverage = 59 → low tier (manpower hidden)', () => {
    const { ctx } = makeMockCtx()
    const args = makeArgs({ coverage: 59 })
    callDraw(ctx, args)
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fillText).not.toHaveBeenCalled()
  })
})
