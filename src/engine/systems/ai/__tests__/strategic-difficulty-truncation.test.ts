import { describe, expect, it } from 'vitest'
import { createInitialRng } from '~/engine/random'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { DiplomaticRelation, Realm, RealmId, RulerState, Site, World } from '~/shared/types'
import { aiStrategicStep } from '../strategic'

const playerRealmId = 'realm_player'
const aiRealmId = 'realm_ai'
const allyRealmId = 'realm_ally'

function makeRealm(id: RealmId, capital: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital,
    initialSites: [capital],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 1000, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
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

function makeRuler(realmId: RealmId): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}`,
    age: 40,
    lifespan: 70,
    health: 100,
    personality: 'conqueror',
    personalityDims: {
      expansionDrive: 0.5,
      diplomaticTrust: 0.5,
      caution: 0.5,
      honor: 0.5,
      vindictiveness: 0.5,
      reformInclination: 0.5,
      patience: 0.5,
      preferredStrategy: 'diplomatic',
    },
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function relation(a: RealmId, b: RealmId, attitude: number, trust: number): DiplomaticRelation {
  return {
    key: `${a}__${b}`,
    realmAId: a,
    realmBId: b,
    attitude,
    trust,
    updatedAt: { yearBC: 300, season: 'spring', month: 1, xun: 'shang' },
  }
}

function makeWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    date: { yearBC: 300, season: 'spring', month: 1, xun: 'shang' },
    tick: 36,
    playerRealmId,
    realms: new Map([
      [playerRealmId, makeRealm(playerRealmId, 'site_player')],
      [aiRealmId, makeRealm(aiRealmId, 'site_ai')],
      [allyRealmId, makeRealm(allyRealmId, 'site_ally')],
    ]),
    sites: new Map([
      ['site_player', makeSite('site_player', playerRealmId)],
      ['site_ai', makeSite('site_ai', aiRealmId)],
      ['site_ally', makeSite('site_ally', allyRealmId)],
    ]),
    relations: new Map([
      [`${aiRealmId}__${allyRealmId}`, relation(aiRealmId, allyRealmId, 50, 20)],
    ]),
    rulers: new Map([
      [aiRealmId, makeRuler(aiRealmId)],
      [allyRealmId, makeRuler(allyRealmId)],
    ]),
    ...overrides,
  })
}

describe('strategic difficulty truncation', () => {
  it('removes ally intent at weak difficulty', () => {
    const result = aiStrategicStep(
      makeWorld({ difficulty: 'weak' }),
      createInitialRng(1)
    )

    expect(result.world.aiState.get(aiRealmId)?.strategic?.mainAllyRealmId).toBeNull()
  })

  it('keeps ally intent at hero difficulty', () => {
    const result = aiStrategicStep(
      makeWorld({ difficulty: 'hero' }),
      createInitialRng(1)
    )

    expect(result.world.aiState.get(aiRealmId)?.strategic?.mainAllyRealmId).toBe(allyRealmId)
  })
})
