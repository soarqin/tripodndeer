import { describe, expect, it } from 'vitest'

import rumorSuccessChain from '../rumor-success-chain.json'
import { EventChainSchema } from '~/shared/schemas'
import { isValidEffectType } from '~/engine/systems/events/event-chain-engine'
import type { Effect } from '~/shared/schemas'

const parsed = EventChainSchema.parse(rumorSuccessChain)

describe('rumor-success-chain JSON', () => {
  it('parses against EventChainSchema', () => {
    expect(EventChainSchema.safeParse(rumorSuccessChain).success).toBe(true)
  })

  it('has correct id and realm-scoped scope', () => {
    expect(parsed.id).toBe('rumor_success_v1')
    expect(parsed.scope).toBe('realm-scoped')
  })

  it('is narrative-only: every choice has no effects (faction delta already applied in T2.6)', () => {
    expect(parsed.stages.length).toBeGreaterThanOrEqual(1)
    for (const stage of parsed.stages) {
      for (const choice of stage.choices) {
        expect(choice.effects).toEqual([])
      }
    }
  })

  it('all effects (when present) use D15 whitelist effect types only', () => {
    for (const stage of parsed.stages) {
      for (const choice of stage.choices) {
        for (const effect of choice.effects as readonly Effect[]) {
          expect(isValidEffectType(effect.type)).toBe(true)
        }
      }
    }
  })
})
