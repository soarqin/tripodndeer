import { describe, expect, it } from 'vitest'
import type { Realm, RealmId, Site, World } from '~/shared/types'
import type { AIState, OperationalDirective } from '~/shared/types/ai-state'
import { createInitialRng } from '~/engine/random'
import { declareWar } from '~/engine/wars'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { aiTacticalStep, cleanseDirectives } from '../tactical-step'

const playerRealmId = 'realm_player'
const aiRealmId = 'realm_ai'
const enemyRealmId = 'realm_enemy'
const deactivatedRealmId = 'realm_gone'

function makeRealm(id: RealmId, capital: string, status?: Realm['status']): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital,
    initialSites: [capital],
    initialArmies: [],
    economy: { treasury: 1000, foodStores: 1000, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    status,
  }
}

function makeSite(id: string, ownerId: RealmId): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 1000, households: 100, taxBase: 100, foodProduction: 100 },
  }
}

function directive(overrides: Partial<OperationalDirective> = {}): OperationalDirective {
  return {
    id: 'directive_1',
    kind: 'diplomacy',
    priority: 10,
    targetRealmId: enemyRealmId,
    createdAtTick: 1,
    expiresAtTick: 20,
    ...overrides,
  }
}

function aiState(operational: readonly OperationalDirective[]): AIState {
  return { strategic: null, operational }
}

function baseWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    tick: 10,
    playerRealmId,
    realms: new Map([
      [playerRealmId, makeRealm(playerRealmId, 'site_player')],
      [aiRealmId, makeRealm(aiRealmId, 'site_ai')],
      [enemyRealmId, makeRealm(enemyRealmId, 'site_enemy')],
      [deactivatedRealmId, makeRealm(deactivatedRealmId, 'site_gone', 'deactivated')],
    ]),
    sites: new Map([
      ['site_player', makeSite('site_player', playerRealmId)],
      ['site_ai', makeSite('site_ai', aiRealmId)],
      ['site_enemy', makeSite('site_enemy', enemyRealmId)],
      ['site_gone', makeSite('site_gone', deactivatedRealmId)],
    ]),
    aiState: new Map([[aiRealmId, aiState([])]]),
    ...overrides,
  })
}

function runWith(directives: readonly OperationalDirective[], overrides: Partial<World> = {}) {
  return aiTacticalStep(
    baseWorld({
      aiState: new Map([[aiRealmId, aiState(directives)]]),
      ...overrides,
    }),
    createInitialRng(1)
  )
}

function directiveIds(world: World): readonly string[] {
  return (world.aiState.get(aiRealmId)?.operational ?? []).map((item) => item.id)
}

function droppedReasons(events: readonly { type: string; payload: unknown }[]): readonly unknown[] {
  return events
    .filter((event) => event.type === 'ai_directive_dropped')
    .map((event) => event.payload)
}

describe('cleanseDirectives', () => {
  it('drops expired directives', () => {
    const result = runWith([directive({ id: 'expired', expiresAtTick: 9 })])

    expect(directiveIds(result.world)).not.toContain('expired')
    expect(droppedReasons(result.events)).toContainEqual(
      expect.objectContaining({ directiveId: 'expired', reason: 'expired' })
    )
  })

  it('drops army-gone directives', () => {
    const result = runWith([
      directive({ id: 'army_gone', kind: 'dispatch_army', armyId: 'missing_army' }),
    ])

    expect(directiveIds(result.world)).not.toContain('army_gone')
    expect(droppedReasons(result.events)).toContainEqual(
      expect.objectContaining({ directiveId: 'army_gone', reason: 'army_gone' })
    )
  })

  it('drops achieved site objectives captured by the AI realm', () => {
    const result = runWith([
      directive({ id: 'captured', kind: 'support_front', targetSiteId: 'site_ai' }),
    ])

    expect(directiveIds(result.world)).not.toContain('captured')
    expect(droppedReasons(result.events)).toContainEqual(
      expect.objectContaining({ directiveId: 'captured', reason: 'objective_achieved' })
    )
  })

  it('drops declare_war directives when war is already active', () => {
    const result = runWith(
      [directive({ id: 'war_active', kind: 'declare_war' })],
      { wars: declareWar(new Map(), aiRealmId, enemyRealmId) }
    )

    expect(directiveIds(result.world)).not.toContain('war_active')
    expect(droppedReasons(result.events)).toContainEqual(
      expect.objectContaining({ directiveId: 'war_active', reason: 'war_active' })
    )
  })

  it('drops directives targeting deactivated realms', () => {
    const result = runWith([
      directive({ id: 'target_deactivated', targetRealmId: deactivatedRealmId }),
    ])

    expect(directiveIds(result.world)).not.toContain('target_deactivated')
    expect(droppedReasons(result.events)).toContainEqual(
      expect.objectContaining({
        directiveId: 'target_deactivated',
        reason: 'target_deactivated',
      })
    )
  })

  it('keeps active and valid directives', () => {
    const activeDirective = directive({ id: 'active' })

    const result = cleanseDirectives(baseWorld(), aiRealmId, [activeDirective])

    expect(result.active).toEqual([activeDirective])
    expect(result.dropped).toEqual([])
  })
})
