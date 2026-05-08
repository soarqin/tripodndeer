import type { PersonalityArchetype } from '~/shared/types'

// M8.1 STRATEGIC layer weight table
// 4 dimensions for yearly strategic planning decisions
export interface StrategicWeights {
  expansionAggression: number
  allyPriority: number
  enemyPersistence: number
  reformInclination: number
}

export const M8_1_STRATEGIC_WEIGHTS: Readonly<Record<PersonalityArchetype, StrategicWeights>> = {
  conqueror: { expansionAggression: 3.0, allyPriority: 0.5, enemyPersistence: 2.5, reformInclination: 0.5 },
  steward: { expansionAggression: 0.5, allyPriority: 2.0, enemyPersistence: 0.5, reformInclination: 2.5 },
  schemer: { expansionAggression: 2.0, allyPriority: 2.5, enemyPersistence: 2.5, reformInclination: 1.5 },
  learned: { expansionAggression: 0.5, allyPriority: 2.0, enemyPersistence: 1.0, reformInclination: 3.0 },
  tyrant: { expansionAggression: 2.5, allyPriority: 0.3, enemyPersistence: 2.0, reformInclination: 0.3 },
  incompetent: { expansionAggression: 1.0, allyPriority: 1.0, enemyPersistence: 1.0, reformInclination: 1.0 },
  benevolent: { expansionAggression: 0.3, allyPriority: 3.0, enemyPersistence: 0.5, reformInclination: 2.0 },
  builder: { expansionAggression: 0.8, allyPriority: 1.5, enemyPersistence: 0.8, reformInclination: 3.0 },
} as const
