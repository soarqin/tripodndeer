import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BattleResolution } from '~/engine/systems/combat-v2'

const advanceClockMock = vi.hoisted(() => vi.fn())

vi.mock('@/engine/clock', async () => {
  const actual = await vi.importActual<typeof import('@/engine/clock')>('@/engine/clock')
  return {
    ...actual,
    advanceClock: advanceClockMock,
  }
})

import { useGameStore } from '../game-store'

const fakeResolution: BattleResolution = {
  winner: 'attacker',
  attackerLoss: 12,
  defenderLoss: 34,
  deadGenerals: ['general_fake'],
  steps: [{ name: 'base-power', attackerMultiplier: 1, defenderMultiplier: 1 }],
}

beforeEach(() => {
  useGameStore.getState().reset()
  advanceClockMock.mockReset()
})

describe('lastBattleResolution store state', () => {
  it('defaults to null', () => {
    expect(useGameStore.getState().lastBattleResolution).toBeNull()
  })

  it('setLastBattleResolution stores the latest resolution', () => {
    useGameStore.getState().setLastBattleResolution(fakeResolution)

    expect(useGameStore.getState().lastBattleResolution).toEqual(fakeResolution)
  })

  it('clearLastBattleResolution resets the stored resolution', () => {
    useGameStore.getState().setLastBattleResolution(fakeResolution)
    useGameStore.getState().clearLastBattleResolution()

    expect(useGameStore.getState().lastBattleResolution).toBeNull()
  })

  it('captures player battle resolutions from tick events and ignores ai-only battles', () => {
    advanceClockMock.mockImplementation((_clockState, _deltaMs, world) => ({
      clockState: { speed: '1x', realTimeAccum: 0 },
      nextWorld: { ...world, tick: world.tick + 1 },
      events: [
        {
          type: 'battleResolved',
          payload: {
            battleResolution: fakeResolution,
            attackerRealmId: 'realm_qin',
            defenderRealmId: 'realm_han',
          },
        },
      ],
    }))

    useGameStore.getState().setSpeed('1x')
    useGameStore.getState().tick(6000)

    expect(useGameStore.getState().lastBattleResolution).toEqual(fakeResolution)

    advanceClockMock.mockImplementation((_clockState, _deltaMs, world) => ({
      clockState: { speed: '1x', realTimeAccum: 0 },
      nextWorld: { ...world, tick: world.tick + 1 },
      events: [
        {
          type: 'battleResolved',
          payload: {
            battleResolution: {
              winner: 'defender',
              attackerLoss: 99,
              defenderLoss: 1,
              deadGenerals: [],
              steps: [],
            } satisfies BattleResolution,
            attackerRealmId: 'realm_wei',
            defenderRealmId: 'realm_han',
          },
        },
      ],
    }))

    useGameStore.getState().tick(6000)

    expect(useGameStore.getState().lastBattleResolution).toEqual(fakeResolution)
  })
})
