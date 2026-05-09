import { beforeEach, describe, expect, it, vi } from 'vitest'

const runAutoBattleMock = vi.hoisted(() => vi.fn())

vi.mock('~/engine/automation/auto-battle', () => ({
  runAutoBattle: runAutoBattleMock,
}))

import { runAutoBattleCli } from '../auto-battle'

beforeEach(() => {
  runAutoBattleMock.mockReset()
})

describe('auto-battle CLI', () => {
  it('calls runAutoBattle with the default config', async () => {
    runAutoBattleMock.mockReturnValue({
      winnerRealmId: null,
      endTick: 7,
      finalRealmStats: new Map([
        ['realm_qin', { sites: 12, active: true }],
      ]),
    })

    const output: string[] = []

    await runAutoBattleCli([], {
      write: (value) => output.push(value),
      error: () => undefined,
    })

    expect(runAutoBattleMock).toHaveBeenCalledWith({
      scenarioId: 'm9',
      difficulty: 'hero',
      seed: 42,
      maxTicks: 500,
      stopCondition: 'unification',
    })
    expect(output.join('')).toContain('Scenario: m9')
  })

  it('emits valid JSON when requested', async () => {
    runAutoBattleMock.mockReturnValue({
      winnerRealmId: 'realm_qin',
      endTick: 12,
      finalRealmStats: new Map([
        ['realm_qin', { sites: 8, active: true }],
      ]),
    })

    const output: string[] = []

    await runAutoBattleCli(['--json'], {
      write: (value) => output.push(value),
      error: () => undefined,
    })

    expect(() => JSON.parse(output.join(''))).not.toThrow()
    expect(JSON.parse(output.join(''))).toEqual({
      winnerRealmId: 'realm_qin',
      endTick: 12,
      finalRealmStats: {
        realm_qin: { sites: 8, active: true },
      },
    })
  })
})
