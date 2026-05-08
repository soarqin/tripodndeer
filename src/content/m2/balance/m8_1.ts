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

// M8.1 OPERATIONAL layer weight table
// 5 dimensions for monthly directive generation decisions
export interface OperationalWeights {
  warDeclarationBias: number
  dispatchPriorityBias: number
  diplomacyInitiative: number
  espionageInitiative: number
  directiveExpiryBias: number
}

export const M8_1_OPERATIONAL_WEIGHTS: Readonly<Record<PersonalityArchetype, OperationalWeights>> = {
  conqueror: { warDeclarationBias: 3.0, dispatchPriorityBias: 3.0, diplomacyInitiative: 0.5, espionageInitiative: 0.5, directiveExpiryBias: 2.0 },
  steward: { warDeclarationBias: 0.5, dispatchPriorityBias: 0.5, diplomacyInitiative: 3.0, espionageInitiative: 0.5, directiveExpiryBias: 4.0 },
  schemer: { warDeclarationBias: 1.5, dispatchPriorityBias: 1.5, diplomacyInitiative: 2.5, espionageInitiative: 3.0, directiveExpiryBias: 3.0 },
  learned: { warDeclarationBias: 0.5, dispatchPriorityBias: 0.5, diplomacyInitiative: 3.0, espionageInitiative: 1.0, directiveExpiryBias: 5.0 },
  tyrant: { warDeclarationBias: 2.5, dispatchPriorityBias: 2.5, diplomacyInitiative: 0.3, espionageInitiative: 1.0, directiveExpiryBias: 1.5 },
  incompetent: { warDeclarationBias: 1.0, dispatchPriorityBias: 1.0, diplomacyInitiative: 1.0, espionageInitiative: 1.0, directiveExpiryBias: 2.5 },
  benevolent: { warDeclarationBias: 0.3, dispatchPriorityBias: 0.5, diplomacyInitiative: 2.5, espionageInitiative: 0.5, directiveExpiryBias: 5.0 },
  builder: { warDeclarationBias: 0.8, dispatchPriorityBias: 1.0, diplomacyInitiative: 2.0, espionageInitiative: 0.8, directiveExpiryBias: 6.0 },
} as const
