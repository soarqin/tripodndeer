import { describe, expect, it } from 'vitest'

import { SPECIALTY_DISPLAY_NAMES_ZH, getSpecialtyDisplayName } from '../specialty-display-names'
import type { Specialty } from '~/shared/types/character'

const SPECIALTIES: readonly Specialty[] = [
  'commander',
  'warrior',
  'strategist',
  'administrator',
  'reformer',
  'diplomat',
  'spy',
  'scholar',
  'engineer',
]

describe('SPECIALTY_DISPLAY_NAMES_ZH', () => {
  it('covers all specialty values with non-empty Chinese names', () => {
    for (const specialty of SPECIALTIES) {
      expect(SPECIALTY_DISPLAY_NAMES_ZH[specialty]).toBeTruthy()
      expect(SPECIALTY_DISPLAY_NAMES_ZH[specialty]).toMatch(/\S/)
    }
  })

  it('returns non-empty Chinese names from helper', () => {
    for (const specialty of SPECIALTIES) {
      expect(getSpecialtyDisplayName(specialty)).toBeTruthy()
      expect(getSpecialtyDisplayName(specialty)).toMatch(/\S/)
    }
  })

  it('uses the expected Chinese display names', () => {
    expect(SPECIALTY_DISPLAY_NAMES_ZH.commander).toBe('统帅')
    expect(SPECIALTY_DISPLAY_NAMES_ZH.warrior).toBe('猛将')
    expect(SPECIALTY_DISPLAY_NAMES_ZH.strategist).toBe('谋士')
    expect(SPECIALTY_DISPLAY_NAMES_ZH.administrator).toBe('吏才')
    expect(SPECIALTY_DISPLAY_NAMES_ZH.reformer).toBe('革新者')
    expect(SPECIALTY_DISPLAY_NAMES_ZH.diplomat).toBe('辩士')
    expect(SPECIALTY_DISPLAY_NAMES_ZH.spy).toBe('间者')
    expect(SPECIALTY_DISPLAY_NAMES_ZH.scholar).toBe('学者')
    expect(SPECIALTY_DISPLAY_NAMES_ZH.engineer).toBe('工师')
  })
})
