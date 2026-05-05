import { describe, expect, it } from 'vitest'

import { pickSpecialty, recruitmentPhase } from '../recruitment'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { PHASE_NAMES, PHASE_ORDER } from '~/engine/phases'
import type {
  CharacterRecruitedEvent,
  GameDate,
  General,
  Realm,
  RealmId,
  RNGState,
  PersonalityArchetype,
  Specialty,
  World,
} from '~/shared/types'
import {
  M5_RECRUITMENT_PER_REALM_PER_YEAR,
  M5_SPECIALTY_WEIGHTS_RECRUITMENT,
} from '~/content/m2/balance'

const yearStart: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const midYear: GameDate = { yearBC: 260, season: 'summer', month: 2, xun: 'zhong' }
const rng: RNGState = { seed: 42, counter: 0 }

function makeRealm(id: RealmId): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ffffff',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function worldWithRealms(realmIds: readonly RealmId[], date: GameDate = yearStart): World {
  const realms = new Map(realmIds.map((id) => [id, makeRealm(id)]))
  return makeEmptyWorld({ date, realms })
}

function specialtyCounts(personality: PersonalityArchetype): Map<Specialty, number> {
  const counts = new Map<Specialty, number>()
  let currentRng: RNGState = { seed: 42, counter: 0 }
  for (let i = 0; i < 50; i++) {
    const result = pickSpecialty(
      currentRng,
      M5_SPECIALTY_WEIGHTS_RECRUITMENT,
      personality,
    )
    counts.set(result.specialty, (counts.get(result.specialty) ?? 0) + 1)
    currentRng = result.nextRng
  }
  return counts
}

function countAny(counts: ReadonlyMap<Specialty, number>, specialties: readonly Specialty[]): number {
  return specialties.reduce((sum, specialty) => sum + (counts.get(specialty) ?? 0), 0)
}

describe('recruitmentPhase', () => {
  it('does nothing outside year start', () => {
    const world = worldWithRealms(['realm_qin', 'realm_zhao'], midYear)

    const result = recruitmentPhase(world, rng)

    expect(result.world).toBe(world)
    expect(result.nextRng).toBe(rng)
    expect(result.events).toEqual([])
  })

  it('recruits exactly M5_RECRUITMENT_PER_REALM_PER_YEAR characters per realm at year start', () => {
    const realmIds: RealmId[] = [
      'realm_qin',
      'realm_zhao',
      'realm_chu',
      'realm_qi',
      'realm_yan',
      'realm_han',
      'realm_wei',
    ]
    const world = worldWithRealms(realmIds)

    const result = recruitmentPhase(world, rng)

    const expectedCount = realmIds.length * M5_RECRUITMENT_PER_REALM_PER_YEAR
    expect(result.world.generals.size).toBe(expectedCount)
    expect(result.events).toHaveLength(expectedCount)
    expect(result.events.every((e) => e.type === 'characterRecruited')).toBe(true)
  })

  it('produces deterministic character IDs and attrs across repeated runs with same seed', () => {
    const world = worldWithRealms(['realm_qin', 'realm_zhao', 'realm_chu'])

    const first = recruitmentPhase(world, rng)
    const second = recruitmentPhase(world, rng)

    expect([...first.world.generals.keys()]).toEqual([...second.world.generals.keys()])
    const firstGenerals = [...first.world.generals.values()].map((g) => ({
      id: g.id,
      name: g.name,
      attrs: g.attrs,
      specialty: g.specialty,
      ambition: g.ambition,
    }))
    const secondGenerals = [...second.world.generals.values()].map((g) => ({
      id: g.id,
      name: g.name,
      attrs: g.attrs,
      specialty: g.specialty,
      ambition: g.ambition,
    }))
    expect(firstGenerals).toEqual(secondGenerals)
    expect(first.nextRng).toEqual(second.nextRng)
  })

  it('handles name collisions deterministically with numeric suffixes', () => {
    const allNames = [
      '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸',
      '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉',
      '戌', '亥', '仁', '义', '礼', '智', '信', '忠', '孝', '廉',
      '耻', '勇', '文', '武', '德', '才', '贤', '良', '善', '美',
      '正', '直', '刚', '毅', '明', '达', '通', '博', '雅', '清',
      '洁', '纯', '朴', '诚', '实', '厚', '重', '慎', '谦', '和',
    ]
    const generals = new Map<string, General>()
    for (let i = 0; i < allNames.length; i++) {
      const id = `gen_existing_${i}`
      generals.set(id, {
        id,
        realmId: 'realm_qin',
        name: allNames[i]!,
        might: 5,
        command: 5,
        loyalty: 80,
      })
    }
    const world = makeEmptyWorld({
      date: yearStart,
      realms: new Map([['realm_qin', makeRealm('realm_qin')]]),
      generals,
    })

    const result = recruitmentPhase(world, rng)

    const newGeneral = [...result.world.generals.values()].find((g) =>
      g.id.startsWith('gen_wild_'),
    )
    expect(newGeneral).toBeDefined()
    expect(newGeneral!.name).toMatch(/_\d+$/)
  })

  it('produces all 9 specialties across many seeds (distribution sanity check)', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin')]])
    const seenSpecialties = new Set<Specialty>()

    for (let seed = 1; seed <= 200 && seenSpecialties.size < 9; seed++) {
      const world = makeEmptyWorld({ date: yearStart, realms })
      const result = recruitmentPhase(world, { seed, counter: 0 })
      for (const general of result.world.generals.values()) {
        if (general.specialty !== undefined) seenSpecialties.add(general.specialty)
      }
    }

    expect(seenSpecialties.size).toBe(9)
  })

  it('recruitment phase is registered in PHASE_ORDER after characterLifecycle and before victoryCheck', () => {
    const recruitmentIdx = PHASE_ORDER.indexOf(PHASE_NAMES.RECRUITMENT)
    const characterIdx = PHASE_ORDER.indexOf(PHASE_NAMES.CHARACTER_LIFECYCLE)
    const victoryIdx = PHASE_ORDER.indexOf(PHASE_NAMES.VICTORY_CHECK)

    expect(recruitmentIdx).toBeGreaterThan(-1)
    expect(recruitmentIdx).toBeGreaterThan(characterIdx)
    expect(recruitmentIdx).toBeLessThan(victoryIdx)
  })

  it('processes realms in dictionary order for RNG determinism', () => {
    const realms = new Map<RealmId, Realm>([
      ['realm_zhao', makeRealm('realm_zhao')],
      ['realm_chu', makeRealm('realm_chu')],
      ['realm_qin', makeRealm('realm_qin')],
    ])
    const world = makeEmptyWorld({ date: yearStart, realms })

    const result = recruitmentPhase(world, rng)

    const events = result.events as readonly CharacterRecruitedEvent[]
    const realmIds = events.map((e) => e.payload.realmId)
    expect(realmIds).toEqual(['realm_chu', 'realm_qin', 'realm_zhao'])
  })

  it('every recruited general has all required fields populated', () => {
    const world = worldWithRealms(['realm_qin'])

    const result = recruitmentPhase(world, rng)

    const generals = [...result.world.generals.values()]
    expect(generals).toHaveLength(1)
    const gen = generals[0]!
    expect(gen.id).toMatch(/^gen_wild_realm_qin_/)
    expect(gen.realmId).toBe('realm_qin')
    expect(gen.name).toBeTruthy()
    expect(gen.loyalty).toBe(80)
    expect(gen.age).toBe(25)
    expect(gen.loyaltyState).toBe('loyal')
    expect(gen.posts).toEqual([])
    expect(gen.specialty).toBeDefined()
    expect(gen.ambition).toBeDefined()
    expect(gen.attrs).toBeDefined()
    expect(gen.attrs!.wu).toBeGreaterThanOrEqual(1)
    expect(gen.attrs!.wu).toBeLessThanOrEqual(20)
    expect(gen.attrs!.zheng).toBeGreaterThanOrEqual(1)
    expect(gen.attrs!.zheng).toBeLessThanOrEqual(20)
    expect(gen.attrs!.jiao).toBeGreaterThanOrEqual(1)
    expect(gen.attrs!.jiao).toBeLessThanOrEqual(20)
    expect(gen.attrs!.mou).toBeGreaterThanOrEqual(1)
    expect(gen.attrs!.mou).toBeLessThanOrEqual(20)
    expect(gen.attrs!.xue).toBeGreaterThanOrEqual(1)
    expect(gen.attrs!.xue).toBeLessThanOrEqual(20)
    expect(gen.attrs!.po).toBeGreaterThanOrEqual(1)
    expect(gen.attrs!.po).toBeLessThanOrEqual(20)
  })

  it('preserves existing generals and only adds new ones', () => {
    const existingGenerals = new Map<string, General>([
      [
        'gen_existing_1',
        {
          id: 'gen_existing_1',
          realmId: 'realm_qin',
          name: 'Existing',
          might: 10,
          command: 10,
          loyalty: 90,
        },
      ],
    ])
    const realms = new Map([['realm_qin', makeRealm('realm_qin')]])
    const world = makeEmptyWorld({ date: yearStart, realms, generals: existingGenerals })

    const result = recruitmentPhase(world, rng)

    expect(result.world.generals.has('gen_existing_1')).toBe(true)
    expect(result.world.generals.get('gen_existing_1')?.name).toBe('Existing')
    expect(result.world.generals.size).toBe(1 + M5_RECRUITMENT_PER_REALM_PER_YEAR)
  })
})

describe('pickSpecialty personality preferences', () => {
  it('conqueror prefers commander/warrior', () => {
    const counts = specialtyCounts('conqueror')

    expect(countAny(counts, ['commander', 'warrior'])).toBeGreaterThan(25)
  })

  it('learned prefers scholar', () => {
    const counts = specialtyCounts('learned')

    expect(counts.get('scholar') ?? 0).toBeGreaterThan(5)
  })

  it('schemer prefers spy/strategist/diplomat', () => {
    const counts = specialtyCounts('schemer')

    expect(countAny(counts, ['spy', 'strategist', 'diplomat'])).toBeGreaterThan(20)
  })

  it('steward prefers administrator', () => {
    const counts = specialtyCounts('steward')

    expect(counts.get('administrator') ?? 0).toBeGreaterThan(15)
  })

  it('builder prefers reformer/engineer', () => {
    const counts = specialtyCounts('builder')

    expect(countAny(counts, ['reformer', 'engineer'])).toBeGreaterThan(6)
  })

  it('benevolent prefers administrator/scholar', () => {
    const counts = specialtyCounts('benevolent')

    expect(countAny(counts, ['administrator', 'scholar'])).toBeGreaterThan(20)
  })

  it('incompetent has flatter distribution than biased archetypes', () => {
    const counts = specialtyCounts('incompetent')

    expect(Math.max(...counts.values())).toBeLessThan(20)
  })

  it('tyrant prefers commander/spy', () => {
    const counts = specialtyCounts('tyrant')

    expect(countAny(counts, ['commander', 'spy'])).toBeGreaterThan(20)
  })
})
