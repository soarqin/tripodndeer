import { describe, expect, it } from 'vitest'

import shangYangReform from '../reforms/shang-yang.json'
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

const parsedReform = ReformDefinitionSchema.parse(shangYangReform)

function basePositiveWorld() {
  const realm = makeRealm({ id: 'realm_qin' })
  return makeReformWorld({
    yearBC: 360,
    tick: 200,
    realm,
    ruler: makeRuler('realm_qin', 'builder'),
    reformer: makeReformer('realm_qin'),
  })
}

describe('reform-shang-yang JSON', () => {
  it('parses against ReformDefinitionSchema', () => {
    expect(ReformDefinitionSchema.safeParse(shangYangReform).success).toBe(true)
  })

  it('has correct id and display names', () => {
    expect(parsedReform.id).toBe('reform_shang_yang')
    expect(parsedReform.displayNameZh).toBe('商鞅变法')
  })

  it('has 4 stages', () => {
    expect(parsedReform.stages).toHaveLength(4)
  })

  it('successTrait is in TRAIT_EFFECT_REGISTRY', () => {
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty(parsedReform.successTrait)
  })

  it('failureTrait is reform_failed_scar (in registry)', () => {
    expect(parsedReform.failureTrait).toBe('reform_failed_scar')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty(parsedReform.failureTrait)
  })

  it('historicalYearRange covers 360-338 BC', () => {
    expect(parsedReform.historicalYearRange).toEqual([360, 338])
  })
})

describe('reform-shang-yang choices', () => {
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

describe('reform-shang-yang trigger', () => {
  it('triggers true when all conditions met', () => {
    const world = basePositiveWorld()
    const realm = world.realms.get('realm_qin')!
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(true)
  })

  it('triggers false when realm is not Qin', () => {
    const world = basePositiveWorld()
    const otherRealm = makeRealm({ id: 'realm_zhao' })
    expect(evaluatePredicate(world, otherRealm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when no reformer in realm', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeReformWorld({
      yearBC: 360,
      tick: 200,
      realm,
      ruler: makeRuler('realm_qin', 'builder'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when ruler personality is steward', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeReformWorld({
      yearBC: 360,
      tick: 200,
      realm,
      ruler: makeRuler('realm_qin', 'steward'),
      reformer: makeReformer('realm_qin'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when treasury too low', () => {
    const realm = makeRealm({
      id: 'realm_qin',
      economy: { treasury: 1000, foodStores: 0, taxRate: 10 },
    })
    const world = makeReformWorld({
      yearBC: 360,
      tick: 200,
      realm,
      ruler: makeRuler('realm_qin', 'builder'),
      reformer: makeReformer('realm_qin'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when shang_yang_reform_done trait already present', () => {
    const realm = makeRealm({ id: 'realm_qin', traits: ['shang_yang_reform_done'] })
    const world = makeReformWorld({
      yearBC: 360,
      tick: 200,
      realm,
      ruler: makeRuler('realm_qin', 'builder'),
      reformer: makeReformer('realm_qin'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when world year is earlier than 360 BC (yearBC > 360)', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeReformWorld({
      yearBC: 400,
      tick: 200,
      realm,
      ruler: makeRuler('realm_qin', 'builder'),
      reformer: makeReformer('realm_qin'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })
})
