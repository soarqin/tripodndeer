import { describe, expect, it, vi } from 'vitest'
import type { General, GeneralId, Realm, RealmId, World } from '~/shared/types'
import { makeTestWorld } from '~/engine/__tests__/world-test-fixtures'
import { candidateScore } from '../succession'
import {
  M6_LEGITIMACY_BONUS_MULTIPLIER,
  M6_LEGITIMACY_BONUS_THRESHOLD,
} from '~/content/m2/balance'

function makeGeneral(id: GeneralId, realmId: RealmId, overrides: Partial<General> = {}): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty: 80,
    attrs: { wu: 50, zheng: 50, jiao: 50, mou: 50, xue: 50, po: 50 },
    ...overrides,
  }
}

function makeRealm(id: RealmId, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ffffff',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 1000, taxRate: 0.1 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
    ...overrides,
  }
}

function worldWith(realm: Realm): World {
  return makeTestWorld({
    realms: new Map([[realm.id, realm]]),
  })
}

describe('candidateScore M6 legitimacy bonus', () => {
  it('high prestige realm (>= 60) → score multiplied by 1.1', () => {
    const general = makeGeneral('g_a', 'realm_qin')
    const lowPrestigeWorld = worldWith(makeRealm('realm_qin', { prestige: 0 }))
    const highPrestigeWorld = worldWith(makeRealm('realm_qin', { prestige: 80 }))

    const lowScore = candidateScore(general, lowPrestigeWorld, 'realm_qin')
    const highScore = candidateScore(general, highPrestigeWorld, 'realm_qin')

    expect(highScore).toBeCloseTo(lowScore * M6_LEGITIMACY_BONUS_MULTIPLIER, 6)
  })

  it('exactly threshold prestige (=60) triggers multiplier', () => {
    const general = makeGeneral('g_a', 'realm_qin')
    const baseline = worldWith(makeRealm('realm_qin', { prestige: 0 }))
    const atThreshold = worldWith(
      makeRealm('realm_qin', { prestige: M6_LEGITIMACY_BONUS_THRESHOLD }),
    )

    const baselineScore = candidateScore(general, baseline, 'realm_qin')
    const thresholdScore = candidateScore(general, atThreshold, 'realm_qin')

    expect(thresholdScore).toBeCloseTo(baselineScore * M6_LEGITIMACY_BONUS_MULTIPLIER, 6)
  })

  it('low prestige realm (< 60) → no multiplier', () => {
    const general = makeGeneral('g_a', 'realm_qin')
    const zeroPrestige = worldWith(makeRealm('realm_qin', { prestige: 0 }))
    const justBelowThreshold = worldWith(
      makeRealm('realm_qin', { prestige: M6_LEGITIMACY_BONUS_THRESHOLD - 1 }),
    )

    expect(candidateScore(general, justBelowThreshold, 'realm_qin')).toBe(
      candidateScore(general, zeroPrestige, 'realm_qin'),
    )
  })

  it('M6_ENABLED=false → no multiplier even with high prestige', async () => {
    vi.resetModules()
    vi.doMock('~/content/m2/balance', async () => {
      const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
        '~/content/m2/balance',
      )
      return { ...actual, M6_ENABLED: false }
    })

    const { candidateScore: candidateScoreDisabled } = await import('../succession')

    const general = makeGeneral('g_a', 'realm_qin')
    const lowPrestige = worldWith(makeRealm('realm_qin', { prestige: 0 }))
    const highPrestige = worldWith(makeRealm('realm_qin', { prestige: 80 }))

    expect(candidateScoreDisabled(general, highPrestige, 'realm_qin')).toBe(
      candidateScoreDisabled(general, lowPrestige, 'realm_qin'),
    )

    vi.doUnmock('~/content/m2/balance')
    vi.resetModules()
  })

  it('balance constants match plan values', () => {
    expect(M6_LEGITIMACY_BONUS_THRESHOLD).toBe(60)
    expect(M6_LEGITIMACY_BONUS_MULTIPLIER).toBe(1.1)
  })
})
