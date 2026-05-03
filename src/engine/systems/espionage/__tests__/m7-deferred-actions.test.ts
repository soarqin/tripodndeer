import { describe, expect, it } from 'vitest'

import { ESPIONAGE_ACTION_KINDS } from '~/shared/types'
import { isValidEffectType } from '~/engine/systems/events/event-chain-engine'

describe('M7 §12.4 deferred actions guardrail', () => {
  describe('ESPIONAGE_ACTION_KINDS surface', () => {
    it('contains exactly 4 actions', () => {
      expect(ESPIONAGE_ACTION_KINDS.length).toBe(4)
    })

    it('sorted lexicographically equals [counter_intel, discord, reconnaissance, rumor]', () => {
      const sorted = [...ESPIONAGE_ACTION_KINDS].sort()
      expect(sorted).toEqual(['counter_intel', 'discord', 'reconnaissance', 'rumor'])
    })

    it('does NOT contain deferred actions (assassinate, defect, steal_tactic, steal_culture)', () => {
      const deferred = [
        'assassinate',
        'defect',
        'steal_tactic',
        'steal_culture',
        'sabotage',
        'kidnap',
      ]
      for (const action of deferred) {
        expect((ESPIONAGE_ACTION_KINDS as readonly string[]).includes(action)).toBe(false)
      }
    })
  })

  describe('Effect whitelist (D15) enforcement', () => {
    it('does NOT accept forbidden assassination/defection/theft effect types', () => {
      const FORBIDDEN_EFFECTS = [
        'character.assassinate',
        'character.defect',
        'realm.tactic.steal',
        'realm.culture.steal',
      ]
      for (const effectType of FORBIDDEN_EFFECTS) {
        expect(isValidEffectType(effectType)).toBe(false)
      }
    })

    it('DOES accept the M7 reuse triplet: character.loyalty, realm.relation.delta, realm.faction.delta', () => {
      const ALLOWED_REUSE = [
        'character.loyalty',
        'realm.relation.delta',
        'realm.faction.delta',
      ]
      for (const effectType of ALLOWED_REUSE) {
        expect(isValidEffectType(effectType)).toBe(true)
      }
    })

    it('does NOT accept a hypothetical M7-specific intelligence delta effect (no engine surface for it)', () => {
      expect(isValidEffectType('realm.intelligence.delta')).toBe(false)
    })
  })
})
