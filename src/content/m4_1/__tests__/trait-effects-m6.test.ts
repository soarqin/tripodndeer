import { describe, expect, it } from 'vitest'
import { TRAIT_EFFECT_REGISTRY, getTraitModifiers } from '../trait-effects'
import type { Realm } from '~/shared/types'

const IDEOLOGICAL_TRAITS = [
  'shang_yang_reform_done',
  'han_shen_buhai_done',
  'qi_jixia_reform_done',
  'chu_wu_qi_legacy_done',
] as const

const NON_IDEOLOGICAL_TRAITS = [
  'hu_fu_qi_she_done',
  'li_kui_reform_done',
  'wu_qi_failed_legacy',
  'reform_failed_scar',
] as const

function makeRealm(traits: readonly string[] = []): Realm {
  return {
    id: 'realm_qin',
    displayName: 'Qin',
    fullTitle: 'Qin',
    color: '#dc2626',
    capital: 'site_1',
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits,
    politicalSystem: 'enfeoffment',
  }
}

describe('M6 ideologyDeltaBp on TRAIT_EFFECT_REGISTRY', () => {
  it.each(IDEOLOGICAL_TRAITS)('%s contains ideologyDeltaBp', (traitKey) => {
    const effect = TRAIT_EFFECT_REGISTRY[traitKey]
    expect(effect).toBeDefined()
    expect(effect?.ideologyDeltaBp).toBeDefined()
  })

  it.each(NON_IDEOLOGICAL_TRAITS)('%s does NOT contain ideologyDeltaBp', (traitKey) => {
    const effect = TRAIT_EFFECT_REGISTRY[traitKey]
    expect(effect).toBeDefined()
    expect(effect?.ideologyDeltaBp).toBeUndefined()
  })

  it('shang_yang_reform_done has fa = 3000', () => {
    expect(TRAIT_EFFECT_REGISTRY.shang_yang_reform_done?.ideologyDeltaBp).toEqual({ fa: 3000 })
  })

  it('han_shen_buhai_done has fa = 3000', () => {
    expect(TRAIT_EFFECT_REGISTRY.han_shen_buhai_done?.ideologyDeltaBp).toEqual({ fa: 3000 })
  })

  it('qi_jixia_reform_done has ru = 2000 and dao = 1500', () => {
    expect(TRAIT_EFFECT_REGISTRY.qi_jixia_reform_done?.ideologyDeltaBp).toEqual({
      ru: 2000,
      dao: 1500,
    })
  })

  it('chu_wu_qi_legacy_done has fa = 2000', () => {
    expect(TRAIT_EFFECT_REGISTRY.chu_wu_qi_legacy_done?.ideologyDeltaBp).toEqual({ fa: 2000 })
  })
})

describe('getTraitModifiers ideologyDeltaBp accumulation', () => {
  it('returns no ideologyDeltaBp when no ideological traits are present', () => {
    const realm = makeRealm(['li_kui_reform_done', 'hu_fu_qi_she_done'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.ideologyDeltaBp).toBeUndefined()
  })

  it('returns ideologyDeltaBp for a single ideological trait', () => {
    const realm = makeRealm(['shang_yang_reform_done'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.ideologyDeltaBp).toEqual({ fa: 3000 })
  })

  it('accumulates ideologyDeltaBp across multiple ideological traits with same ideology', () => {
    const realm = makeRealm(['shang_yang_reform_done', 'han_shen_buhai_done'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.ideologyDeltaBp).toEqual({ fa: 6000 })
  })

  it('accumulates ideologyDeltaBp across multiple ideologies', () => {
    const realm = makeRealm(['qi_jixia_reform_done', 'chu_wu_qi_legacy_done'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.ideologyDeltaBp).toEqual({ ru: 2000, dao: 1500, fa: 2000 })
  })

  it('preserves all other modifier fields when ideology is added', () => {
    const realm = makeRealm(['shang_yang_reform_done'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.taxIncomeMultiplierBp).toBe(3000)
    expect(modifiers.manpowerCapMultiplierBp).toBe(2000)
    expect(modifiers.combatPowerMultiplierBp).toBe(1000)
    expect(modifiers.ideologyDeltaBp).toEqual({ fa: 3000 })
  })

  it('returns no ideologyDeltaBp when realm has only non-ideological traits and unknown trait', () => {
    const realm = makeRealm(['unknown_xyz', 'reform_failed_scar'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.ideologyDeltaBp).toBeUndefined()
  })
})
