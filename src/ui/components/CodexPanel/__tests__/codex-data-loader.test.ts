import type { World } from '~/shared/types'
import type { CharacterTemplate } from '~/shared/types/world'
import { describe, expect, it } from 'vitest'
import { deriveCharacterEntries, loadStaticEntriesFromModules } from '../codex-data-loader'

function makeWorld(characterTemplates: readonly CharacterTemplate[]): World {
  return {
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: 0,
    sites: new Map(),
    realms: new Map(),
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
    characterTemplates: new Map(characterTemplates.map((template) => [template.id, template])),
    localization: new Map(),
    aiState: new Map(),
    difficulty: 'hero',
    diplomaticMemory: new Map(),
    playerRealmId: 'realm_qin',
    scenarioId: 'm1',
    tutorialState: null,
    rngState: { seed: 42, counter: 0 },
    phases: [],
    pendingOrders: [],
  }
}

function makeTemplate(overrides: Partial<CharacterTemplate> & Pick<CharacterTemplate, 'id' | 'familyName' | 'givenName' | 'specialty'>): CharacterTemplate {
  return {
    realmId: 'realm_qin',
    birthYearBC: 300,
    deathYearBC: 250,
    birthplace: '临淄',
    attributes: { wu: 1, zheng: 2, jiao: 3, mou: 4, xue: 5, po: 6 },
    historicalNotes: '历史记载。',
    source: '其他',
    ...overrides,
  }
}

describe('codex-data-loader', () => {
  it('loads static mechanic and history markdown entries', () => {
    const entries = loadStaticEntriesFromModules({
      '/src/content/codex/mechanics/mechanic-army.md': '# 军阵\n\n内容一',
      '/src/content/codex/mechanics/mechanic-ward.md': '# 守备\n\n内容二',
      '/src/content/codex/mechanics/mechanic-siege.md': '# 攻城\n\n内容三',
      '/src/content/codex/history/history-qin.md': '# 秦史\n\n内容四',
      '/src/content/codex/history/history-zhou.md': '# 周史\n\n内容五',
    })

    expect(entries).toHaveLength(5)
    expect(entries.map((entry) => entry.id)).toEqual([
      'history-qin',
      'history-zhou',
      'mechanic-army',
      'mechanic-siege',
      'mechanic-ward',
    ])
    expect(entries[0]?.category).toBe('history')
    expect(entries[2]?.category).toBe('mechanics')
  })

  it('falls back to the entry id when the markdown title is missing', () => {
    const entries = loadStaticEntriesFromModules({
      '/src/content/codex/mechanics/mechanic-empty.md': '没有标题的正文',
    })

    expect(entries).toHaveLength(1)
    expect(entries[0]?.title).toBe('mechanic-empty')
    expect(entries[0]?.body).toBe('没有标题的正文')
  })

  it('returns no character entries for an empty M1 fixture', () => {
    expect(deriveCharacterEntries(makeWorld([]))).toEqual([])
  })

  it('derives character entries sorted by zh-CN collation', () => {
    const entries = deriveCharacterEntries(
      makeWorld([
        makeTemplate({ id: 'zhao-wu', familyName: '赵', givenName: '武', specialty: 'warrior' }),
        makeTemplate({ id: 'kong-qiu', familyName: '孔', givenName: '丘', specialty: 'scholar' }),
        makeTemplate({ id: 'meng-ke', familyName: '孟', givenName: '轲', specialty: 'strategist' }),
        makeTemplate({ id: 'shang-yang', familyName: '商', givenName: '鞅', specialty: 'reformer', aliases: ['子舆'] }),
        makeTemplate({ id: 'su-qin', familyName: '苏', givenName: '秦', specialty: 'commander', historicalNotes: '短记。' }),
      ]),
    )

    expect(entries).toHaveLength(5)
    expect(entries.map((entry) => entry.id)).toEqual([
      'character-kong-qiu',
      'character-meng-ke',
      'character-shang-yang',
      'character-su-qin',
      'character-zhao-wu',
    ])
    expect(entries[2]?.body).toContain('（字 子舆）')
    expect(entries[3]?.body).toContain('此人物历史记载较少，详见相关史册。')
    expect(entries[3]?.body).toContain('**专长**：统帅')
  })
})
