import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { worldToSaveDTO } from '~/engine/world/save-dto'
import { useGameStore } from '@/ui/store'
import { getDb, resetDbForTesting, type SaveMetadata } from '../db'
import { deleteSlot, loadSlot, resetQuotaCacheForTesting, saveSlot } from '../slot-crud'

function makeDtoAndMetadata(slotId: SaveMetadata['slotId']): { dto: ReturnType<typeof worldToSaveDTO>; metadata: SaveMetadata } {
  const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
  const dto = worldToSaveDTO(world, 'm1', { seenHints: {}, hintsEnabled: true })
  const playerRealmName = world.realms.get(world.playerRealmId)?.displayName ?? ''

  return {
    dto,
    metadata: {
      slotId,
      name: 'Test Save',
      createdAt: dto.createdAt,
      tick: dto.world.tick,
      scenarioId: dto.scenarioId,
      playerRealmName,
    },
  }
}

function stubNavigatorEstimate(usage: number, quota: number): void {
  vi.stubGlobal('navigator', {
    storage: {
      estimate: vi.fn().mockResolvedValue({ usage, quota }),
    },
  } as never)
}

beforeEach(async () => {
  vi.unstubAllGlobals()
  resetQuotaCacheForTesting()
  useGameStore.getState().reset()
  useGameStore.setState({ toastQueue: [], modalQueue: [] })
  resetDbForTesting()
  const db = await getDb()
  await db.clear('saves')
  resetDbForTesting()
})

describe('saveSlot quota detection', () => {
  it('warns at 80% and still saves', async () => {
    stubNavigatorEstimate(80, 100)
    const { dto, metadata } = makeDtoAndMetadata('slot1')

    const result = await saveSlot('slot1', dto, metadata)

    expect(result).toEqual({ ok: true, value: undefined })
    expect(useGameStore.getState().toastQueue).toHaveLength(1)
    expect(useGameStore.getState().toastQueue[0]?.text).toBe('存储空间不足，请删除旧存档')

    const loaded = await loadSlot('slot1')
    expect(loaded.ok).toBe(true)
  })

  it('blocks at 95% and opens the quota modal', async () => {
    stubNavigatorEstimate(95, 100)
    const { dto, metadata } = makeDtoAndMetadata('slot1')

    const result = await saveSlot('slot1', dto, metadata)

    expect(result).toEqual({
      ok: false,
      error: { kind: 'quota_exceeded', message: '存储空间已满，无法保存' },
    })
    expect(useGameStore.getState().modalQueue).toHaveLength(1)
    expect(useGameStore.getState().toastQueue).toHaveLength(0)

    const db = await getDb()
    expect(await db.get('saves', 'slot1')).toBeUndefined()
  })

  it('succeeds when navigator.storage is unavailable', async () => {
    vi.stubGlobal('navigator', {} as never)
    const { dto, metadata } = makeDtoAndMetadata('slot1')

    const result = await saveSlot('slot1', dto, metadata)

    expect(result).toEqual({ ok: true, value: undefined })
    expect(useGameStore.getState().toastQueue).toHaveLength(0)
  })

  it('returns quota_exceeded when IDB put throws QuotaExceededError', async () => {
    const { dto, metadata } = makeDtoAndMetadata('slot1')
    vi.stubGlobal('navigator', {} as never)
    const db = await getDb()
    const putSpy = vi.spyOn(db, 'put').mockRejectedValueOnce(new DOMException('quota full', 'QuotaExceededError'))

    const result = await saveSlot('slot1', dto, metadata)

    expect(result).toEqual({
      ok: false,
      error: { kind: 'quota_exceeded', message: '存储空间已满' },
    })
    expect(putSpy).toHaveBeenCalledTimes(1)
    putSpy.mockRestore()
  })

  it('respects the 80% warning boundary', async () => {
    const cases = [
      { slotId: 'slot1' as const, usage: 79.9, expectedToast: 0 },
      { slotId: 'slot2' as const, usage: 80, expectedToast: 1 },
      { slotId: 'slot3' as const, usage: 80.1, expectedToast: 1 },
    ]

    for (const { slotId, usage, expectedToast } of cases) {
      resetQuotaCacheForTesting()
      useGameStore.getState().reset()
      useGameStore.setState({ toastQueue: [], modalQueue: [] })
      stubNavigatorEstimate(usage, 100)

      const { dto, metadata } = makeDtoAndMetadata(slotId)
      const result = await saveSlot(slotId, dto, metadata)

      expect(result.ok).toBe(true)
      expect(useGameStore.getState().toastQueue).toHaveLength(expectedToast)
      await deleteSlot(slotId)
    }
  })
})
