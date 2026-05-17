import 'fake-indexeddb/auto'

import { Blob as NodeBlob, File as NodeFile } from 'node:buffer'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { worldToSaveDTO } from '~/engine/world/save-dto'
import { SAVE_DTO_VERSION } from '~/shared/types/save-dto'
import { getDb, resetDbForTesting, type SaveMetadata } from '@/ui/store/persistence/db'
import { saveSlot, loadSlot, type ManualSlotId } from '@/ui/store/persistence/slot-crud'
import { exportSlot, importSave } from '../export-import'

beforeAll(() => {
  globalThis.Blob = NodeBlob as unknown as typeof Blob
  globalThis.File = NodeFile as unknown as typeof File
})

function makeValidDto() {
  const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
  return worldToSaveDTO(world, 'm1', { seenHints: {}, hintsEnabled: true })
}

function makeMetadata(slotId: ManualSlotId, name: string): SaveMetadata {
  return {
    slotId,
    name,
    createdAt: Date.now(),
    tick: 0,
    scenarioId: 'm1',
    playerRealmName: '秦',
  }
}

beforeEach(async () => {
  resetDbForTesting()
  const db = await getDb()
  await db.clear('saves')
  resetDbForTesting()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('exportSlot', () => {
  it('downloads JSON with correct filename and content', async () => {
    const dto = makeValidDto()
    const metadata = makeMetadata('slot1', '秦昭襄王 起兵')
    await saveSlot('slot1', dto, metadata)

    const capturedBlobs: Blob[] = []
    const createObjectURL = vi.fn((blob: Blob) => {
      capturedBlobs.push(blob)
      return 'blob:mock-url'
    })
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const clickSpy = vi.fn()
    const realCreate = document.createElement.bind(document)
    let anchor: HTMLAnchorElement | null = null
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLAnchorElement
      if (tag === 'a') {
        anchor = el
        el.click = clickSpy
      }
      return el
    })

    const result = await exportSlot('slot1')

    expect(result.ok).toBe(true)
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(anchor).not.toBeNull()
    expect(anchor!.href).toContain('blob:mock-url')
    expect(anchor!.download).toMatch(/^秦昭襄王_起兵_\d+\.json$/)

    expect(capturedBlobs).toHaveLength(1)
    const blob = capturedBlobs[0]
    if (!blob) throw new Error('blob not captured')
    expect(blob.type).toBe('application/json')
    const text = await blob.text()
    const parsed = JSON.parse(text)
    expect(parsed.schemaVersion).toBe(SAVE_DTO_VERSION)
    expect(parsed.scenarioId).toBe('m1')
    expect(parsed.scenarioVersion).toBeTypeOf('string')
    expect(typeof parsed.world).toBe('object')
    expect(parsed.world).not.toBeNull()
  })

  it('returns error when slot is empty', async () => {
    const result = await exportSlot('slot1')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('missing_data')
    }
  })

  it('sanitizes filename when name contains punctuation', async () => {
    const dto = makeValidDto()
    await saveSlot('slot2', dto, makeMetadata('slot2', 'hello/world:*?'))

    const createObjectURL = vi.fn(() => 'blob:mock-url')
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() })
    const clickSpy = vi.fn()
    let anchor: HTMLAnchorElement | null = null
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLAnchorElement
      if (tag === 'a') {
        anchor = el
        el.click = clickSpy
      }
      return el
    })

    await exportSlot('slot2')
    expect(anchor!.download).toMatch(/^hello_world.*_\d+\.json$/)
    expect(anchor!.download.startsWith('hello_world')).toBe(true)
  })
})

describe('importSave', () => {
  it('imports a valid v6 JSON and writes to target slot', async () => {
    const dto = makeValidDto()
    const json = JSON.stringify(dto)
    const file = new File([json], 'save.json', { type: 'application/json' })

    const result = await importSave(file, 'slot3')

    expect(result.ok).toBe(true)
    const loaded = await loadSlot('slot3')
    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.value.dto.schemaVersion).toBe(SAVE_DTO_VERSION)
      expect(loaded.value.dto.scenarioId).toBe('m1')
      expect(loaded.value.metadata.name).toMatch(/^导入存档 /)
      expect(loaded.value.metadata.playerRealmName).toBe('秦')
    }
  })

  it('rejects invalid JSON with parse_error "invalid JSON"', async () => {
    const file = new File(['not json at all {{{'], 'broken.json', { type: 'application/json' })

    const result = await importSave(file, 'slot1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('parse_error')
      expect(result.error.message).toBe('invalid JSON')
    }
  })

  it('rejects v5 JSON with incompatible_version', async () => {
    const dto = makeValidDto()
    const v5Like = { ...dto, schemaVersion: 5 }
    const file = new File([JSON.stringify(v5Like)], 'v5.json', { type: 'application/json' })

    const result = await importSave(file, 'slot1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('incompatible_version')
      if (result.error.kind === 'incompatible_version') {
        expect(result.error.got).toBe(5)
        expect(result.error.expected).toBe(SAVE_DTO_VERSION)
      }
    }
  })

  it('rejects JSON missing scenarioVersion with parse_error "missing scenarioVersion"', async () => {
    const dto = makeValidDto()
    const partial: Record<string, unknown> = { ...dto }
    delete partial.scenarioVersion
    const file = new File([JSON.stringify(partial)], 'missing.json', { type: 'application/json' })

    const result = await importSave(file, 'slot1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('parse_error')
      expect(result.error.message).toBe('missing scenarioVersion')
    }
  })

  it('rejects non-object JSON with parse_error "invalid structure"', async () => {
    const file = new File(['"just a string"'], 'string.json', { type: 'application/json' })

    const result = await importSave(file, 'slot1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('parse_error')
      expect(result.error.message).toBe('invalid structure')
    }
  })

  it('rejects JSON that passes pre-checks but fails Zod', async () => {
    const malformed = {
      schemaVersion: SAVE_DTO_VERSION,
      scenarioId: 'm1',
      scenarioVersion: '1.0.0',
      createdAt: 0,
      tutorialState: null,
      world: { not: 'valid' },
    }
    const file = new File([JSON.stringify(malformed)], 'bad.json', { type: 'application/json' })

    const result = await importSave(file, 'slot1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('parse_error')
      expect(result.error.message).not.toBe('invalid JSON')
      expect(result.error.message).not.toBe('missing scenarioVersion')
    }
  })

  it('preserves SAVE_DTO_VERSION through roundtrip', async () => {
    const original = makeValidDto()
    const file = new File([JSON.stringify(original)], 'rt.json', { type: 'application/json' })

    const importResult = await importSave(file, 'slot4')
    expect(importResult.ok).toBe(true)

    const loaded = await loadSlot('slot4')
    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.value.dto.schemaVersion).toBe(original.schemaVersion)
      expect(loaded.value.dto.scenarioVersion).toBe(original.scenarioVersion)
      expect(loaded.value.dto.world.tick).toBe(original.world.tick)
      expect(loaded.value.dto.world.playerRealmId).toBe(original.world.playerRealmId)
    }
  })
})
