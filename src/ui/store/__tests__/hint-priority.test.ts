import { describe, expect, it } from 'vitest'
import { ModalPriority } from '../slices/ui-slice'

describe('ModalPriority HINT_FIRST_ENCOUNTER', () => {
  it('HINT_FIRST_ENCOUNTER equals 120', () => {
    expect(ModalPriority.HINT_FIRST_ENCOUNTER).toBe(120)
  })

  it('HINT_FIRST_ENCOUNTER is greater than SUCCESSION_CRISIS', () => {
    expect(ModalPriority.HINT_FIRST_ENCOUNTER).toBeGreaterThan(ModalPriority.SUCCESSION_CRISIS)
  })

  it('HINT_FIRST_ENCOUNTER is greater than all other priorities', () => {
    const allOthers = [
      ModalPriority.SUCCESSION_CRISIS,
      ModalPriority.EVENT_CHAIN,
      ModalPriority.REFORM_PROMPT,
      ModalPriority.DISASTER_RELIEF,
      ModalPriority.GENERIC,
    ]
    for (const priority of allOthers) {
      expect(ModalPriority.HINT_FIRST_ENCOUNTER).toBeGreaterThan(priority)
    }
  })
})
