import { describe, expect, it } from 'vitest'

import qiJixiaReform from '../reforms/qi-jixia-debate.json'
import { ReformDefinitionSchema, type Effect } from '~/shared/schemas'
import { TRAIT_EFFECT_REGISTRY } from '../trait-effects'
import { evaluatePredicate } from '~/engine/systems/reform/predicate'
import {
  WHITELISTED_EFFECT_TYPES,
  makeRealm,
  makeReformWorld,
  makeReformer,
  makeRuler,
  makeSite,
} from './_reform-test-helpers'

const parsedReform = ReformDefinitionSchema.parse(qiJixiaReform)

function basePositiveWorld() {
  const realm = makeRealm({ id: 'realm_qi' })
  return makeReformWorld({
    yearBC: 260,
    realm,
    ruler: makeRuler('realm_qi', 'builder'),
    reformer: makeReformer('realm_qi'),
    sites: [makeSite('site_linzi', 'realm_qi', 60000)],
  })
}

describe('reform-qi-jixia-debate JSON', () => {
  it('parses against ReformDefinitionSchema', () => {
    expect(ReformDefinitionSchema.safeParse(qiJixiaReform).success).toBe(true)
  })

  it('has correct id and display names', () => {
    expect(parsedReform.id).toBe('reform_qi_jixia_debate')
    expect(parsedReform.displayNameZh).toBe('齐国稷下变制')
  })

  it('has 3 stages', () => {
    expect(parsedReform.stages).toHaveLength(3)
  })

  it('successTrait qi_jixia_reform_done is in TRAIT_EFFECT_REGISTRY', () => {
    expect(parsedReform.successTrait).toBe('qi_jixia_reform_done')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty(parsedReform.successTrait)
  })

  it('failureTrait is reform_failed_scar', () => {
    expect(parsedReform.failureTrait).toBe('reform_failed_scar')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty(parsedReform.failureTrait)
  })
})

describe('reform-qi-jixia-debate choices', () => {
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

describe('reform-qi-jixia-debate trigger', () => {
  it('triggers true when all conditions met', () => {
    const world = basePositiveWorld()
    const realm = world.realms.get('realm_qi')!
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(true)
  })

  it('triggers false when realm is not Qi', () => {
    const world = basePositiveWorld()
    const otherRealm = makeRealm({ id: 'realm_qin' })
    expect(evaluatePredicate(world, otherRealm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when ruler personality is conqueror (not in [builder, steward])', () => {
    const realm = makeRealm({ id: 'realm_qi' })
    const world = makeReformWorld({
      yearBC: 260,
      realm,
      ruler: makeRuler('realm_qi', 'conqueror'),
      reformer: makeReformer('realm_qi'),
      sites: [makeSite('site_linzi', 'realm_qi', 60000)],
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when population <= 50000', () => {
    const realm = makeRealm({ id: 'realm_qi' })
    const world = makeReformWorld({
      yearBC: 260,
      realm,
      ruler: makeRuler('realm_qi', 'builder'),
      reformer: makeReformer('realm_qi'),
      sites: [makeSite('site_linzi', 'realm_qi', 30000)],
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })

  it('triggers false when qi_jixia_reform_done trait already present', () => {
    const realm = makeRealm({ id: 'realm_qi', traits: ['qi_jixia_reform_done'] })
    const world = makeReformWorld({
      yearBC: 260,
      realm,
      ruler: makeRuler('realm_qi', 'builder'),
      reformer: makeReformer('realm_qi'),
      sites: [makeSite('site_linzi', 'realm_qi', 60000)],
    })
    expect(evaluatePredicate(world, realm, parsedReform.trigger)).toBe(false)
  })
})
