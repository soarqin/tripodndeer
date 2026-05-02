import { describe, expect, it } from 'vitest'

import hanShenBuhaiReform from '../reforms/han-shen-buhai-restart.json'
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

const parsedReform = ReformDefinitionSchema.parse(hanShenBuhaiReform)

function basePositiveWorld() {
  const realm = makeRealm({ id: 'realm_han' })
  return makeReformWorld({
    yearBC: 260,
    realm,
    ruler: makeRuler('realm_han', 'schemer'),
    reformer: makeReformer('realm_han'),
  })
}

describe('reform-han-shen-buhai-restart JSON', () => {
  it('parses against ReformDefinitionSchema', () => {
    expect(ReformDefinitionSchema.safeParse(hanShenBuhaiReform).success).toBe(true)
  })

  it('has correct id and display names', () => {
    expect(parsedReform.id).toBe('reform_han_shen_buhai_restart')
    expect(parsedReform.displayNameZh).toBe('韩国申不害术治')
  })

  it('has 3 stages', () => {
    expect(parsedReform.stages).toHaveLength(3)
  })

  it('successTrait han_shen_buhai_done is in TRAIT_EFFECT_REGISTRY', () => {
    expect(parsedReform.successTrait).toBe('han_shen_buhai_done')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty(parsedReform.successTrait)
  })

  it('failureTrait is reform_failed_scar', () => {
    expect(parsedReform.failureTrait).toBe('reform_failed_scar')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty(parsedReform.failureTrait)
  })
})

describe('reform-han-shen-buhai-restart choices', () => {
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

describe('reform-han-shen-buhai-restart trigger', () => {
  it('triggers true when all conditions met', () => {
    const world = basePositiveWorld()
    const realm = world.realms.get('realm_han')!
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(true)
  })

  it('triggers false when realm is not Han', () => {
    const world = basePositiveWorld()
    const otherRealm = makeRealm({ id: 'realm_qin' })
    expect(evaluatePredicate(world, otherRealm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when ruler personality is conqueror (not in [builder, schemer])', () => {
    const realm = makeRealm({ id: 'realm_han' })
    const world = makeReformWorld({
      yearBC: 260,
      realm,
      ruler: makeRuler('realm_han', 'conqueror'),
      reformer: makeReformer('realm_han'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when treasury below 1500', () => {
    const realm = makeRealm({
      id: 'realm_han',
      economy: { treasury: 1000, foodStores: 0, taxRate: 10 },
    })
    const world = makeReformWorld({
      yearBC: 260,
      realm,
      ruler: makeRuler('realm_han', 'schemer'),
      reformer: makeReformer('realm_han'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when han_shen_buhai_done trait already present', () => {
    const realm = makeRealm({ id: 'realm_han', traits: ['han_shen_buhai_done'] })
    const world = makeReformWorld({
      yearBC: 260,
      realm,
      ruler: makeRuler('realm_han', 'schemer'),
      reformer: makeReformer('realm_han'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })
})
