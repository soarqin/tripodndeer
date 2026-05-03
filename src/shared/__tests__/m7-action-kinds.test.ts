import { describe, expect, it } from 'vitest'
import type { EspionageActionKind, EspionageRiskTier } from '../types'
import { ESPIONAGE_ACTION_KINDS, ESPIONAGE_RISK_TIERS } from '../types'

describe('M7 espionage action kinds', () => {
  it('ESPIONAGE_ACTION_KINDS has exactly 4 members', () => {
    expect(ESPIONAGE_ACTION_KINDS).toHaveLength(4)
  })

  it('each action kind has a corresponding risk tier', () => {
    for (const kind of ESPIONAGE_ACTION_KINDS) {
      expect(ESPIONAGE_RISK_TIERS[kind]).toBeDefined()
      const tier = ESPIONAGE_RISK_TIERS[kind]
      expect(['low', 'mid', 'high', 'defensive']).toContain(tier)
    }
  })

  it('risk tier mapping is correct', () => {
    expect(ESPIONAGE_RISK_TIERS.reconnaissance).toBe('low')
    expect(ESPIONAGE_RISK_TIERS.rumor).toBe('mid')
    expect(ESPIONAGE_RISK_TIERS.discord).toBe('high')
    expect(ESPIONAGE_RISK_TIERS.counter_intel).toBe('defensive')
  })

  it('does NOT contain forbidden actions', () => {
    const forbidden = ['defect_governor', 'defect_general', 'assassinate_ruler', 'assassinate_talent', 'steal_tactic', 'steal_culture']
    for (const action of forbidden) {
      expect(ESPIONAGE_ACTION_KINDS).not.toContain(action as EspionageActionKind)
    }
  })

  it('EspionageActionKind type is correctly inferred', () => {
    const kind: EspionageActionKind = 'reconnaissance'
    expect(kind).toBe('reconnaissance')
  })

  it('EspionageRiskTier type is correctly inferred', () => {
    const tier: EspionageRiskTier = 'low'
    expect(tier).toBe('low')
  })
})
