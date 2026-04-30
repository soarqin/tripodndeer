import { describe, it, expect } from 'vitest'
import {
  UNIT_BASE_POWER, UNIT_COUNTER_MATRIX, TERRAIN_TRAVEL_COST,
  TACTIC_COSTS, TACTIC_EFFECTS, GENERAL_LOSER_DEATH_RATE, GENERAL_WINNER_DEATH_RATE,
  type UnitType, type TerrainType, type TacticId,
} from '../balance'

describe('balance.ts sanity checks', () => {
  it('all 4 unit types have base power > 0', () => {
    const units: UnitType[] = ['infantry', 'chariot', 'cavalry', 'crossbow']
    for (const unit of units) {
      expect(UNIT_BASE_POWER[unit]).toBeGreaterThan(0)
    }
  })

  it('all 7 terrain types exist in travel cost', () => {
    const terrains: TerrainType[] = ['plains', 'hills', 'mountains', 'forest', 'swamp', 'grassland', 'desert']
    for (const terrain of terrains) {
      expect(TERRAIN_TRAVEL_COST[terrain]).toBeGreaterThan(0)
    }
  })

  it('counter matrix non-symmetric for crossbow vs chariot', () => {
    expect(UNIT_COUNTER_MATRIX.crossbow.chariot).toBeGreaterThan(1.0)
    expect(UNIT_COUNTER_MATRIX.chariot.crossbow).toBeLessThan(1.0)
  })

  it('all 7 tactics have cost >= 0', () => {
    const tactics: TacticId[] = ['qi-zheng', 'sheng-dong', 'you-di', 'bei-shui', 'wei-shi', 'yi-zhan', 'pi-di']
    for (const tactic of tactics) {
      expect(TACTIC_COSTS[tactic]).toBeGreaterThanOrEqual(0)
    }
  })

  it('death rates are between 0 and 1', () => {
    expect(GENERAL_LOSER_DEATH_RATE).toBeGreaterThan(0)
    expect(GENERAL_LOSER_DEATH_RATE).toBeLessThanOrEqual(1)
    expect(GENERAL_WINNER_DEATH_RATE).toBeGreaterThan(0)
    expect(GENERAL_WINNER_DEATH_RATE).toBeLessThan(GENERAL_LOSER_DEATH_RATE)
  })

  it('tactic effects object exists for all tactics', () => {
    const tactics: TacticId[] = ['qi-zheng', 'sheng-dong', 'you-di', 'bei-shui', 'wei-shi', 'yi-zhan', 'pi-di']
    for (const tactic of tactics) {
      expect(TACTIC_EFFECTS[tactic]).toBeDefined()
    }
  })
})
