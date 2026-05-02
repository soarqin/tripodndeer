import { describe, expect, it } from 'vitest'

import huFuQiSheReform from '../reforms/hu-fu-qi-she.json'
import { ReformDefinitionSchema, type Effect } from '~/shared/schemas'
import { TRAIT_EFFECT_REGISTRY } from '../trait-effects'
import { evaluatePredicate } from '~/engine/systems/reform/predicate'
import {
  WHITELISTED_EFFECT_TYPES,
  makeRealm,
  makeReformWorld,
  makeReformer,
  makeRuler,
} from './_reform-test-helpers'

const parsedReform = ReformDefinitionSchema.parse(huFuQiSheReform)

function basePositiveWorld() {
  const realm = makeRealm({ id: 'realm_zhao' })
  return makeReformWorld({
    yearBC: 307,
    realm,
    ruler: makeRuler('realm_zhao', 'conqueror'),
    reformer: makeReformer('realm_zhao'),
  })
}

describe('reform-hu-fu-qi-she JSON', () => {
  it('parses against ReformDefinitionSchema', () => {
    expect(ReformDefinitionSchema.safeParse(huFuQiSheReform).success).toBe(true)
  })

  it('has correct id and display names', () => {
    expect(parsedReform.id).toBe('reform_hu_fu_qi_she')
    expect(parsedReform.displayNameZh).toBe('胡服骑射')
  })

  it('has 3 stages', () => {
    expect(parsedReform.stages).toHaveLength(3)
  })

  it('successTrait hu_fu_qi_she_done is in TRAIT_EFFECT_REGISTRY', () => {
    expect(parsedReform.successTrait).toBe('hu_fu_qi_she_done')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty(parsedReform.successTrait)
  })

  it('failureTrait is reform_failed_scar', () => {
    expect(parsedReform.failureTrait).toBe('reform_failed_scar')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty(parsedReform.failureTrait)
  })

  it('historicalYearRange covers 307-298 BC', () => {
    expect(parsedReform.historicalYearRange).toEqual([307, 298])
  })
})

describe('reform-hu-fu-qi-she choices', () => {
  it('all choices have valid outcome enum', () => {
    for (const stage of parsedReform.stages) {
      for (const choice of stage.choices) {
        expect(['continue', 'success', 'failure']).toContain(choice.outcome)
      }
    }
  })

  it('final stage has at least one success outcome', () => {
    const finalStage = parsedReform.stages.at(-1)
    expect(finalStage).toBeDefined()
    const outcomes = finalStage!.choices.map((c) => c.outcome)
    expect(outcomes).toContain('success')
  })

  it('uses no non-whitelisted effect types', () => {
    for (const stage of parsedReform.stages) {
      for (const choice of stage.choices) {
        for (const effect of choice.effects as readonly Effect[]) {
          expect(WHITELISTED_EFFECT_TYPES).toContain(effect.type)
        }
      }
    }
  })
})

describe('reform-hu-fu-qi-she trigger', () => {
  it('triggers true when all conditions met', () => {
    const world = basePositiveWorld()
    const realm = world.realms.get('realm_zhao')!
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(true)
  })

  it('triggers false when realm is not Zhao', () => {
    const world = basePositiveWorld()
    const otherRealm = makeRealm({ id: 'realm_qin' })
    expect(evaluatePredicate(world, otherRealm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when ruler personality is builder (not in [conqueror])', () => {
    const realm = makeRealm({ id: 'realm_zhao' })
    const world = makeReformWorld({
      yearBC: 307,
      realm,
      ruler: makeRuler('realm_zhao', 'builder'),
      reformer: makeReformer('realm_zhao'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when hu_fu_qi_she_done trait already present', () => {
    const realm = makeRealm({ id: 'realm_zhao', traits: ['hu_fu_qi_she_done'] })
    const world = makeReformWorld({
      yearBC: 307,
      realm,
      ruler: makeRuler('realm_zhao', 'conqueror'),
      reformer: makeReformer('realm_zhao'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when world year is earlier than 310 BC (yearBC > 310)', () => {
    const realm = makeRealm({ id: 'realm_zhao' })
    const world = makeReformWorld({
      yearBC: 320,
      realm,
      ruler: makeRuler('realm_zhao', 'conqueror'),
      reformer: makeReformer('realm_zhao'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })
})
