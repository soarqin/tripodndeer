import { describe, it, expect } from 'vitest'
import {
  EffectSchema,
  EventChainSchema,
  EventChainStateSchema,
} from '../schemas'

describe('EffectSchema (M5 whitelist)', () => {
  it('accepts a valid realm.treasury effect', () => {
    const effect = { type: 'realm.treasury', realmId: 'realm_qin', delta: 100 }
    expect(EffectSchema.safeParse(effect).success).toBe(true)
  })

  it('accepts a valid realm.treasury effect with negative delta', () => {
    const effect = { type: 'realm.treasury', realmId: 'realm_qin', delta: -50 }
    expect(EffectSchema.safeParse(effect).success).toBe(true)
  })

  it('accepts a valid character.create effect', () => {
    const effect = {
      type: 'character.create',
      generalId: 'gen_new',
      realmId: 'realm_qin',
      name: 'Bai Qi',
    }
    expect(EffectSchema.safeParse(effect).success).toBe(true)
  })

  it('accepts a valid character.kill effect', () => {
    const effect = { type: 'character.kill', generalId: 'gen_42' }
    expect(EffectSchema.safeParse(effect).success).toBe(true)
  })

  it('accepts a valid character.loyalty effect', () => {
    const effect = { type: 'character.loyalty', generalId: 'gen_42', delta: -10 }
    expect(EffectSchema.safeParse(effect).success).toBe(true)
  })

  it('accepts a valid realm.trait.add effect', () => {
    const effect = { type: 'realm.trait.add', realmId: 'realm_qin', trait: 'reformed' }
    expect(EffectSchema.safeParse(effect).success).toBe(true)
  })

  it('rejects invalid effect type executeArbitraryCode', () => {
    const effect = { type: 'executeArbitraryCode', code: 'rm -rf /' }
    expect(EffectSchema.safeParse(effect).success).toBe(false)
  })

  it('rejects invalid effect type realm.delete', () => {
    const effect = { type: 'realm.delete', realmId: 'realm_qin' }
    expect(EffectSchema.safeParse(effect).success).toBe(false)
  })

  it('rejects invalid effect type world.reset', () => {
    const effect = { type: 'world.reset' }
    expect(EffectSchema.safeParse(effect).success).toBe(false)
  })

  it('rejects an effect missing required fields', () => {
    const effect = { type: 'realm.treasury' }
    expect(EffectSchema.safeParse(effect).success).toBe(false)
  })

  it('rejects realm.treasury with non-numeric delta', () => {
    const effect = { type: 'realm.treasury', realmId: 'realm_qin', delta: 'lots' }
    expect(EffectSchema.safeParse(effect).success).toBe(false)
  })
})

describe('EventChainSchema (M5)', () => {
  it('accepts a valid EventChain with date trigger', () => {
    const chain = {
      id: 'chain_shang_yang',
      trigger: {
        type: 'date',
        between: [{ yearBC: 359 }, { yearBC: 350 }],
        realmId: 'realm_qin',
      },
      oneShot: true,
      stages: [
        {
          id: 'stage_1',
          text: 'Shang Yang proposes reforms.',
          choices: [
            {
              id: 'accept',
              label: 'Accept reforms',
              effects: [{ type: 'realm.trait.add', realmId: 'realm_qin', trait: 'reformed' }],
            },
            {
              id: 'reject',
              label: 'Reject reforms',
              effects: [],
            },
          ],
        },
      ],
    }
    expect(EventChainSchema.safeParse(chain).success).toBe(true)
  })

  it('accepts a valid EventChain with state trigger', () => {
    const chain = {
      id: 'chain_state',
      trigger: {
        type: 'state',
        predicate: { kind: 'realm.treasury-above', value: 1000 },
      },
      oneShot: false,
      stages: [
        {
          id: 'stage_1',
          text: 'Test',
          choices: [],
        },
      ],
    }
    expect(EventChainSchema.safeParse(chain).success).toBe(true)
  })

  it('rejects an EventChain with empty stages', () => {
    const chain = {
      id: 'chain_empty',
      trigger: { type: 'state', predicate: { kind: 'realm.no-active-war' } },
      oneShot: true,
      stages: [],
    }
    expect(EventChainSchema.safeParse(chain).success).toBe(false)
  })

  it('rejects an EventChain stage with invalid effect in choice', () => {
    const chain = {
      id: 'chain_bad',
      trigger: { type: 'state', predicate: { kind: 'realm.no-active-war' } },
      oneShot: true,
      stages: [
        {
          id: 'stage_1',
          text: 'bad',
          choices: [
            {
              id: 'c1',
              label: 'do evil',
              effects: [{ type: 'world.reset' }],
            },
          ],
        },
      ],
    }
    expect(EventChainSchema.safeParse(chain).success).toBe(false)
  })
})

describe('EventChainStateSchema (M5)', () => {
  it('accepts a valid EventChainState', () => {
    const state = {
      id: 'chain_shang_yang',
      currentStageId: 'stage_1',
      completed: false,
      startedAtTick: 42,
    }
    expect(EventChainStateSchema.safeParse(state).success).toBe(true)
  })

  it('accepts a completed EventChainState', () => {
    const state = {
      id: 'chain_x',
      currentStageId: 'final',
      completed: true,
      startedAtTick: 0,
    }
    expect(EventChainStateSchema.safeParse(state).success).toBe(true)
  })

  it('rejects an EventChainState with negative startedAtTick', () => {
    const state = {
      id: 'chain_x',
      currentStageId: 'stage_1',
      completed: false,
      startedAtTick: -1,
    }
    expect(EventChainStateSchema.safeParse(state).success).toBe(false)
  })

  it('rejects an EventChainState missing required fields', () => {
    const state = { id: 'chain_x', completed: false }
    expect(EventChainStateSchema.safeParse(state).success).toBe(false)
  })
})
