import { describe, expect, it } from 'vitest'

import chuWuQiLegacyReform from '../reforms/chu-wu-qi-legacy.json'
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

const parsedReform = ReformDefinitionSchema.parse(chuWuQiLegacyReform)

function basePositiveWorld() {
  const realm = makeRealm({
    id: 'realm_chu',
    traits: ['wu_qi_failed_legacy'],
  })
  return makeReformWorld({
    yearBC: 260,
    realm,
    ruler: makeRuler('realm_chu', 'builder'),
    reformer: makeReformer('realm_chu'),
  })
}

describe('reform-chu-wu-qi-legacy JSON', () => {
  it('parses against ReformDefinitionSchema', () => {
    expect(ReformDefinitionSchema.safeParse(chuWuQiLegacyReform).success).toBe(true)
  })

  it('has correct id and display names', () => {
    expect(parsedReform.id).toBe('reform_chu_wu_qi_legacy')
    expect(parsedReform.displayNameZh).toBe('楚国吴起遗志')
  })

  it('has 3 stages', () => {
    expect(parsedReform.stages).toHaveLength(3)
  })

  it('successTrait chu_wu_qi_legacy_done is in TRAIT_EFFECT_REGISTRY', () => {
    expect(parsedReform.successTrait).toBe('chu_wu_qi_legacy_done')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty(parsedReform.successTrait)
  })

  it('failureTrait is reform_failed_scar', () => {
    expect(parsedReform.failureTrait).toBe('reform_failed_scar')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty(parsedReform.failureTrait)
  })

  it('has no historicalYearRange (fictional)', () => {
    expect(parsedReform.historicalYearRange).toBeUndefined()
  })
})

describe('reform-chu-wu-qi-legacy choices', () => {
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

describe('reform-chu-wu-qi-legacy trigger', () => {
  it('triggers true in default 260 BC scenario when all conditions met', () => {
    const world = basePositiveWorld()
    const realm = world.realms.get('realm_chu')!
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(true)
  })

  it('triggers false when realm lacks wu_qi_failed_legacy trait', () => {
    const realm = makeRealm({ id: 'realm_chu', traits: [] })
    const world = makeReformWorld({
      yearBC: 260,
      realm,
      ruler: makeRuler('realm_chu', 'builder'),
      reformer: makeReformer('realm_chu'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when chu_wu_qi_legacy_done trait already present', () => {
    const realm = makeRealm({
      id: 'realm_chu',
      traits: ['wu_qi_failed_legacy', 'chu_wu_qi_legacy_done'],
    })
    const world = makeReformWorld({
      yearBC: 260,
      realm,
      ruler: makeRuler('realm_chu', 'builder'),
      reformer: makeReformer('realm_chu'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when realm is not Chu', () => {
    const world = basePositiveWorld()
    const otherRealm = makeRealm({ id: 'realm_qin', traits: ['wu_qi_failed_legacy'] })
    expect(evaluatePredicate(world, otherRealm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when world year is earlier than 260 BC (yearBC > 260)', () => {
    const realm = makeRealm({
      id: 'realm_chu',
      traits: ['wu_qi_failed_legacy'],
    })
    const world = makeReformWorld({
      yearBC: 280,
      realm,
      ruler: makeRuler('realm_chu', 'builder'),
      reformer: makeReformer('realm_chu'),
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })
})
