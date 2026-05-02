import type { Realm, TraitEffect, TraitModifiers } from '~/shared/types'

export const TRAIT_EFFECT_REGISTRY: Record<string, TraitEffect> = {
  shang_yang_reform_done: {
    manpowerCapMultiplierBp: 2000,
    taxIncomeMultiplierBp: 3000,
    recruitmentSpeedMultiplierBp: 1500,
    combatPowerMultiplierBp: 1000,
  },
  hu_fu_qi_she_done: {
    manpowerCapMultiplierBp: 1500,
    combatPowerMultiplierBp: 2000,
    recruitmentSpeedMultiplierBp: 1000,
  },
  li_kui_reform_done: {
    taxIncomeMultiplierBp: 2000,
    foodProductionMultiplierBp: 1500,
  },
  wu_qi_failed_legacy: {
    taxIncomeMultiplierBp: -500,
    manpowerCapMultiplierBp: -500,
  },
  chu_wu_qi_legacy_done: {
    taxIncomeMultiplierBp: 1500,
    manpowerCapMultiplierBp: 1000,
  },
  qi_jixia_reform_done: {
    generalRecruitmentWeightBp: 2000,
    taxIncomeMultiplierBp: 1000,
  },
  han_shen_buhai_done: {
    taxIncomeMultiplierBp: 1500,
    recruitmentSpeedMultiplierBp: 1000,
  },
  reform_failed_scar: {
    taxIncomeMultiplierBp: -1000,
    recruitmentSpeedMultiplierBp: -500,
  },
}

const ZERO_MODIFIERS: TraitModifiers = {
  manpowerCapMultiplierBp: 0,
  taxIncomeMultiplierBp: 0,
  foodProductionMultiplierBp: 0,
  recruitmentSpeedMultiplierBp: 0,
  generalRecruitmentWeightBp: 0,
  combatPowerMultiplierBp: 0,
}

export function getTraitModifiers(realm: Realm): TraitModifiers {
  let result: TraitModifiers = { ...ZERO_MODIFIERS }
  for (const trait of realm.traits) {
    const effect = TRAIT_EFFECT_REGISTRY[trait]
    if (!effect) continue
    result = {
      manpowerCapMultiplierBp: result.manpowerCapMultiplierBp + (effect.manpowerCapMultiplierBp ?? 0),
      taxIncomeMultiplierBp: result.taxIncomeMultiplierBp + (effect.taxIncomeMultiplierBp ?? 0),
      foodProductionMultiplierBp: result.foodProductionMultiplierBp + (effect.foodProductionMultiplierBp ?? 0),
      recruitmentSpeedMultiplierBp: result.recruitmentSpeedMultiplierBp + (effect.recruitmentSpeedMultiplierBp ?? 0),
      generalRecruitmentWeightBp: result.generalRecruitmentWeightBp + (effect.generalRecruitmentWeightBp ?? 0),
      combatPowerMultiplierBp: result.combatPowerMultiplierBp + (effect.combatPowerMultiplierBp ?? 0),
    }
  }
  return result
}
