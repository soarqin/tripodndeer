import { describe, expect, it } from 'vitest'

import linXiangruEvent from '../events/lin-xiangru-bi.json'
import { EventChainSchema } from '~/shared/schemas'

describe('lin-xiangru-bi event chain', () => {
  it('exists and is valid JSON', () => {
    expect(linXiangruEvent).toBeDefined()
    expect(linXiangruEvent.id).toBe('event_lin_xiangru_bi')
  })

  it('passes EventChainSchema validation', () => {
    const result = EventChainSchema.safeParse(linXiangruEvent)
    expect(result.success).toBe(true)
  })

  it('has date trigger with yearBC range 280-278', () => {
    expect(linXiangruEvent.trigger.type).toBe('date')
    expect(linXiangruEvent.trigger.between).toEqual([
      { yearBC: 280 },
      { yearBC: 278 },
    ])
    expect(linXiangruEvent.trigger.realmId).toBe('realm_zhao')
  })

  it('is a one-shot event', () => {
    expect(linXiangruEvent.oneShot).toBe(true)
  })

  it('stage1 has 3 choices', () => {
    const stage1 = linXiangruEvent.stages.find((s) => s.id === 'stage1')
    expect(stage1).toBeDefined()
    expect(stage1?.choices).toHaveLength(3)
  })

  it('"send_lin" choice has 2 effects (trait.add + loyalty)', () => {
    const stage1 = linXiangruEvent.stages.find((s) => s.id === 'stage1')
    const sendLin = stage1?.choices.find((c) => c.id === 'send_lin')
    expect(sendLin).toBeDefined()
    expect(sendLin?.effects).toHaveLength(2)
    expect(sendLin?.effects[0]?.type).toBe('realm.trait.add')
    expect(sendLin?.effects[1]?.type).toBe('character.loyalty')
    expect(sendLin?.nextStageId).toBe('stage2')
  })

  it('"send_jade" choice has treasury effect with delta=-500', () => {
    const stage1 = linXiangruEvent.stages.find((s) => s.id === 'stage1')
    const sendJade = stage1?.choices.find((c) => c.id === 'send_jade')
    expect(sendJade).toBeDefined()
    expect(sendJade?.effects).toHaveLength(1)
    const effect = sendJade?.effects[0]
    expect(effect?.type).toBe('realm.treasury')
    expect((effect as { delta: number }).delta).toBe(-500)
  })

  it('has exactly 2 stages', () => {
    expect(linXiangruEvent.stages).toHaveLength(2)
    expect(linXiangruEvent.stages.map((s) => s.id)).toEqual(['stage1', 'stage2'])
  })
})
