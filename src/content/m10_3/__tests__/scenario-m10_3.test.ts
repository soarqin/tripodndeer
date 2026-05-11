import { describe, it, expect } from 'vitest'
import scenarioJson from '~/content/m10_3/scenario.json'
import charactersJson from '~/content/m10_3/character-templates.json'
import { M1DataSchemaV8 } from '~/shared/schemas/world'
import { M9DataCharacterTemplateSchema } from '~/shared/schemas/m9-data'

interface RealmShape {
  id: string
  rulerId?: string | null
}

interface SiteShape {
  id: string
}

interface CharacterShape {
  id: string
  realmId: string
}

interface AdjacencyShape {
  id: string
  passId?: string
}

describe('M10.3 tutorial scenario invariants', () => {
  const realms = scenarioJson.realms as readonly RealmShape[]
  const sites = scenarioJson.sites as readonly SiteShape[]
  const templates = charactersJson.templates as readonly CharacterShape[]

  it('Test 1: scenario file exists and is valid JSON', () => {
    expect(scenarioJson).toBeDefined()
    expect(typeof scenarioJson).toBe('object')
  })

  it('Test 2: character-templates file exists and is valid JSON', () => {
    expect(charactersJson).toBeDefined()
    expect(typeof charactersJson).toBe('object')
    expect(Array.isArray(templates)).toBe(true)
  })

  it('Test 3: sites count = 10', () => {
    expect(sites.length).toBe(10)
  })

  it('Test 4: realms count = 4', () => {
    expect(realms.length).toBe(4)
  })

  it('Test 5: character templates count = 6', () => {
    expect(templates.length).toBe(6)
  })

  it('Test 6: all 4 expected realm IDs present with _tutorial suffix', () => {
    const expectedRealmIds = [
      'realm_qin_tutorial',
      'realm_shu_tutorial',
      'realm_ba_tutorial',
      'realm_ju_tutorial',
    ]
    const realmIds = realms.map((r) => r.id)
    for (const id of expectedRealmIds) {
      expect(realmIds, `Missing realm ${id}`).toContain(id)
    }
  })

  it('Test 7: all realm IDs end with _tutorial suffix', () => {
    for (const realm of realms) {
      expect(realm.id.endsWith('_tutorial'), `${realm.id} must end with _tutorial`).toBe(true)
    }
  })

  it('Test 8: each realm has a corresponding ruler in character-templates (ruler invariant)', () => {
    const templateIds = new Set(templates.map((c) => c.id))
    for (const realm of realms) {
      expect(realm.rulerId, `${realm.id} must have non-null rulerId`).toBeTruthy()
      expect(
        templateIds.has(realm.rulerId as string),
        `${realm.id} rulerId ${realm.rulerId} must exist in character templates`,
      ).toBe(true)
    }
  })

  it('Test 9: each ruler template realmId matches the realm it rules', () => {
    for (const realm of realms) {
      const ruler = templates.find((c) => c.id === realm.rulerId)
      expect(ruler, `Ruler for ${realm.id} should exist`).toBeDefined()
      expect(ruler!.realmId).toBe(realm.id)
    }
  })

  it('Test 10: adjacencyEdges is empty (tutorial has no passes)', () => {
    const adjacencyEdges = (scenarioJson.adjacencyEdges ?? []) as readonly AdjacencyShape[]
    expect(adjacencyEdges.length).toBe(0)
  })

  it('Test 11: no adjacencyEdges entries lacking passId', () => {
    const adjacencyEdges = (scenarioJson.adjacencyEdges ?? []) as readonly AdjacencyShape[]
    for (const ae of adjacencyEdges) {
      expect(
        ae.passId,
        `adjacencyEdge ${ae.id} must have passId — world.adjacencyEdges is ONLY for pass edges`,
      ).toBeTruthy()
    }
  })

  it('Test 12: passes is empty (tutorial has no passes)', () => {
    expect((scenarioJson.passes ?? []).length).toBe(0)
  })

  it('Test 13: schema_version is 8', () => {
    expect(scenarioJson.schema_version).toBe(8)
  })

  it('Test 14: scenario passes Zod M1DataSchemaV8 parse', () => {
    expect(() => M1DataSchemaV8.parse(scenarioJson)).not.toThrow()
  })

  it('Test 15: all character templates pass Zod M9DataCharacterTemplateSchema parse', () => {
    for (const template of templates) {
      expect(() => M9DataCharacterTemplateSchema.parse(template)).not.toThrow()
    }
  })

  it('Test 16: all realms have capital site reference in sites array', () => {
    const siteIds = new Set(sites.map((s) => s.id))
    for (const realm of scenarioJson.realms) {
      expect(siteIds.has(realm.capital), `Realm ${realm.id} capital ${realm.capital} not in sites`).toBe(true)
    }
  })

  it('Test 17: initialOwnership covers all 10 sites', () => {
    const ownership = scenarioJson.initialOwnership as Record<string, string>
    expect(Object.keys(ownership).length).toBe(10)
    const siteIds = new Set(sites.map((s) => s.id))
    for (const siteId of Object.keys(ownership)) {
      expect(siteIds.has(siteId), `ownership site ${siteId} must exist`).toBe(true)
    }
  })

  it('Test 18: Ju is neutral (single site, no other realm)', () => {
    const jiameng = sites.find((s) => s.id === 'site_jiameng')
    expect(jiameng).toBeDefined()
    const ownership = scenarioJson.initialOwnership as Record<string, string>
    expect(ownership['site_jiameng']).toBe('realm_ju_tutorial')
  })
})
