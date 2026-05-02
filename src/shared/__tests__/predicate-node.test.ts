import { describe, it, expect } from 'vitest'
import { PredicateNodeSchema, EventChainSchema } from '../schemas'

describe('PredicateNodeSchema', () => {
  it('accepts realm.id predicate', () => {
    const node = { kind: 'realm.id', value: 'realm_qin' }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('accepts realm.has-character-with-specialty predicate', () => {
    const node = { kind: 'realm.has-character-with-specialty', specialty: 'reformer' }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('accepts realm.ruler-personality-in predicate', () => {
    const node = { kind: 'realm.ruler-personality-in', values: ['conqueror', 'tyrant'] }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('accepts realm.has-trait predicate (without not)', () => {
    const node = { kind: 'realm.has-trait', trait: 'reformed' }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('accepts realm.has-trait predicate with not flag', () => {
    const node = { kind: 'realm.has-trait', trait: 'reformed', not: true }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('accepts realm.no-active-war predicate', () => {
    const node = { kind: 'realm.no-active-war' }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('accepts realm.treasury-above predicate', () => {
    const node = { kind: 'realm.treasury-above', value: 1000 }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('accepts realm.population-above predicate', () => {
    const node = { kind: 'realm.population-above', value: 100000 }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('accepts realm.ruler-in-office-years predicate', () => {
    const node = { kind: 'realm.ruler-in-office-years', minYears: 5 }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('accepts realm.has-political-system predicate', () => {
    const node = { kind: 'realm.has-political-system', system: 'commandery' }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('rejects realm.has-political-system with invalid system value', () => {
    const node = { kind: 'realm.has-political-system', system: 'monarchy' }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(false)
  })

  it('accepts realm.year-after predicate', () => {
    const node = { kind: 'realm.year-after', yearBC: 260 }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('accepts and predicate with nested children', () => {
    const node = {
      kind: 'and',
      children: [
        { kind: 'realm.id', value: 'realm_qin' },
        { kind: 'realm.treasury-above', value: 1000 },
      ],
    }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('accepts or predicate with nested children', () => {
    const node = {
      kind: 'or',
      children: [
        { kind: 'realm.has-trait', trait: 'reformed' },
        { kind: 'realm.no-active-war' },
      ],
    }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('accepts deeply nested and/or predicates', () => {
    const node = {
      kind: 'and',
      children: [
        {
          kind: 'or',
          children: [
            { kind: 'realm.id', value: 'realm_qin' },
            { kind: 'realm.id', value: 'realm_zhao' },
          ],
        },
        { kind: 'realm.treasury-above', value: 500 },
      ],
    }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(true)
  })

  it('rejects unknown predicate kind', () => {
    const node = { kind: 'realm.unknown-predicate', foo: 'bar' }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(false)
  })

  it('rejects predicate missing required field', () => {
    const node = { kind: 'realm.treasury-above' }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(false)
  })

  it('rejects realm.has-character-with-specialty with invalid specialty', () => {
    const node = { kind: 'realm.has-character-with-specialty', specialty: 'wizard' }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(false)
  })

  it('rejects realm.ruler-personality-in with invalid archetype', () => {
    const node = { kind: 'realm.ruler-personality-in', values: ['conqueror', 'fool'] }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(false)
  })

  it('rejects realm.ruler-in-office-years with negative minYears', () => {
    const node = { kind: 'realm.ruler-in-office-years', minYears: -1 }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(false)
  })

  it('rejects and predicate with non-array children', () => {
    const node = { kind: 'and', children: { kind: 'realm.no-active-war' } }
    expect(PredicateNodeSchema.safeParse(node).success).toBe(false)
  })
})

describe('EventChainSchema with PredicateNode trigger (backward compat)', () => {
  it('accepts M5-style date trigger (no predicate field)', () => {
    const chain = {
      id: 'event_lin_xiangru_bi',
      trigger: {
        type: 'date',
        between: [{ yearBC: 280 }, { yearBC: 278 }],
        realmId: 'realm_zhao',
      },
      oneShot: true,
      stages: [
        {
          id: 'stage1',
          text: 'M5 chain',
          choices: [{ id: 'c1', label: 'go', effects: [] }],
        },
      ],
    }
    expect(EventChainSchema.safeParse(chain).success).toBe(true)
  })

  it('accepts state trigger with PredicateNode object', () => {
    const chain = {
      id: 'event_state_test',
      trigger: {
        type: 'state',
        predicate: {
          kind: 'and',
          children: [
            { kind: 'realm.id', value: 'realm_qin' },
            { kind: 'realm.has-character-with-specialty', specialty: 'reformer' },
          ],
        },
      },
      oneShot: true,
      stages: [
        {
          id: 'stage1',
          text: 'reform proposed',
          choices: [{ id: 'c1', label: 'accept', effects: [] }],
        },
      ],
    }
    expect(EventChainSchema.safeParse(chain).success).toBe(true)
  })

  it('rejects state trigger with legacy string predicate', () => {
    const chain = {
      id: 'event_legacy',
      trigger: {
        type: 'state',
        predicate: 'realm_qin.treasury > 1000',
      },
      oneShot: true,
      stages: [
        {
          id: 'stage1',
          text: 'legacy',
          choices: [{ id: 'c1', label: 'go', effects: [] }],
        },
      ],
    }
    expect(EventChainSchema.safeParse(chain).success).toBe(false)
  })
})
