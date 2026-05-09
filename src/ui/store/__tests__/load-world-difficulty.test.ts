import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../game-store'

vi.mock('@/engine/world', () => ({
  loadM1Data: () => ({}),
  loadM9Data: async () => ({}),
  createWorldFromM1Data: (_data: unknown, _seed: number, _playerRealmId: string, difficulty?: string) => ({
    difficulty: difficulty ?? 'hero',
  }),
  createWorldFromM9Data: (_data: unknown, _seed: number, _playerRealmId: string, difficulty?: string) => ({
    difficulty: difficulty ?? 'hero',
  }),
}))

beforeEach(() => {
  useGameStore.getState().reset()
})

describe('loadWorld difficulty', () => {
  it('defaults difficulty to hero when omitted', async () => {
    await useGameStore.getState().loadWorld('m1')

    expect(useGameStore.getState().world.difficulty).toBe('hero')
  })

  it('uses explicit difficulty when provided', async () => {
    await useGameStore.getState().loadWorld('m1', 'sage')

    expect(useGameStore.getState().world.difficulty).toBe('sage')
  })
})
