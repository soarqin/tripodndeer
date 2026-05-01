import { describe, expect, it } from 'vitest'

import lianPoEvent from '../events/lian-po-elder.json'
import { EventChainSchema } from '~/shared/schemas'

describe('lian-po-elder event chain', () => {
  it('exists and is valid JSON', () => {
    expect(lianPoEvent).toBeDefined()
    expect(lianPoEvent.id).toBe('event_lian_po_elder')
  })

  it('passes EventChainSchema validation', () => {
    const result = EventChainSchema.safeParse(lianPoEvent)
    expect(result.success).toBe(true)
  })

  it('has date trigger with yearBC range 261-258 for realm_zhao', () => {
    expect(lianPoEvent.trigger.type).toBe('date')
    expect(lianPoEvent.trigger.between).toEqual([
      { yearBC: 261 },
      { yearBC: 258 },
    ])
    expect(lianPoEvent.trigger.realmId).toBe('realm_zhao')
  })

  it('is a one-shot event', () => {
    expect(lianPoEvent.oneShot).toBe(true)
  })

  it('"replace_zhao_kuo" choice has character.create effect for 赵括', () => {
    const stage1 = lianPoEvent.stages.find((s) => s.id === 'stage1')
    const replaceChoice = stage1?.choices.find((c) => c.id === 'replace_zhao_kuo')
    expect(replaceChoice).toBeDefined()
    expect(replaceChoice?.effects).toHaveLength(2)
    const createEffect = replaceChoice?.effects.find((e) => e.type === 'character.create')
    expect(createEffect).toBeDefined()
    expect((createEffect as { generalId: string }).generalId).toBe('gen_zhaokuo')
    expect((createEffect as { name: string }).name).toBe('赵括')
    expect((createEffect as { realmId: string }).realmId).toBe('realm_zhao')
  })

  it('"negotiate" choice has treasury effect with delta=-1000', () => {
    const stage1 = lianPoEvent.stages.find((s) => s.id === 'stage1')
    const negotiate = stage1?.choices.find((c) => c.id === 'negotiate')
    expect(negotiate).toBeDefined()
    expect(negotiate?.effects).toHaveLength(1)
    const effect = negotiate?.effects[0]
    expect(effect?.type).toBe('realm.treasury')
    expect((effect as { delta: number }).delta).toBe(-1000)
    expect((effect as { realmId: string }).realmId).toBe('realm_zhao')
  })

  it('"trust_lian" choice has 2 effects (trait + loyalty)', () => {
    const stage1 = lianPoEvent.stages.find((s) => s.id === 'stage1')
    const trustLian = stage1?.choices.find((c) => c.id === 'trust_lian')
    expect(trustLian).toBeDefined()
    expect(trustLian?.effects).toHaveLength(2)
    expect(trustLian?.effects[0]?.type).toBe('realm.trait.add')
    expect(trustLian?.effects[1]?.type).toBe('character.loyalty')
  })

  it('has exactly 1 stage with 3 choices', () => {
    expect(lianPoEvent.stages).toHaveLength(1)
    const stage1 = lianPoEvent.stages[0]
    expect(stage1?.choices).toHaveLength(3)
  })
})
