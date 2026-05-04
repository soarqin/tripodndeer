import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ARCHETYPE_MAPPING,
  runBehaviorHarness,
  type BehaviorCounters,
  type BehaviorReport,
} from './m8-behavior-harness'
import type { PersonalityArchetype } from '~/shared/types'

const ALL_ARCHETYPES: readonly PersonalityArchetype[] = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
]

const REQUIRED_KEYS: readonly (keyof BehaviorCounters)[] = [
  'warDeclarations',
  'peaceAcceptances',
  'peaceRejections',
  'allianceAcceptances',
  'allianceRejections',
  'coalitionJoins',
  'coalitionLeaves',
  'recruitmentBySpecialty',
  'edictsIssuedByKind',
  'reformsAttempted',
  'espionageActionsByKind',
  'tacticalActionsByKind',
  'taxRateFinal',
  'taxRateInitial',
  'treasuryFinal',
  'traitsFinal',
  'tacticalActionTotal',
  'espionageActionTotal',
  'taxRateDelta',
]

describe('m8 behavior harness skeleton', () => {
  it('returns BehaviorReport with all 8 archetype keys', () => {
    const report = runBehaviorHarness({
      seeds: [42],
      ticks: 10,
      archetypeMapping: DEFAULT_ARCHETYPE_MAPPING,
    })

    for (const archetype of ALL_ARCHETYPES) {
      expect(report[archetype]).toBeDefined()
    }
    expect(Object.keys(report).sort()).toEqual([...ALL_ARCHETYPES].sort())
  }, 60000)

  it('each archetype has all required BehaviorCounters fields', () => {
    const report = runBehaviorHarness({
      seeds: [42],
      ticks: 10,
      archetypeMapping: DEFAULT_ARCHETYPE_MAPPING,
    })

    for (const archetype of ALL_ARCHETYPES) {
      const counters = report[archetype]
      for (const key of REQUIRED_KEYS) {
        expect(counters[key], `${archetype}.${key}`).toBeDefined()
      }
    }
  }, 60000)

  it('same seed produces byte-equal results (determinism)', () => {
    const opts = {
      seeds: [42],
      ticks: 10,
      archetypeMapping: DEFAULT_ARCHETYPE_MAPPING,
    }

    const a = runBehaviorHarness(opts)
    const b = runBehaviorHarness(opts)

    expect(serializeReport(a)).toEqual(serializeReport(b))
  }, 120000)
})

function serializeReport(report: BehaviorReport): string {
  const sortedKeys = Object.keys(report).sort()
  const normalized: Record<string, unknown> = {}
  for (const key of sortedKeys) {
    const counters = report[key as PersonalityArchetype]
    normalized[key] = {
      ...counters,
      recruitmentBySpecialty: sortedRecord(counters.recruitmentBySpecialty),
      edictsIssuedByKind: sortedRecord(counters.edictsIssuedByKind),
      espionageActionsByKind: sortedRecord(counters.espionageActionsByKind),
      tacticalActionsByKind: sortedRecord(counters.tacticalActionsByKind),
      traitsFinal: [...counters.traitsFinal].sort(),
    }
  }
  return JSON.stringify(normalized)
}

function sortedRecord(
  record: Readonly<Record<string, number>>
): Record<string, number> {
  const sorted: Record<string, number> = {}
  for (const key of Object.keys(record).sort()) {
    sorted[key] = record[key]!
  }
  return sorted
}
