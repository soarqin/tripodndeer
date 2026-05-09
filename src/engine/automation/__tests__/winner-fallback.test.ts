import { describe, expect, it } from 'vitest'

import type { Realm, Site, World } from '~/shared/types'

import { getWinnerWithLargestActiveFallback } from '../winner-fallback'

function makeWorld(
  realms: World['realms'],
  sites: World['sites'],
): World {
  return {
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: 0,
    sites,
    realms,
    armies: new Map(),
    edges: new Map(),
    wars: new Map(),
    peaceProposals: new Map(),
    relations: new Map(),
    diplomaticProposals: new Map(),
    treaties: new Map(),
    diplomacyHistory: [],
    coalitions: new Map(),
    zhouInvestiture: new Map(),
    generals: new Map(),
    rulers: new Map(),
    academies: new Map(),
    eventChainStates: new Map(),
    reformStates: new Map(),
    disasterStates: new Map(),
    tradeRoutes: new Map(),
    factionInfluences: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    edicts: new Map(),
    governorAssignments: new Map(),
    intelligenceCoverage: new Map(),
    spyMissions: new Map(),
    counterIntelStates: new Map(),
    provinces: new Map(),
    regions: new Map(),
    characterTemplates: new Map(),
    localization: new Map(),
    aiState: new Map(),
    difficulty: 'common',
    diplomaticMemory: new Map(),
    playerRealmId: 'realm_a',
    rngState: { seed: 1, counter: 0 },
    phases: [],
    pendingOrders: [],
  }
}

function makeRealm(id: string, status: 'active' | 'deactivated' = 'active'): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 0 },
    traits: [],
    politicalSystem: 'enfeoffment',
    status,
  }
}

function makeSite(id: string, ownerId: string | null): Site {
  return {
    id,
    name: id,
    position: [0, 0] as const,
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
  }
}

describe('getWinnerWithLargestActiveFallback', () => {
  it('returns the unified active realm', () => {
    const world = makeWorld(
      new Map([[ 'realm_a', makeRealm('realm_a') ]]),
      new Map([
        ['site_1', makeSite('site_1', 'realm_a')],
        ['site_2', makeSite('site_2', 'realm_a')],
      ]),
    )

    expect(getWinnerWithLargestActiveFallback(world)).toBe('realm_a')
  })

  it('returns the active realm with the most sites when no winner exists', () => {
    const world = makeWorld(
      new Map([
        ['realm_a', makeRealm('realm_a')],
        ['realm_b', makeRealm('realm_b')],
        ['realm_c', makeRealm('realm_c')],
      ]),
      new Map([
        ['site_1', makeSite('site_1', 'realm_a')],
        ['site_2', makeSite('site_2', 'realm_a')],
        ['site_3', makeSite('site_3', 'realm_a')],
        ['site_4', makeSite('site_4', 'realm_a')],
        ['site_5', makeSite('site_5', 'realm_a')],
        ['site_6', makeSite('site_6', 'realm_a')],
        ['site_7', makeSite('site_7', 'realm_a')],
        ['site_8', makeSite('site_8', 'realm_a')],
        ['site_9', makeSite('site_9', 'realm_a')],
        ['site_10', makeSite('site_10', 'realm_a')],
        ['site_11', makeSite('site_11', 'realm_a')],
        ['site_12', makeSite('site_12', 'realm_a')],
        ['site_13', makeSite('site_13', 'realm_a')],
        ['site_14', makeSite('site_14', 'realm_a')],
        ['site_15', makeSite('site_15', 'realm_a')],
        ['site_16', makeSite('site_16', 'realm_a')],
        ['site_17', makeSite('site_17', 'realm_a')],
        ['site_18', makeSite('site_18', 'realm_a')],
        ['site_19', makeSite('site_19', 'realm_a')],
        ['site_20', makeSite('site_20', 'realm_a')],
        ['site_21', makeSite('site_21', 'realm_a')],
        ['site_22', makeSite('site_22', 'realm_a')],
        ['site_23', makeSite('site_23', 'realm_a')],
        ['site_24', makeSite('site_24', 'realm_a')],
        ['site_25', makeSite('site_25', 'realm_a')],
        ['site_26', makeSite('site_26', 'realm_a')],
        ['site_27', makeSite('site_27', 'realm_a')],
        ['site_28', makeSite('site_28', 'realm_a')],
        ['site_29', makeSite('site_29', 'realm_a')],
        ['site_30', makeSite('site_30', 'realm_a')],
        ['site_31', makeSite('site_31', 'realm_a')],
        ['site_32', makeSite('site_32', 'realm_a')],
        ['site_33', makeSite('site_33', 'realm_a')],
        ['site_34', makeSite('site_34', 'realm_a')],
        ['site_35', makeSite('site_35', 'realm_a')],
        ['site_36', makeSite('site_36', 'realm_a')],
        ['site_37', makeSite('site_37', 'realm_a')],
        ['site_38', makeSite('site_38', 'realm_a')],
        ['site_39', makeSite('site_39', 'realm_a')],
        ['site_40', makeSite('site_40', 'realm_a')],
        ['site_41', makeSite('site_41', 'realm_b')],
        ['site_42', makeSite('site_42', 'realm_b')],
        ['site_43', makeSite('site_43', 'realm_b')],
        ['site_44', makeSite('site_44', 'realm_b')],
        ['site_45', makeSite('site_45', 'realm_b')],
        ['site_46', makeSite('site_46', 'realm_b')],
        ['site_47', makeSite('site_47', 'realm_b')],
        ['site_48', makeSite('site_48', 'realm_b')],
        ['site_49', makeSite('site_49', 'realm_b')],
        ['site_50', makeSite('site_50', 'realm_b')],
        ['site_51', makeSite('site_51', 'realm_b')],
        ['site_52', makeSite('site_52', 'realm_b')],
        ['site_53', makeSite('site_53', 'realm_b')],
        ['site_54', makeSite('site_54', 'realm_b')],
        ['site_55', makeSite('site_55', 'realm_b')],
        ['site_56', makeSite('site_56', 'realm_b')],
        ['site_57', makeSite('site_57', 'realm_b')],
        ['site_58', makeSite('site_58', 'realm_b')],
        ['site_59', makeSite('site_59', 'realm_b')],
        ['site_60', makeSite('site_60', 'realm_b')],
        ['site_61', makeSite('site_61', 'realm_b')],
        ['site_62', makeSite('site_62', 'realm_b')],
        ['site_63', makeSite('site_63', 'realm_b')],
        ['site_64', makeSite('site_64', 'realm_b')],
        ['site_65', makeSite('site_65', 'realm_b')],
        ['site_66', makeSite('site_66', 'realm_b')],
        ['site_67', makeSite('site_67', 'realm_b')],
        ['site_68', makeSite('site_68', 'realm_b')],
        ['site_69', makeSite('site_69', 'realm_b')],
        ['site_70', makeSite('site_70', 'realm_b')],
        ['site_71', makeSite('site_71', 'realm_c')],
        ['site_72', makeSite('site_72', 'realm_c')],
        ['site_73', makeSite('site_73', 'realm_c')],
        ['site_74', makeSite('site_74', 'realm_c')],
        ['site_75', makeSite('site_75', 'realm_c')],
        ['site_76', makeSite('site_76', 'realm_c')],
        ['site_77', makeSite('site_77', 'realm_c')],
        ['site_78', makeSite('site_78', 'realm_c')],
        ['site_79', makeSite('site_79', 'realm_c')],
        ['site_80', makeSite('site_80', 'realm_c')],
      ]),
    )

    expect(getWinnerWithLargestActiveFallback(world)).toBe('realm_a')
  })

  it('returns null when no active realms exist', () => {
    const world = makeWorld(
      new Map([
        ['realm_a', makeRealm('realm_a', 'deactivated')],
        ['realm_b', makeRealm('realm_b', 'deactivated')],
      ]),
      new Map([
        ['site_1', makeSite('site_1', 'realm_a')],
      ]),
    )

    expect(getWinnerWithLargestActiveFallback(world)).toBeNull()
  })
})
