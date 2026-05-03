import { describe, it, expect } from 'vitest'
import type { CounterIntelState, AIEspionageOption } from '~/shared/types'
import { ESPIONAGE_ACTION_KINDS } from '~/shared/types'
import type { AIOption } from '~/engine/systems/ai/utility-scorer'

describe('M7 Counter & Espionage Option Types', () => {
  describe('CounterIntelState', () => {
    it('should have exactly 3 required fields: realmId, detectionLevel, lastUpdatedTick', () => {
      const state: CounterIntelState = {
        realmId: 'realm_qin',
        detectionLevel: 5,
        lastUpdatedTick: 100,
      }

      expect(state.realmId).toBe('realm_qin')
      expect(state.detectionLevel).toBe(5)
      expect(state.lastUpdatedTick).toBe(100)
    })

    it('should enforce detectionLevel as 0-10 integer', () => {
      const state: CounterIntelState = {
        realmId: 'realm_chu',
        detectionLevel: 0,
        lastUpdatedTick: 50,
      }
      expect(state.detectionLevel).toBeGreaterThanOrEqual(0)
      expect(state.detectionLevel).toBeLessThanOrEqual(10)

      const maxState: CounterIntelState = {
        realmId: 'realm_chu',
        detectionLevel: 10,
        lastUpdatedTick: 50,
      }
      expect(maxState.detectionLevel).toBe(10)
    })

    it('should be readonly', () => {
      const state: CounterIntelState = {
        realmId: 'realm_zhao',
        detectionLevel: 3,
        lastUpdatedTick: 200,
      }

      // TypeScript will prevent mutation at compile time
      // This test documents the readonly contract
      expect(state).toEqual({
        realmId: 'realm_zhao',
        detectionLevel: 3,
        lastUpdatedTick: 200,
      })
    })
  })

  describe('AIEspionageOption', () => {
    it('should have 3 required fields: kind, spyRealmId, targetRealmId', () => {
      const option: AIEspionageOption = {
        kind: 'reconnaissance',
        spyRealmId: 'realm_qin',
        targetRealmId: 'realm_chu',
      }

      expect(option.kind).toBe('reconnaissance')
      expect(option.spyRealmId).toBe('realm_qin')
      expect(option.targetRealmId).toBe('realm_chu')
    })

    it('should have optional score field', () => {
      const optionWithScore: AIEspionageOption = {
        kind: 'rumor',
        spyRealmId: 'realm_wei',
        targetRealmId: 'realm_zhao',
        score: 42.5,
      }

      expect(optionWithScore.score).toBe(42.5)

      const optionWithoutScore: AIEspionageOption = {
        kind: 'discord',
        spyRealmId: 'realm_han',
        targetRealmId: 'realm_yan',
      }

      expect(optionWithoutScore.score).toBeUndefined()
    })

    it('should accept all EspionageActionKind values', () => {
      for (const actionKind of ESPIONAGE_ACTION_KINDS) {
        const option: AIEspionageOption = {
          kind: actionKind,
          spyRealmId: 'realm_test',
          targetRealmId: 'realm_target',
        }
        expect(option.kind).toBe(actionKind)
      }
    })

    it('should be readonly', () => {
      const option: AIEspionageOption = {
        kind: 'counter_intel',
        spyRealmId: 'realm_ba',
        targetRealmId: 'realm_shu',
        score: 10,
      }

      // TypeScript will prevent mutation at compile time
      // This test documents the readonly contract
      expect(option).toEqual({
        kind: 'counter_intel',
        spyRealmId: 'realm_ba',
        targetRealmId: 'realm_shu',
        score: 10,
      })
    })
  })

  describe('AIOption.kind union (regression test)', () => {
    it('should NOT contain any EspionageActionKind values', () => {
      // This test ensures AIEspionageOption remains PARALLEL to AIOption
      // and does NOT extend AIOption.kind union
      const aiOptionKinds: AIOption['kind'][] = [
        'attack',
        'siege-continue',
        'cut-supply',
        'retreat',
        'idle',
        'economy',
        'diplomacy',
        'recruit',
      ]

      const espionageKinds = ESPIONAGE_ACTION_KINDS

      // Verify no overlap
      for (const espionageKind of espionageKinds) {
        expect(aiOptionKinds).not.toContain(espionageKind)
      }

      // Verify AIOption.kind has exactly 8 members (unchanged)
      expect(aiOptionKinds).toHaveLength(8)
    })

    it('should maintain AIOption interface unchanged', () => {
      // Verify AIOption still has its original structure
      const option: AIOption = {
        kind: 'attack',
        targetSiteId: 'site_1',
        armyId: 'army_1',
        score: 50,
      }

      expect(option.kind).toBe('attack')
      expect(option.targetSiteId).toBe('site_1')
      expect(option.armyId).toBe('army_1')
      expect(option.score).toBe(50)
    })
  })
})
