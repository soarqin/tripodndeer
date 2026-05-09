import type { Specialty } from '~/shared/types/character'

export const SPECIALTY_DISPLAY_NAMES_ZH: Record<Specialty, string> = {
  commander: '统帅',
  warrior: '猛将',
  strategist: '谋士',
  administrator: '吏才',
  reformer: '革新者',
  diplomat: '辩士',
  spy: '间者',
  scholar: '学者',
  engineer: '工师',
}

export function getSpecialtyDisplayName(specialty: Specialty): string {
  return SPECIALTY_DISPLAY_NAMES_ZH[specialty]
}
