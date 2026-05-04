import { describe, expect, it, vi } from 'vitest'
import type {
  DiplomaticRelation,
  GameDate,
  IdeologyLean,
  Realm,
  World,
} from '~/shared/types'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { relationKey, scoreDiplomacyAcceptance } from '../diplomacy-core'
import {
  M6_ENABLED,
  M6_IDEOLOGY_DISTANCE_WEIGHT,
  M6_PRESTIGE_DIFFERENTIAL_WEIGHT,
} from '~/content/m2/balance'

const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const qin = 'realm_qin'
const han = 'realm_han'

const ZERO_LEAN: IdeologyLean = { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }

function makeRealm(id: string, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'aggressive_random',
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    stats: { manpowerPool: 1000, manpowerCap: 5000, warWeariness: 0 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { ...ZERO_LEAN },
    warVictoriesThisYear: 0,
    ...overrides,
  }
}

function makeRelation(): DiplomaticRelation {
  return {
    key: relationKey(qin, han),
    realmAId: han,
    realmBId: qin,
    attitude: 30,
    trust: 70,
    updatedAt: DATE,
  }
}

function baseWorld(qinOverrides: Partial<Realm> = {}, hanOverrides: Partial<Realm> = {}): World {
  return makeEmptyWorld({
    date: DATE,
    realms: new Map([
      [qin, makeRealm(qin, qinOverrides)],
      [han, makeRealm(han, hanOverrides)],
    ]),
    relations: new Map([[relationKey(qin, han), makeRelation()]]),
    playerRealmId: qin,
  })
}

describe('M6 diplomacy modifiers (peace/non_aggression/alliance)', () => {
  it('high prestige proposer raises peace acceptance score', () => {
    const lowPrestige = baseWorld({ prestige: 0 }, { prestige: 0 })
    const highPrestige = baseWorld({ prestige: 80 }, { prestige: 0 })

    const request = { kind: 'peace' as const, proposingRealmId: qin, targetRealmId: han }
    const lowScore = scoreDiplomacyAcceptance(lowPrestige, request, 'incompetent')
    const highScore = scoreDiplomacyAcceptance(highPrestige, request, 'incompetent')

    expect(highScore).toBeGreaterThan(lowScore)
  })

  it('similar ideology raises non_aggression acceptance score', () => {
    const proposerLean: IdeologyLean = { fa: 80, ru: 20, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const similarLean: IdeologyLean = { fa: 70, ru: 30, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const dissimilarLean: IdeologyLean = { ...ZERO_LEAN, ru: 80, mo: 20 }

    const similarWorld = baseWorld({ ideologyLean: proposerLean }, { ideologyLean: similarLean })
    const dissimilarWorld = baseWorld({ ideologyLean: proposerLean }, { ideologyLean: dissimilarLean })

    const request = { kind: 'non_aggression' as const, proposingRealmId: qin, targetRealmId: han }
    const similarScore = scoreDiplomacyAcceptance(similarWorld, request, 'incompetent')
    const dissimilarScore = scoreDiplomacyAcceptance(dissimilarWorld, request, 'incompetent')

    expect(similarScore).toBeGreaterThan(dissimilarScore)
  })

  it('opposite ideology produces lower acceptance than similar ideology', () => {
    const proposerLean: IdeologyLean = { fa: 80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const similarLean: IdeologyLean = { fa: 80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const oppositeLean: IdeologyLean = { fa: -80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }

    const similarWorld = baseWorld({ ideologyLean: proposerLean }, { ideologyLean: similarLean })
    const oppositeWorld = baseWorld({ ideologyLean: proposerLean }, { ideologyLean: oppositeLean })

    const request = { kind: 'non_aggression' as const, proposingRealmId: qin, targetRealmId: han }
    const similarScore = scoreDiplomacyAcceptance(similarWorld, request, 'incompetent')
    const oppositeScore = scoreDiplomacyAcceptance(oppositeWorld, request, 'incompetent')

    expect(oppositeScore).toBeLessThan(similarScore)
  })

  it('declare_war proposal score is unaffected by prestige differential', () => {
    const lowPrestige = baseWorld({ prestige: 0 }, { prestige: 0 })
    const highPrestige = baseWorld({ prestige: 100 }, { prestige: 0 })

    const request = { kind: 'declare_war' as const, proposingRealmId: qin, targetRealmId: han }
    const lowScore = scoreDiplomacyAcceptance(lowPrestige, request, 'incompetent')
    const highScore = scoreDiplomacyAcceptance(highPrestige, request, 'incompetent')

    expect(highScore).toBe(lowScore)
  })

  it('declare_war proposal score is unaffected by ideology similarity', () => {
    const sharedLean: IdeologyLean = { fa: 80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const oppositeLean: IdeologyLean = { fa: -80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }

    const similarWorld = baseWorld({ ideologyLean: sharedLean }, { ideologyLean: sharedLean })
    const oppositeWorld = baseWorld({ ideologyLean: sharedLean }, { ideologyLean: oppositeLean })

    const request = { kind: 'declare_war' as const, proposingRealmId: qin, targetRealmId: han }
    const similarScore = scoreDiplomacyAcceptance(similarWorld, request, 'incompetent')
    const oppositeScore = scoreDiplomacyAcceptance(oppositeWorld, request, 'incompetent')

    expect(similarScore).toBe(oppositeScore)
  })

  it('clamps combined score into [0, 100]', () => {
    const proposerLean: IdeologyLean = { fa: 100, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const targetLean: IdeologyLean = { fa: 100, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }

    const world = baseWorld(
      { prestige: 100, ideologyLean: proposerLean },
      { prestige: 0, ideologyLean: targetLean },
    )

    const request = { kind: 'envoy' as const, proposingRealmId: qin, targetRealmId: han }
    const score = scoreDiplomacyAcceptance(world, request, 'incompetent')

    expect(score).toBeLessThanOrEqual(100)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('M6 enabled flag asserts at expected value (sanity)', () => {
    expect(M6_ENABLED).toBe(true)
  })

  it('balance constants match plan values', () => {
    expect(M6_PRESTIGE_DIFFERENTIAL_WEIGHT).toBe(0.5)
    expect(M6_IDEOLOGY_DISTANCE_WEIGHT).toBe(20)
  })

  it('with M6_ENABLED=false, peace score equals M3 baseline', async () => {
    vi.resetModules()
    vi.doMock('~/content/m2/balance', async () => {
      const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
        '~/content/m2/balance',
      )
      return { ...actual, M6_ENABLED: false }
    })

    const { scoreDiplomacyAcceptance: scoreDisabled } = await import('../diplomacy-core')

    const proposerLean: IdeologyLean = { fa: 80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const targetLean: IdeologyLean = { fa: 80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const noModifiers = baseWorld({ prestige: 0, ideologyLean: { ...ZERO_LEAN } }, { prestige: 0, ideologyLean: { ...ZERO_LEAN } })
    const withM6 = baseWorld({ prestige: 100, ideologyLean: proposerLean }, { prestige: 0, ideologyLean: targetLean })

    const request = { kind: 'peace' as const, proposingRealmId: qin, targetRealmId: han }
    const baselineScore = scoreDisabled(noModifiers, request, 'incompetent')
    const m6DisabledScore = scoreDisabled(withM6, request, 'incompetent')

    expect(m6DisabledScore).toBe(baselineScore)

    vi.doUnmock('~/content/m2/balance')
    vi.resetModules()
  })
})
