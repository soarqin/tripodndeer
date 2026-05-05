import { describe, expect, it } from 'vitest'

import { characterLifecyclePhase } from '../character-lifecycle'
import { characterSpawnPhase } from '../character-spawn'
import { makeTestWorld } from '~/engine/__tests__/world-test-fixtures'
import type {
  CharacterTemplate,
  CharId,
  GameDate,
  Realm,
  RealmId,
  RNGState,
  World,
} from '~/shared/types'

const rng: RNGState = { seed: 42, counter: 0 }

function makeDate(yearBC: number): GameDate {
  return { yearBC, season: 'spring', month: 1, xun: 'shang' }
}

function makeRealm(id: RealmId, status: 'active' | 'deactivated' = 'active'): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: `site_${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: {
      treasury: 1000,
      foodStores: 1000,
      taxRate: 0.1,
    },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
    status,
  }
}

const SHANG_YANG_TEMPLATE: CharacterTemplate = {
  id: 'char_shang_yang',
  givenName: '鞅',
  familyName: '商',
  realmId: 'realm_qin',
  birthYearBC: 390,
  deathYearBC: 338,
  birthplace: 'site_wei_capital',
  specialty: 'reformer',
  attributes: { wu: 60, zheng: 90, jiao: 70, mou: 95, xue: 88, po: 80 },
  historicalNotes: '法家代表，主导秦国变法',
  source: '史记',
}

function worldWithTemplate(
  yearBC: number,
  template: CharacterTemplate,
  realmStatus: 'active' | 'deactivated' = 'active',
): World {
  const realms = new Map<RealmId, Realm>([[template.realmId, makeRealm(template.realmId, realmStatus)]])
  const characterTemplates = new Map<CharId, CharacterTemplate>([[template.id, template]])
  return makeTestWorld({
    date: makeDate(yearBC),
    realms,
    characterTemplates,
    playerRealmId: template.realmId,
  })
}

describe('characterSpawnPhase (M9 time-window character templates)', () => {
  it('does NOT spawn 商鞅 at yearBC=400 (before threshold birthYearBC-20=370)', () => {
    const world = worldWithTemplate(400, SHANG_YANG_TEMPLATE)

    const result = characterSpawnPhase(world, rng)

    expect(result.world.generals.has('char_shang_yang')).toBe(false)
    expect(result.events).toEqual([])
  })

  it('spawns 商鞅 at yearBC=370 (at threshold birthYearBC-20=370)', () => {
    const world = worldWithTemplate(370, SHANG_YANG_TEMPLATE)

    const result = characterSpawnPhase(world, rng)

    const general = result.world.generals.get('char_shang_yang')
    expect(general).toBeDefined()
    expect(general?.name).toBe('商鞅')
    expect(general?.realmId).toBe('realm_qin')
    expect(general?.age).toBe(20)
    expect(general?.specialty).toBe('reformer')
    expect(general?.loyaltyState).toBe('loyal')
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.type).toBe('characterSpawned')
  })

  it('does NOT spawn template when realm is deactivated', () => {
    const world = worldWithTemplate(370, SHANG_YANG_TEMPLATE, 'deactivated')

    const result = characterSpawnPhase(world, rng)

    expect(result.world.generals.has('char_shang_yang')).toBe(false)
    expect(result.events).toEqual([])
  })

  it('is idempotent: calling phase twice spawns the template only once', () => {
    const world = worldWithTemplate(370, SHANG_YANG_TEMPLATE)

    const first = characterSpawnPhase(world, rng)
    const second = characterSpawnPhase(first.world, first.nextRng)

    expect(first.world.generals.size).toBe(1)
    expect(second.world.generals.size).toBe(1)
    expect(first.events).toHaveLength(1)
    expect(second.events).toEqual([])
  })

  it('spawned general enters normal lifecycle: ages and loses loyalty at year start', () => {
    const world = worldWithTemplate(370, SHANG_YANG_TEMPLATE)

    const spawned = characterSpawnPhase(world, rng)
    const beforeLoyalty = spawned.world.generals.get('char_shang_yang')?.loyalty
    const beforeAge = spawned.world.generals.get('char_shang_yang')?.age

    const after = characterLifecyclePhase(spawned.world, spawned.nextRng)
    const general = after.world.generals.get('char_shang_yang')

    expect(beforeLoyalty).toBe(80)
    expect(beforeAge).toBe(20)
    expect(general?.loyalty).toBe(79)
    expect(general?.age).toBe(21)
  })

  it('does NOT spawn already-dead template (current yearBC < deathYearBC)', () => {
    // 商鞅 deathYearBC=338. yearBC=320 means 320 BC, after 338 BC.
    // Condition `yearBC < deathYearBC` → 320 < 338 → TRUE → already dead.
    const world = worldWithTemplate(320, SHANG_YANG_TEMPLATE)

    const result = characterSpawnPhase(world, rng)

    expect(result.world.generals.has('char_shang_yang')).toBe(false)
    expect(result.events).toEqual([])
  })

  it('100-year simulation 453→353 BC: spawn count remains bounded (idempotent across years)', () => {
    let world = worldWithTemplate(453, SHANG_YANG_TEMPLATE)
    let totalSpawns = 0

    for (let yearBC = 453; yearBC >= 353; yearBC--) {
      world = { ...world, date: makeDate(yearBC) }
      const result = characterSpawnPhase(world, rng)
      world = result.world
      totalSpawns += result.events.length
    }

    // 商鞅 spawn window opens at yearBC=370 and closes at yearBC=338 (death).
    // Should spawn exactly once across the entire 100-year run.
    expect(totalSpawns).toBe(1)
    expect(world.generals.size).toBe(1)
    expect(world.generals.has('char_shang_yang')).toBe(true)
  })
})
