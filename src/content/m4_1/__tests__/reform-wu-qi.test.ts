import { describe, expect, it } from 'vitest'

import wuQiReform from '../reforms/wu-qi.json'
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

const parsedReform = ReformDefinitionSchema.parse(wuQiReform)

function basePositiveWorld() {
  const realm = makeRealm({
    id: 'realm_chu',
    economy: { treasury: 1500, foodStores: 0, taxRate: 10 },
  })
  return makeReformWorld({
    yearBC: 390,
    realm,
    ruler: makeRuler('realm_chu', 'builder'),
    reformer: makeReformer('realm_chu'),
  })
}

describe('reform-wu-qi JSON', () => {
  it('parses against ReformDefinitionSchema', () => {
    expect(ReformDefinitionSchema.safeParse(wuQiReform).success).toBe(true)
  })

  it('has correct id and display names', () => {
    expect(parsedReform.id).toBe('reform_wu_qi')
    expect(parsedReform.displayNameZh).toBe('吴起变法')
  })

  it('has 3 stages', () => {
    expect(parsedReform.stages).toHaveLength(3)
  })

  it('successTrait is recognized', () => {
    expect(['wu_qi_reform_done', ...Object.keys(TRAIT_EFFECT_REGISTRY)]).toContain(
      parsedReform.successTrait,
    )
  })

  it('failureTrait wu_qi_failed_legacy is in TRAIT_EFFECT_REGISTRY', () => {
    expect(parsedReform.failureTrait).toBe('wu_qi_failed_legacy')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty(parsedReform.failureTrait)
  })

  it('historicalYearRange covers 389-381 BC', () => {
    expect(parsedReform.historicalYearRange).toEqual([389, 381])
  })
})

describe('reform-wu-qi choices', () => {
  it('all choices have valid outcome enum', () => {
    for (const stage of parsedReform.stages) {
      for (const choice of stage.choices) {
        expect(['continue', 'success', 'failure']).toContain(choice.outcome)
      }
    }
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

describe('reform-wu-qi trigger', () => {
  it('triggers true when all conditions met', () => {
    const world = basePositiveWorld()
    const realm = world.realms.get('realm_chu')!
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(true)
  })

  it('triggers false when realm is not Chu', () => {
    const world = basePositiveWorld()
    const otherRealm = makeRealm({ id: 'realm_qin' })
    expect(evaluatePredicate(world, otherRealm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when wu_qi_failed_legacy trait already present', () => {
    const realm = makeRealm({
      id: 'realm_chu',
      traits: ['wu_qi_failed_legacy'],
      economy: { treasury: 1500, foodStores: 0, taxRate: 10 },
    })
    const world = makeReformWorld({
      yearBC: 390,
      realm,
      ruler: makeRuler('realm_chu', 'builder'),
      reformer: makeReformer('realm_chu'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when shang_yang_reform_done trait present', () => {
    const realm = makeRealm({
      id: 'realm_chu',
      traits: ['shang_yang_reform_done'],
      economy: { treasury: 1500, foodStores: 0, taxRate: 10 },
    })
    const world = makeReformWorld({
      yearBC: 390,
      realm,
      ruler: makeRuler('realm_chu', 'builder'),
      reformer: makeReformer('realm_chu'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when treasury below 1000', () => {
    const realm = makeRealm({
      id: 'realm_chu',
      economy: { treasury: 500, foodStores: 0, taxRate: 10 },
    })
    const world = makeReformWorld({
      yearBC: 390,
      realm,
      ruler: makeRuler('realm_chu', 'builder'),
      reformer: makeReformer('realm_chu'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when world year is earlier than 390 BC (yearBC > 390)', () => {
    const realm = makeRealm({
      id: 'realm_chu',
      economy: { treasury: 1500, foodStores: 0, taxRate: 10 },
    })
    const world = makeReformWorld({
      yearBC: 400,
      realm,
      ruler: makeRuler('realm_chu', 'builder'),
      reformer: makeReformer('realm_chu'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })
})
