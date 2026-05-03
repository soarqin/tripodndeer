import { describe, it, expect } from 'vitest'
import { scoreEspionageOption } from '../score-espionage'
import { M7_ESPIONAGE_WEIGHTS } from '~/content/m2/balance'
import {
  ESPIONAGE_ACTION_KINDS,
  type AIEspionageOption,
  type EspionageActionKind,
  type PersonalityArchetype,
} from '~/shared/types'

const ARCHETYPES: readonly PersonalityArchetype[] = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
] as const

const ACTIONS: readonly EspionageActionKind[] = ESPIONAGE_ACTION_KINDS

function makeOption(
  kind: EspionageActionKind,
  overrides: Partial<AIEspionageOption> = {},
): AIEspionageOption {
  return {
    kind,
    spyRealmId: 'realm_qin',
    targetRealmId: 'realm_chu',
    ...overrides,
  }
}

describe('scoreEspionageOption — 8 archetypes × 4 actions matrix', () => {
  for (const archetype of ARCHETYPES) {
    for (const action of ACTIONS) {
      it(`${archetype} × ${action}: returns score × M7_ESPIONAGE_WEIGHTS[${archetype}][${action}]`, () => {
        const option = makeOption(action, { score: 1 })
        const expected = 1 * M7_ESPIONAGE_WEIGHTS[archetype][action]
        expect(scoreEspionageOption(option, archetype)).toBeCloseTo(expected, 10)
      })
    }
  }
})

describe('scoreEspionageOption — guard rails', () => {
  it('schemer + rumor weight ≥ 2.0', () => {
    expect(M7_ESPIONAGE_WEIGHTS.schemer.rumor).toBeGreaterThanOrEqual(2.0)
    const option = makeOption('rumor', { score: 1 })
    expect(scoreEspionageOption(option, 'schemer')).toBeGreaterThanOrEqual(2.0)
  })

  it('benevolent + discord weight ≤ 0.5', () => {
    expect(M7_ESPIONAGE_WEIGHTS.benevolent.discord).toBeLessThanOrEqual(0.5)
    const option = makeOption('discord', { score: 1 })
    expect(scoreEspionageOption(option, 'benevolent')).toBeLessThanOrEqual(0.5)
  })

  it('tyrant + discord weight ≥ 2.0', () => {
    expect(M7_ESPIONAGE_WEIGHTS.tyrant.discord).toBeGreaterThanOrEqual(2.0)
    const option = makeOption('discord', { score: 1 })
    expect(scoreEspionageOption(option, 'tyrant')).toBeGreaterThanOrEqual(2.0)
  })

  it('returns number > 0 for all valid (archetype, action) inputs with default score', () => {
    for (const archetype of ARCHETYPES) {
      for (const action of ACTIONS) {
        const option = makeOption(action)
        const result = scoreEspionageOption(option, archetype)
        expect(result).toBeGreaterThan(0)
        expect(Number.isFinite(result)).toBe(true)
      }
    }
  })

  it('defaults score to 1 when option.score is undefined', () => {
    const option = makeOption('reconnaissance')
    expect(option.score).toBeUndefined()
    const expected = 1 * M7_ESPIONAGE_WEIGHTS.conqueror.reconnaissance
    expect(scoreEspionageOption(option, 'conqueror')).toBeCloseTo(expected, 10)
  })

  it('multiplies provided score by archetype weight', () => {
    const option = makeOption('discord', { score: 4 })
    const expected = 4 * M7_ESPIONAGE_WEIGHTS.schemer.discord
    expect(scoreEspionageOption(option, 'schemer')).toBeCloseTo(expected, 10)
  })
})
