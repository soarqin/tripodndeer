import { describe, expect, it } from 'vitest'

import { runAutoBattle, type AutoBattleConfig } from '../auto-battle'

function serialiseResult(result: ReturnType<typeof runAutoBattle>) {
  return {
    winnerRealmId: result.winnerRealmId,
    endTick: result.endTick,
    finalRealmStats: [...result.finalRealmStats].sort(([a], [b]) => a.localeCompare(b)),
  }
}

describe('runAutoBattle', () => {
  const config: AutoBattleConfig = {
    scenarioId: 'm1',
    difficulty: 'hero',
    seed: 42,
    maxTicks: 3,
    stopCondition: 'tickLimit',
  }

  it('returns the same result for the same seed and config', () => {
    const first = runAutoBattle(config)
    const second = runAutoBattle(config)

    expect(serialiseResult(second)).toEqual(serialiseResult(first))
  })

  it('returns a valid result object', () => {
    const result = runAutoBattle(config)

    expect(result.endTick).toBe(3)
    expect(result.winnerRealmId === null || typeof result.winnerRealmId === 'string').toBe(true)
    expect(result.finalRealmStats.size).toBeGreaterThan(0)

    for (const stats of result.finalRealmStats.values()) {
      expect(Number.isInteger(stats.sites)).toBe(true)
      expect(stats.sites).toBeGreaterThanOrEqual(0)
      expect(typeof stats.active).toBe('boolean')
    }
  })
})
