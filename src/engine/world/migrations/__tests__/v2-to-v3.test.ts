import scenarioRaw from '@/content/m1/scenario.json'
import { createWorldFromM1Data } from '@/engine/world/factory'
import { migrateScenarioV2ToV3 } from '../v2-to-v3'
import { migrateScenarioV3ToV4 } from '../v3-to-v4'
import { M1DataSchemaV2, type M1DataV2 } from '@/shared/schemas'
import { describe, expect, it } from 'vitest'

const scenarioV2 = M1DataSchemaV2.parse(scenarioRaw)

function makeV2(overrides: Partial<M1DataV2> = {}): M1DataV2 {
  return M1DataSchemaV2.parse({
    ...scenarioV2,
    ...overrides,
  })
}

describe('migrateScenarioV2ToV3 — generals', () => {
  it('derives attrs from might/strategy/learning when missing', () => {
    const data = makeV2({
      generals: [
        {
          id: 'gen_test',
          realmId: 'realm_qin',
          name: '测试将',
          might: 14,
          command: 8000,
          loyalty: 80,
          strategy: 12,
          learning: 11,
        },
      ],
    })

    const v3 = migrateScenarioV2ToV3(data)
    const gen = v3.generals.find(g => g.id === 'gen_test')!

    expect(gen.attrs).toEqual({
      wu: 14,
      zheng: 10,
      jiao: 10,
      mou: 12,
      xue: 11,
      po: 10,
    })
  })

  it('uses default 10 for mou/xue when strategy/learning missing', () => {
    const data = makeV2({
      generals: [
        {
          id: 'gen_basic',
          realmId: 'realm_qin',
          name: '基础将',
          might: 8,
          command: 5000,
          loyalty: 70,
        },
      ],
    })

    const v3 = migrateScenarioV2ToV3(data)
    const gen = v3.generals.find(g => g.id === 'gen_basic')!

    expect(gen.attrs).toEqual({
      wu: 8,
      zheng: 10,
      jiao: 10,
      mou: 10,
      xue: 10,
      po: 10,
    })
  })

  it('low-might general (might < 15) gets specialty=administrator when missing', () => {
    const data = makeV2({
      generals: [
        {
          id: 'gen_admin',
          realmId: 'realm_han',
          name: '行政官',
          might: 8,
          command: 5000,
          loyalty: 75,
        },
      ],
    })

    const v3 = migrateScenarioV2ToV3(data)
    const gen = v3.generals.find(g => g.id === 'gen_admin')!

    expect(gen.specialty).toBe('administrator')
  })

  it('general with might>=15 gets specialty=commander when missing', () => {
    const data = makeV2({
      generals: [
        {
          id: 'gen_cmd',
          realmId: 'realm_qin',
          name: '将军',
          might: 15,
          command: 9000,
          loyalty: 80,
        },
      ],
    })

    const v3 = migrateScenarioV2ToV3(data)
    const gen = v3.generals.find(g => g.id === 'gen_cmd')!

    expect(gen.specialty).toBe('commander')
  })

  it('preserves existing specialty when present', () => {
    const data = makeV2({
      generals: [
        {
          id: 'gen_dip',
          realmId: 'realm_qi',
          name: '使者',
          might: 16,
          command: 9000,
          loyalty: 80,
          specialty: 'diplomat',
        },
      ],
    })

    const v3 = migrateScenarioV2ToV3(data)
    const gen = v3.generals.find(g => g.id === 'gen_dip')!

    expect(gen.specialty).toBe('diplomat')
  })

  it('fills general defaults: ambition=mid, age=30, posts=[], loyaltyState=loyal', () => {
    const data = makeV2({
      generals: [
        {
          id: 'gen_minimal',
          realmId: 'realm_qin',
          name: '最简',
          might: 10,
          command: 5000,
          loyalty: 70,
        },
      ],
    })

    const v3 = migrateScenarioV2ToV3(data)
    const gen = v3.generals.find(g => g.id === 'gen_minimal')!

    expect(gen.ambition).toBe('mid')
    expect(gen.age).toBe(30)
    expect(gen.posts).toEqual([])
    expect(gen.loyaltyState).toBe('loyal')
  })

})

describe('migrateScenarioV2ToV3 — realms', () => {
  it('realm without rulerId picks general with posts=[ruler]', () => {
    const data = makeV2({
      realms: scenarioV2.realms.map(r => ({ ...r, rulerId: undefined })),
      generals: [
        {
          id: 'gen_warrior_qin',
          realmId: 'realm_qin',
          name: '武士',
          might: 18,
          command: 10000,
          loyalty: 80,
          posts: [],
        },
        {
          id: 'gen_king_qin',
          realmId: 'realm_qin',
          name: '秦王',
          might: 12,
          command: 5000,
          loyalty: 100,
          posts: ['ruler'],
        },
      ],
    })

    const v3 = migrateScenarioV2ToV3(data)
    const qin = v3.realms.find(r => r.id === 'realm_qin')!

    expect(qin.rulerId).toBe('gen_king_qin')
  })

  it('realm without rulerId and without posts=ruler general picks highest might', () => {
    const data = makeV2({
      realms: scenarioV2.realms.map(r => ({ ...r, rulerId: undefined })),
      generals: [
        {
          id: 'gen_low',
          realmId: 'realm_qin',
          name: '小将',
          might: 8,
          command: 5000,
          loyalty: 70,
        },
        {
          id: 'gen_high',
          realmId: 'realm_qin',
          name: '大将',
          might: 18,
          command: 10000,
          loyalty: 80,
        },
      ],
    })

    const v3 = migrateScenarioV2ToV3(data)
    const qin = v3.realms.find(r => r.id === 'realm_qin')!

    expect(qin.rulerId).toBe('gen_high')
  })

  it('realm with no generals gets rulerId=null', () => {
    const data = makeV2({
      realms: scenarioV2.realms.map(r => ({ ...r, rulerId: undefined })),
      generals: [],
    })

    const v3 = migrateScenarioV2ToV3(data)
    for (const realm of v3.realms) {
      expect(realm.rulerId).toBeNull()
    }
  })

})

describe('migrateScenarioV2ToV3 — rulers', () => {
  it('maps aiPersonality=aggressive to ruler.personality=conqueror', () => {
    const data = makeV2({
      realms: [
        {
          ...scenarioV2.realms[0]!,
          rulerId: 'gen_a',
          aiPersonality: 'aggressive',
        },
      ],
      generals: [
        {
          id: 'gen_a',
          realmId: scenarioV2.realms[0]!.id,
          name: '王甲',
          might: 12,
          command: 5000,
          loyalty: 100,
          posts: ['ruler'],
        },
      ],
    })

    const v3 = migrateScenarioV2ToV3(data)
    const ruler = v3.rulers.find(r => r.realmId === scenarioV2.realms[0]!.id)!

    expect(ruler.personality).toBe('conqueror')
  })

  it('maps aiPersonality=cautious to ruler.personality=steward', () => {
    const data = makeV2({
      realms: [
        {
          ...scenarioV2.realms[0]!,
          rulerId: 'gen_b',
          aiPersonality: 'cautious',
        },
      ],
      generals: [
        {
          id: 'gen_b',
          realmId: scenarioV2.realms[0]!.id,
          name: '王乙',
          might: 12,
          command: 5000,
          loyalty: 100,
          posts: ['ruler'],
        },
      ],
    })

    const v3 = migrateScenarioV2ToV3(data)
    const ruler = v3.rulers.find(r => r.realmId === scenarioV2.realms[0]!.id)!

    expect(ruler.personality).toBe('steward')
  })

  it('maps aiPersonality=aggressive_random to ruler.personality=schemer', () => {
    const data = makeV2({
      realms: [
        {
          ...scenarioV2.realms[0]!,
          rulerId: 'gen_c',
          aiPersonality: 'aggressive_random',
        },
      ],
      generals: [
        {
          id: 'gen_c',
          realmId: scenarioV2.realms[0]!.id,
          name: '王丙',
          might: 12,
          command: 5000,
          loyalty: 100,
          posts: ['ruler'],
        },
      ],
    })

    const v3 = migrateScenarioV2ToV3(data)
    const ruler = v3.rulers.find(r => r.realmId === scenarioV2.realms[0]!.id)!

    expect(ruler.personality).toBe('schemer')
  })

  it('builds ruler defaults: age=45, lifespan=65, health=80, successionLawId=primogeniture', () => {
    const v3 = migrateScenarioV2ToV3(scenarioV2)
    const ruler = v3.rulers[0]!

    expect(ruler.age).toBe(45)
    expect(ruler.lifespan).toBe(65)
    expect(ruler.health).toBe(80)
    expect(ruler.successionLawId).toBe('primogeniture')
  })

  it('skips rulers when realm.rulerId is null', () => {
    const data = makeV2({
      realms: scenarioV2.realms.map(r => ({ ...r, rulerId: undefined })),
      generals: [],
    })

    const v3 = migrateScenarioV2ToV3(data)

    expect(v3.rulers).toEqual([])
  })

})

describe('migrateScenarioV2ToV3 — schema and integration', () => {
  it('outputs eventChainStates as empty array', () => {
    const v3 = migrateScenarioV2ToV3(scenarioV2)

    expect(v3.eventChainStates).toEqual([])
  })

  it('sets schema_version to 3', () => {
    const v3 = migrateScenarioV2ToV3(scenarioV2)

    expect(v3.schema_version).toBe(3)
  })

  it('chains v1→v2→v3 when raw data has no schema_version', () => {
    const v1Like = { ...scenarioRaw } as Record<string, unknown>
    delete v1Like.schema_version

    const v3 = migrateScenarioV2ToV3(v1Like)

    expect(v3.schema_version).toBe(3)
    expect(Array.isArray(v3.rulers)).toBe(true)
    expect(Array.isArray(v3.eventChainStates)).toBe(true)
  })

  it('populates world.rulers Map for realms with rulers', () => {
    const v3 = migrateScenarioV2ToV3(scenarioV2)
    const v4 = migrateScenarioV3ToV4(v3)
    const world = createWorldFromM1Data(v4, 99, 'realm_qin')

    expect(world.rulers.size).toBeGreaterThan(0)
    for (const realm of world.realms.values()) {
      if (realm.rulerId !== null && realm.rulerId !== undefined) {
        const ruler = world.rulers.get(realm.id)
        expect(ruler).toBeDefined()
        expect(ruler?.generalId).toBe(realm.rulerId)
      }
    }
  })

  it('initializes world.eventChainStates as empty Map', () => {
    const v3 = migrateScenarioV2ToV3(scenarioV2)
    const v4 = migrateScenarioV3ToV4(v3)
    const world = createWorldFromM1Data(v4, 99, 'realm_qin')

    expect(world.eventChainStates.size).toBe(0)
  })

  it('preserves existing rulerId when set', () => {
    const data = makeV2({
      realms: [
        {
          ...scenarioV2.realms[0]!,
          rulerId: 'gen_existing',
        },
      ],
      generals: [
        {
          id: 'gen_existing',
          realmId: scenarioV2.realms[0]!.id,
          name: '原王',
          might: 12,
          command: 5000,
          loyalty: 100,
          posts: ['ruler'],
        },
        {
          id: 'gen_other',
          realmId: scenarioV2.realms[0]!.id,
          name: '强将',
          might: 20,
          command: 12000,
          loyalty: 80,
          posts: [],
        },
      ],
    })

    const v3 = migrateScenarioV2ToV3(data)
    const realm = v3.realms[0]!

    expect(realm.rulerId).toBe('gen_existing')
  })
})
