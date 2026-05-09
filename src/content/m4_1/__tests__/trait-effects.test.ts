import { describe, expect, it } from 'vitest'
import { TRAIT_EFFECT_REGISTRY, getTraitModifiers } from '../trait-effects'
import { TraitEffectSchema } from '~/shared/schemas'
import type { Realm } from '~/shared/types'

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

describe('TRAIT_EFFECT_REGISTRY', () => {
  it('all 8 traits parse against TraitEffectSchema', () => {
    const traitKeys = Object.keys(TRAIT_EFFECT_REGISTRY)
    expect(traitKeys).toHaveLength(8)
    for (const key of traitKeys) {
      const result = TraitEffectSchema.safeParse(TRAIT_EFFECT_REGISTRY[key])
      expect(result.success, `trait ${key} failed to parse`).toBe(true)
    }
  })

  it('contains all expected trait keys', () => {
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty('shang_yang_reform_done')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty('hu_fu_qi_she_done')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty('li_kui_reform_done')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty('wu_qi_failed_legacy')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty('chu_wu_qi_legacy_done')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty('qi_jixia_reform_done')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty('han_shen_buhai_done')
    expect(TRAIT_EFFECT_REGISTRY).toHaveProperty('reform_failed_scar')
  })

  it('all basis-point values are integers', () => {
    for (const [, effect] of Object.entries(TRAIT_EFFECT_REGISTRY)) {
      const values = Object.values(effect).filter((v): v is number => typeof v === 'number')
      for (const value of values) {
        expect(Number.isInteger(value)).toBe(true)
      }
      if (effect.ideologyDeltaBp) {
        for (const value of Object.values(effect.ideologyDeltaBp)) {
          expect(Number.isInteger(value)).toBe(true)
        }
      }
    }
  })
})

describe('getTraitModifiers', () => {
  it('returns all zeros for realm with no traits', () => {
    const realm = makeRealm([])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers).toEqual({
      manpowerCapMultiplierBp: 0,
      taxIncomeMultiplierBp: 0,
      foodProductionMultiplierBp: 0,
      recruitmentSpeedMultiplierBp: 0,
      generalRecruitmentWeightBp: 0,
      combatPowerMultiplierBp: 0,
      disasterResistanceMultiplierBp: 0,
      tradeIncomeMultiplierBp: 0,
      factionStabilityBonusBp: 0,
    })
  })

  it('accumulates disasterResistanceMultiplierBp from traits', () => {
    const realm = makeRealm(['hu_fu_qi_she_done'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.disasterResistanceMultiplierBp).toBe(1000)
  })

  it('accumulates tradeIncomeMultiplierBp from traits', () => {
    const realm = makeRealm(['shang_yang_reform_done'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.tradeIncomeMultiplierBp).toBe(1500)
  })

  it('accumulates factionStabilityBonusBp from traits', () => {
    const realm = makeRealm(['qi_jixia_reform_done'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.factionStabilityBonusBp).toBe(500)
  })

  it('returns single trait modifiers (shang_yang)', () => {
    const realm = makeRealm(['shang_yang_reform_done'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.taxIncomeMultiplierBp).toBe(3000)
    expect(modifiers.manpowerCapMultiplierBp).toBe(2000)
    expect(modifiers.recruitmentSpeedMultiplierBp).toBe(1500)
    expect(modifiers.combatPowerMultiplierBp).toBe(1000)
    expect(modifiers.foodProductionMultiplierBp).toBe(0)
    expect(modifiers.generalRecruitmentWeightBp).toBe(0)
  })

  it('accumulates multiple traits (shang_yang + reform_failed_scar)', () => {
    const realm = makeRealm(['shang_yang_reform_done', 'reform_failed_scar'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.taxIncomeMultiplierBp).toBe(3000 - 1000)
    expect(modifiers.recruitmentSpeedMultiplierBp).toBe(1500 - 500)
    expect(modifiers.manpowerCapMultiplierBp).toBe(2000)
    expect(modifiers.combatPowerMultiplierBp).toBe(1000)
  })

  it('skips unknown traits without error', () => {
    const realm = makeRealm(['unknown_trait_xyz', 'shang_yang_reform_done'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.taxIncomeMultiplierBp).toBe(3000)
    expect(modifiers.manpowerCapMultiplierBp).toBe(2000)
  })

  it('handles negative-only traits (wu_qi_failed_legacy)', () => {
    const realm = makeRealm(['wu_qi_failed_legacy'])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.taxIncomeMultiplierBp).toBe(-500)
    expect(modifiers.manpowerCapMultiplierBp).toBe(-500)
  })

  it('combines three traits (chu_wu_qi + hu_fu_qi_she + li_kui)', () => {
    const realm = makeRealm([
      'chu_wu_qi_legacy_done',
      'hu_fu_qi_she_done',
      'li_kui_reform_done',
    ])
    const modifiers = getTraitModifiers(realm)
    expect(modifiers.taxIncomeMultiplierBp).toBe(1500 + 2000)
    expect(modifiers.manpowerCapMultiplierBp).toBe(1000 + 1500)
    expect(modifiers.combatPowerMultiplierBp).toBe(2000)
    expect(modifiers.recruitmentSpeedMultiplierBp).toBe(1000)
    expect(modifiers.foodProductionMultiplierBp).toBe(1500)
  })
})
