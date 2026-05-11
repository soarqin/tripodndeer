import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '~/ui/store/game-store'
import { SAVE_DTO_VERSION } from '~/shared/types/save-dto'
import { saveDtoToWorld, worldToSaveDTO } from '~/engine/world/save-dto'

beforeEach(() => {
  useGameStore.getState().reset()
})

describe('codex save/load roundtrip', () => {
  it('drops codex UI state during save/load roundtrip', async () => {
    await useGameStore.getState().loadWorld('m1')
    useGameStore.getState().openCodex('mechanic-legitimacy')

    const saved = worldToSaveDTO(useGameStore.getState().world)
    expect(SAVE_DTO_VERSION).toBe(5)
    expect(saved).not.toHaveProperty('activePanel')
    expect(saved).not.toHaveProperty('selectedCodexEntryId')
    expect(saved.world).not.toHaveProperty('activePanel')
    expect(saved.world).not.toHaveProperty('selectedCodexEntryId')
    expect(saved.world).not.toHaveProperty('codexPreviousClockSpeed')

    const loaded = saveDtoToWorld(saved)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return

    useGameStore.getState().replaceWorldFromSave(loaded.value)

    expect(useGameStore.getState().activePanel).toBeNull()
    expect(useGameStore.getState().selectedCodexEntryId).toBeNull()
  })
})
