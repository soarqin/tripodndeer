import { describe, expect, it, vi } from 'vitest'
import type {
  GameDate,
  IdeologyLean,
  PeaceProposal,
  Realm,
  Site,
  WarState,
  World,
} from '~/shared/types'
import { warKey } from '~/engine/wars'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { scoreProposalAcceptance } from '../index'

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
    capital: 'site_a',
    initialSites: [],
    initialArmies: [],
    traits: [],
    politicalSystem: 'enfeoffment',
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    stats: { manpowerPool: 1000, manpowerCap: 5000, warWeariness: 50 },
    prestige: 40,
    ideologyLean: { ...ZERO_LEAN },
    warVictoriesThisYear: 0,
    ...overrides,
  }
}

function makeSite(id: string, ownerId: string | null, occupierId: string | null = null): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
    occupation: occupierId
      ? { occupierId, controlLevel: 100 }
      : undefined,
  }
}

function makeWarState(): WarState {
  return {
    casusBelli: null,
    declaredAt: DATE,
    occupiedSites: new Map(),
    peaceProposalId: null,
  }
}

function makeProposal(): PeaceProposal {
  return {
    id: 'prop_1',
    proposingRealmId: qin,
    targetRealmId: han,
    terms: [],
    proposedAt: DATE,
    status: 'pending',
    acknowledgedAt: null,
  }
}

function baseWorld(qinOverrides: Partial<Realm> = {}, hanOverrides: Partial<Realm> = {}): World {
  return makeEmptyWorld({
    date: DATE,
    realms: new Map([
      [qin, makeRealm(qin, qinOverrides)],
      [han, makeRealm(han, hanOverrides)],
    ]),
    sites: new Map([
      ['site_han_1', makeSite('site_han_1', han, qin)],
      ['site_han_2', makeSite('site_han_2', han, qin)],
    ]),
    wars: new Map([[warKey(qin, han), makeWarState()]]),
    playerRealmId: qin,
  })
}

describe('scoreProposalAcceptance M6 modifiers', () => {
  it('peace acceptance higher with similar ideology than opposite ideology', () => {
    const proposerLean: IdeologyLean = { fa: 80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const similarLean: IdeologyLean = { fa: 80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const oppositeLean: IdeologyLean = { fa: -80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }

    const similarWorld = baseWorld({ ideologyLean: proposerLean }, { ideologyLean: similarLean })
    const oppositeWorld = baseWorld({ ideologyLean: proposerLean }, { ideologyLean: oppositeLean })

    const similarScore = scoreProposalAcceptance(similarWorld, makeProposal())
    const oppositeScore = scoreProposalAcceptance(oppositeWorld, makeProposal())

    expect(similarScore).toBeGreaterThan(oppositeScore)
  })

  it('peace acceptance higher when proposer has higher prestige', () => {
    const lowPrestige = baseWorld({ prestige: 0 }, { prestige: 0 })
    const highPrestige = baseWorld({ prestige: 80 }, { prestige: 0 })

    const lowScore = scoreProposalAcceptance(lowPrestige, makeProposal())
    const highScore = scoreProposalAcceptance(highPrestige, makeProposal())

    expect(highScore).toBeGreaterThan(lowScore)
  })

  it('clamps score into [0, 100]', () => {
    const sharedLean: IdeologyLean = { fa: 100, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const world = baseWorld(
      { prestige: 100, ideologyLean: sharedLean },
      { prestige: 0, ideologyLean: sharedLean },
    )
    const score = scoreProposalAcceptance(world, makeProposal())

    expect(score).toBeLessThanOrEqual(100)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('with M6_ENABLED=false, score equals M3 baseline', async () => {
    vi.resetModules()
    vi.doMock('~/content/m2/balance', async () => {
      const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
        '~/content/m2/balance',
      )
      return { ...actual, M6_ENABLED: false }
    })

    const { scoreProposalAcceptance: scoreDisabled } = await import('../proposal-lifecycle')

    const proposerLean: IdeologyLean = { fa: 80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const noModifiers = baseWorld({ prestige: 0, ideologyLean: { ...ZERO_LEAN } }, { prestige: 0, ideologyLean: { ...ZERO_LEAN } })
    const withM6 = baseWorld({ prestige: 100, ideologyLean: proposerLean }, { prestige: 0, ideologyLean: proposerLean })

    const baselineScore = scoreDisabled(noModifiers, makeProposal())
    const m6DisabledScore = scoreDisabled(withM6, makeProposal())

    expect(m6DisabledScore).toBe(baselineScore)

    vi.doUnmock('~/content/m2/balance')
    vi.resetModules()
  })
})
