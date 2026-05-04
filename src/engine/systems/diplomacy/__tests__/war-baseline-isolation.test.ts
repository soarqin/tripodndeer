import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

describe('war declaration baseline isolation (M3 unchanged)', () => {
  it('M6_ENABLED=true + similar ideology + declare_war → score equals plain baseline', () => {
    const sharedLean: IdeologyLean = { fa: 80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const baseline = baseWorld({ ideologyLean: { ...ZERO_LEAN } }, { ideologyLean: { ...ZERO_LEAN } })
    const enriched = baseWorld({ ideologyLean: sharedLean }, { ideologyLean: sharedLean })

    const request = { kind: 'declare_war' as const, proposingRealmId: qin, targetRealmId: han }
    const baselineScore = scoreDiplomacyAcceptance(baseline, request, 'incompetent')
    const enrichedScore = scoreDiplomacyAcceptance(enriched, request, 'incompetent')

    expect(enrichedScore).toBe(baselineScore)
  })

  it('M6_ENABLED=true + high prestige proposer + declare_war → score equals baseline', () => {
    const baseline = baseWorld({ prestige: 0 }, { prestige: 0 })
    const enriched = baseWorld({ prestige: 100 }, { prestige: 0 })

    const request = { kind: 'declare_war' as const, proposingRealmId: qin, targetRealmId: han }
    const baselineScore = scoreDiplomacyAcceptance(baseline, request, 'incompetent')
    const enrichedScore = scoreDiplomacyAcceptance(enriched, request, 'incompetent')

    expect(enrichedScore).toBe(baselineScore)
  })

  it('M6_ENABLED=false + declare_war → score equals baseline', async () => {
    vi.resetModules()
    vi.doMock('~/content/m2/balance', async () => {
      const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
        '~/content/m2/balance',
      )
      return { ...actual, M6_ENABLED: false }
    })

    const { scoreDiplomacyAcceptance: scoreDisabled } = await import('../diplomacy-core')

    const sharedLean: IdeologyLean = { fa: 80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const baseline = baseWorld({ prestige: 0, ideologyLean: { ...ZERO_LEAN } }, { prestige: 0, ideologyLean: { ...ZERO_LEAN } })
    const enriched = baseWorld({ prestige: 100, ideologyLean: sharedLean }, { prestige: 0, ideologyLean: sharedLean })

    const request = { kind: 'declare_war' as const, proposingRealmId: qin, targetRealmId: han }
    expect(scoreDisabled(enriched, request, 'incompetent')).toBe(scoreDisabled(baseline, request, 'incompetent'))

    vi.doUnmock('~/content/m2/balance')
    vi.resetModules()
  })

  it('wars.ts source file contains no prestige/ideology/cosineSimilarity references', () => {
    const warsPath = resolve(process.cwd(), 'src/engine/wars/wars.ts')
    const source = readFileSync(warsPath, 'utf-8')

    expect(source).not.toMatch(/\bprestige\b/)
    expect(source).not.toMatch(/\bideologyLean\b/)
    expect(source).not.toMatch(/\bcosineSimilarity\b/)
  })

  it('peace proposal gets M6 boost while declare_war does not', () => {
    const sharedLean: IdeologyLean = { fa: 80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const baseline = baseWorld({ ideologyLean: { ...ZERO_LEAN } }, { ideologyLean: { ...ZERO_LEAN } })
    const enriched = baseWorld({ ideologyLean: sharedLean }, { ideologyLean: sharedLean })

    const peaceBaseline = scoreDiplomacyAcceptance(baseline, {
      kind: 'peace',
      proposingRealmId: qin,
      targetRealmId: han,
    }, 'incompetent')
    const peaceEnriched = scoreDiplomacyAcceptance(enriched, {
      kind: 'peace',
      proposingRealmId: qin,
      targetRealmId: han,
    }, 'incompetent')

    const warBaseline = scoreDiplomacyAcceptance(baseline, {
      kind: 'declare_war',
      proposingRealmId: qin,
      targetRealmId: han,
    }, 'incompetent')
    const warEnriched = scoreDiplomacyAcceptance(enriched, {
      kind: 'declare_war',
      proposingRealmId: qin,
      targetRealmId: han,
    }, 'incompetent')

    expect(peaceEnriched).toBeGreaterThan(peaceBaseline)
    expect(warEnriched).toBe(warBaseline)
  })
})
