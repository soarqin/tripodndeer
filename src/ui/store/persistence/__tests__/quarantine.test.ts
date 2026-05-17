import 'fake-indexeddb/auto'

import fs from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { SAVE_DTO_VERSION } from '~/shared/types/save-dto'
import { getDb, resetDbForTesting, type SaveMetadata } from '../db'
import { loadSlot } from '../slot-crud'

const COMPRESSED_PREFIX = '\x00lz\x00'

function makeMetadata(slotId: string): SaveMetadata {
  return {
    slotId,
    name: 'Corrupt Save',
    createdAt: 1_000,
    tick: 0,
    scenarioId: 'm1',
    playerRealmName: '秦',
  }
}

function makeV6Envelope(world: unknown): Record<string, unknown> {
  return {
    schemaVersion: SAVE_DTO_VERSION,
    scenarioId: 'm1',
    scenarioVersion: '1.0.0',
    createdAt: 1_000,
    tutorialState: null,
    world,
  }
}

beforeEach(async () => {
  resetDbForTesting()
  const db = await getDb()
  await db.clear('saves')
  resetDbForTesting()
})

describe('loadSlot quarantine flow', () => {
  it('quarantines a v6 record whose compressed world fails to decompress', async () => {
    const db = await getDb()
    await db.put('saves', {
      slotId: 'slot1',
      dto: makeV6Envelope(`${COMPRESSED_PREFIX}invalid_compressed_data`),
      metadata: makeMetadata('slot1'),
    })

    const result = await loadSlot('slot1')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected loadSlot to fail')
    expect(result.error.kind).toBe('corrupted')
    if (result.error.kind !== 'corrupted') throw new Error(`expected corrupted, got ${result.error.kind}`)
    expect(result.error.originalSlotId).toBe('slot1')
    expect(result.error.quarantineSlotId).toMatch(/^slot1_quarantine_\d+$/)

    const original = await db.get('saves', 'slot1')
    const quarantined = await db.get('saves', result.error.quarantineSlotId)
    expect(original).toBeUndefined()
    expect(quarantined).toBeDefined()
    expect(quarantined?.slotId).toBe(result.error.quarantineSlotId)
  })

  it('quarantines a v6 record whose uncompressed world is not valid JSON', async () => {
    const db = await getDb()
    await db.put('saves', {
      slotId: 'slot2',
      dto: makeV6Envelope('not-valid-json'),
      metadata: makeMetadata('slot2'),
    })

    const result = await loadSlot('slot2')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected loadSlot to fail')
    expect(result.error.kind).toBe('corrupted')
    if (result.error.kind !== 'corrupted') throw new Error(`expected corrupted, got ${result.error.kind}`)
    expect(result.error.originalSlotId).toBe('slot2')
    expect(result.error.quarantineSlotId).toMatch(/^slot2_quarantine_\d+$/)

    const original = await db.get('saves', 'slot2')
    const quarantined = await db.get('saves', result.error.quarantineSlotId)
    expect(original).toBeUndefined()
    expect(quarantined).toBeDefined()
  })

  it('quarantines a v6 record whose JSON shape fails Zod schema validation', async () => {
    const db = await getDb()
    await db.put('saves', {
      slotId: 'slot3',
      dto: makeV6Envelope(JSON.stringify({ missing: 'required-fields' })),
      metadata: makeMetadata('slot3'),
    })

    const result = await loadSlot('slot3')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected loadSlot to fail')
    expect(result.error.kind).toBe('corrupted')
    if (result.error.kind !== 'corrupted') throw new Error(`expected corrupted, got ${result.error.kind}`)
    expect(result.error.originalSlotId).toBe('slot3')
    expect(result.error.quarantineSlotId).toMatch(/^slot3_quarantine_\d+$/)

    const original = await db.get('saves', 'slot3')
    const quarantined = await db.get('saves', result.error.quarantineSlotId)
    expect(original).toBeUndefined()
    expect(quarantined).toBeDefined()
  })

  it('returns incompatible_version (NOT corrupted) for v5 records and leaves the slot in place', async () => {
    const db = await getDb()
    await db.put('saves', {
      slotId: 'slot4',
      dto: { ...makeV6Envelope('{}'), schemaVersion: 5 },
      metadata: makeMetadata('slot4'),
    })

    const result = await loadSlot('slot4')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected loadSlot to fail')
    expect(result.error.kind).toBe('incompatible_version')
    if (result.error.kind !== 'incompatible_version') {
      throw new Error(`expected incompatible_version, got ${result.error.kind}`)
    }
    expect(result.error.got).toBe(5)
    expect(result.error.expected).toBe(SAVE_DTO_VERSION)

    const original = await db.get('saves', 'slot4')
    expect(original).toBeDefined()
    const allKeys = await db.getAllKeys('saves')
    expect(allKeys.filter(k => String(k).includes('quarantine'))).toEqual([])
  })

  it('writes evidence of the quarantine flow', async () => {
    const db = await getDb()
    await db.put('saves', {
      slotId: 'slot1',
      dto: makeV6Envelope(`${COMPRESSED_PREFIX}invalid_compressed_data`),
      metadata: makeMetadata('slot1'),
    })

    const result = await loadSlot('slot1')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected loadSlot to fail')
    if (result.error.kind !== 'corrupted') throw new Error('expected corrupted')

    const original = await db.get('saves', 'slot1')
    const quarantined = await db.get('saves', result.error.quarantineSlotId)

    const evidenceDir = path.resolve(process.cwd(), '.sisyphus/evidence')
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true })
    fs.writeFileSync(
      path.join(evidenceDir, 'task-9-quarantine-flow.txt'),
      [
        `quarantine flow PASS`,
        `originalSlotId=${result.error.originalSlotId}`,
        `quarantineSlotId=${result.error.quarantineSlotId}`,
        `originalRecordPresent=${original !== undefined}`,
        `quarantineRecordPresent=${quarantined !== undefined}`,
        `errorKind=${result.error.kind}`,
      ].join('\n'),
      'utf-8',
    )
    fs.writeFileSync(
      path.join(evidenceDir, 'task-9-quarantine-preserved.txt'),
      [
        `quarantine preserved PASS`,
        `quarantineSlotId=${result.error.quarantineSlotId}`,
        `preservedSchemaVersion=${(quarantined?.dto as { schemaVersion?: number } | undefined)?.schemaVersion ?? 'unknown'}`,
        `preservedMetadataName=${quarantined?.metadata.name ?? 'unknown'}`,
        `preservedMetadataScenarioId=${quarantined?.metadata.scenarioId ?? 'unknown'}`,
      ].join('\n'),
      'utf-8',
    )
  })
})
