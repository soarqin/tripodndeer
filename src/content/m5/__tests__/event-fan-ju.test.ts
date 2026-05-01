import { describe, expect, it } from 'vitest'

import fanJuEvent from '../events/fan-ju-strategy.json'
import { EventChainSchema } from '~/shared/schemas'

describe('fan-ju-strategy event chain', () => {
  it('exists and is valid JSON', () => {
    expect(fanJuEvent).toBeDefined()
    expect(fanJuEvent.id).toBe('event_fan_ju_strategy')
  })

  it('passes EventChainSchema validation', () => {
    const result = EventChainSchema.safeParse(fanJuEvent)
    expect(result.success).toBe(true)
  })

  it('has date trigger with yearBC range 268-264 for realm_qin', () => {
    expect(fanJuEvent.trigger.type).toBe('date')
    expect(fanJuEvent.trigger.between).toEqual([
      { yearBC: 268 },
      { yearBC: 264 },
    ])
    expect(fanJuEvent.trigger.realmId).toBe('realm_qin')
  })

  it('is a one-shot event', () => {
    expect(fanJuEvent.oneShot).toBe(true)
  })

  it('"expel_fan" choice has character.kill effect', () => {
    const stage1 = fanJuEvent.stages.find((s) => s.id === 'stage1')
    const expelFan = stage1?.choices.find((c) => c.id === 'expel_fan')
    expect(expelFan).toBeDefined()
    expect(expelFan?.effects).toHaveLength(1)
    const effect = expelFan?.effects[0]
    expect(effect?.type).toBe('character.kill')
    expect((effect as { generalId: string }).generalId).toBe('gen_fanju')
  })

  it('"adopt_strategy" choice has 2 effects (trait.add + loyalty) and leads to stage2', () => {
    const stage1 = fanJuEvent.stages.find((s) => s.id === 'stage1')
    const adoptStrategy = stage1?.choices.find((c) => c.id === 'adopt_strategy')
    expect(adoptStrategy).toBeDefined()
    expect(adoptStrategy?.effects).toHaveLength(2)
    expect(adoptStrategy?.effects[0]?.type).toBe('realm.trait.add')
    expect(adoptStrategy?.effects[1]?.type).toBe('character.loyalty')
    expect(adoptStrategy?.nextStageId).toBe('stage2')
  })

  it('has exactly 2 stages with 3 choices on stage1', () => {
    expect(fanJuEvent.stages).toHaveLength(2)
    const stage1 = fanJuEvent.stages.find((s) => s.id === 'stage1')
    expect(stage1?.choices).toHaveLength(3)
  })
})
