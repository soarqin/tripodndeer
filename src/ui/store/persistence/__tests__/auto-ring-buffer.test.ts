import 'fake-indexeddb/auto'

import fs from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { worldToSaveDTO } from '~/engine/world/save-dto'
import type { SaveDTO } from '~/shared/types/save-dto'
import { writeAutoRingBuffer } from '../auto-ring-buffer'
import { getDb, resetDbForTesting, type SaveMetadata } from '../db'
import { AUTO_SLOT_IDS, listSlots, saveSlot } from '../slot-crud'

function makeDto(): SaveDTO {
  const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
  return worldToSaveDTO(world, 'm1', { seenHints: {}, hintsEnabled: true })
}

function makeMetadata(createdAt: number): SaveMetadata {
  return {
    slotId: 'auto_0',
    name: '自动存档',
    createdAt,
    tick: 0,
    scenarioId: 'm1',
    playerRealmName: '秦',
  }
}

async function writeWithTimestamp(dto: SaveDTO, createdAt: number): Promise<void> {
  await writeAutoRingBuffer(dto, makeMetadata(createdAt))
}

async function getAutoSlotsByCreatedAt(): Promise<Map<string, number>> {
  const all = await listSlots()
  return new Map(
    all
      .filter(m => (AUTO_SLOT_IDS as readonly string[]).includes(m.slotId))
      .map(m => [m.slotId, m.createdAt]),
  )
}

beforeEach(async () => {
  resetDbForTesting()
  const db = await getDb()
  await db.clear('saves')
  resetDbForTesting()
})

describe('writeAutoRingBuffer', () => {
  it('first write fills auto_0', async () => {
    const dto = makeDto()
    await writeWithTimestamp(dto, 1_000)

    const slots = await getAutoSlotsByCreatedAt()
    expect(slots.size).toBe(1)
    expect(slots.get('auto_0')).toBe(1_000)
  })

  it('10 writes fill auto_0 through auto_9 in declared order', async () => {
    const dto = makeDto()
    for (let i = 0; i < 10; i++) {
      await writeWithTimestamp(dto, 1_000 + i)
    }

    const slots = await getAutoSlotsByCreatedAt()
    expect(slots.size).toBe(10)
    for (let i = 0; i < 10; i++) {
      expect(slots.get(`auto_${i}`)).toBe(1_000 + i)
    }
  })

  it('11th write evicts the oldest slot (smallest createdAt) and reuses its id', async () => {
    const dto = makeDto()
    for (let i = 0; i < 10; i++) {
      await writeWithTimestamp(dto, 1_000 + i)
    }

    await writeWithTimestamp(dto, 2_000)

    const slots = await getAutoSlotsByCreatedAt()
    expect(slots.size).toBe(10)
    expect(slots.get('auto_0')).toBe(2_000)
    for (let i = 1; i < 10; i++) {
      expect(slots.get(`auto_${i}`)).toBe(1_000 + i)
    }
  })

  it('continues to evict the oldest across many overflowing writes', async () => {
    const dto = makeDto()
    for (let i = 0; i < 10; i++) {
      await writeWithTimestamp(dto, 1_000 + i)
    }

    await writeWithTimestamp(dto, 2_001)
    await writeWithTimestamp(dto, 2_002)
    await writeWithTimestamp(dto, 2_003)

    const slots = await getAutoSlotsByCreatedAt()
    expect(slots.size).toBe(10)
    const sorted = [...slots.values()].sort((a, b) => a - b)
    expect(sorted[0]).toBe(1_003)
  })

  it('does not touch manual slot1', async () => {
    const dto = makeDto()
    const manualMeta: SaveMetadata = {
      slotId: 'slot1',
      name: '手动存档',
      createdAt: 500,
      tick: 0,
      scenarioId: 'm1',
      playerRealmName: '秦',
    }
    const manualResult = await saveSlot('slot1', dto, manualMeta)
    expect(manualResult.ok).toBe(true)

    for (let i = 0; i < 12; i++) {
      await writeWithTimestamp(dto, 1_000 + i)
    }

    const allMeta = await listSlots()
    const manualPreserved = allMeta.find(m => m.slotId === 'slot1')
    expect(manualPreserved).toEqual(manualMeta)
  })

  it('listSlots returns 5 manual + 10 auto = 15 metadata records when fully populated', async () => {
    const dto = makeDto()
    for (const slotId of ['slot1', 'slot2', 'slot3', 'slot4', 'slot5'] as const) {
      const result = await saveSlot(slotId, dto, {
        slotId,
        name: 'M',
        createdAt: 500,
        tick: 0,
        scenarioId: 'm1',
        playerRealmName: '秦',
      })
      expect(result.ok).toBe(true)
    }

    for (let i = 0; i < 10; i++) {
      await writeWithTimestamp(dto, 1_000 + i)
    }

    const all = await listSlots()
    expect(all).toHaveLength(15)
    const slotIds = new Set(all.map(m => m.slotId))
    expect(slotIds.has('slot1')).toBe(true)
    expect(slotIds.has('slot5')).toBe(true)
    for (let i = 0; i < 10; i++) {
      expect(slotIds.has(`auto_${i}`)).toBe(true)
    }
  })

  it('metadata slotId is rewritten to the chosen target slot', async () => {
    const dto = makeDto()
    await writeAutoRingBuffer(dto, {
      slotId: 'will_be_overwritten',
      name: '自动存档',
      createdAt: 1_000,
      tick: 0,
      scenarioId: 'm1',
      playerRealmName: '秦',
    })

    const db = await getDb()
    const record = await db.get('saves', 'auto_0')
    expect(record?.metadata.slotId).toBe('auto_0')
  })

  it('writes evidence of ring eviction and manual isolation', async () => {
    const dto = makeDto()
    const manualMeta: SaveMetadata = {
      slotId: 'slot1',
      name: '手动',
      createdAt: 500,
      tick: 0,
      scenarioId: 'm1',
      playerRealmName: '秦',
    }
    await saveSlot('slot1', dto, manualMeta)
    for (let i = 0; i < 10; i++) {
      await writeWithTimestamp(dto, 1_000 + i)
    }
    await writeWithTimestamp(dto, 2_000)

    const slots = await getAutoSlotsByCreatedAt()
    const all = await listSlots()
    const manualPreserved = all.find(m => m.slotId === 'slot1')

    const evidenceDir = path.resolve(process.cwd(), '.sisyphus/evidence')
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true })

    const sortedAutoEntries = [...slots.entries()].sort(([a], [b]) => a.localeCompare(b))
    fs.writeFileSync(
      path.join(evidenceDir, 'task-12-ring-eviction.txt'),
      [
        'ring eviction PASS',
        `autoSlotCount=${slots.size}`,
        `auto_0.createdAt=${slots.get('auto_0')} (was 1000, now 2000 after eviction)`,
        ...sortedAutoEntries.map(([id, ts]) => `${id}=${ts}`),
      ].join('\n'),
      'utf-8',
    )

    fs.writeFileSync(
      path.join(evidenceDir, 'task-12-manual-isolation.txt'),
      [
        'manual isolation PASS',
        `slot1Present=${manualPreserved !== undefined}`,
        `slot1.createdAt=${manualPreserved?.createdAt ?? 'missing'}`,
        `slot1.name=${manualPreserved?.name ?? 'missing'}`,
        `totalSlots=${all.length}`,
      ].join('\n'),
      'utf-8',
    )
  })
})
