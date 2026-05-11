import { describe, expect, it, vi } from 'vitest'
import { buildHintModalPayload } from '../buildHintModalPayload'
import { ModalPriority } from '@/ui/store/slices/ui-slice'
import type { HintEntry } from '../hint-types'

const mockEntry: HintEntry = {
  id: 'hint_reform',
  title: '变法',
  body: '变法是通过多阶段决策改变势力特质的机制。',
  codexEntryId: 'mechanic-reforms',
}

describe('buildHintModalPayload', () => {
  it('returns correct title', () => {
    const payload = buildHintModalPayload(mockEntry, vi.fn(), vi.fn())
    expect(payload.title).toBe('变法')
  })

  it('returns priority HINT_FIRST_ENCOUNTER (120)', () => {
    const payload = buildHintModalPayload(mockEntry, vi.fn(), vi.fn())
    expect(payload.priority).toBe(ModalPriority.HINT_FIRST_ENCOUNTER)
    expect(payload.priority).toBe(120)
  })

  it('returns dismissable=true', () => {
    const payload = buildHintModalPayload(mockEntry, vi.fn(), vi.fn())
    expect(payload.dismissable).toBe(true)
  })

  it('returns testId with entry id', () => {
    const payload = buildHintModalPayload(mockEntry, vi.fn(), vi.fn())
    expect(payload.testId).toBe('hint-modal-hint_reform')
  })

  it('actions has 2 items: dismiss and confirm', () => {
    const payload = buildHintModalPayload(mockEntry, vi.fn(), vi.fn())
    expect(payload.actions.length).toBe(2)
    expect(payload.actions[0]!.id).toBe('dismiss')
    expect(payload.actions[1]!.id).toBe('confirm')
  })

  it('dismiss action calls onDismiss', () => {
    const onDismiss = vi.fn()
    const payload = buildHintModalPayload(mockEntry, vi.fn(), onDismiss)
    payload.actions[0]!.onClick()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('confirm action calls onConfirm', () => {
    const onConfirm = vi.fn()
    const payload = buildHintModalPayload(mockEntry, onConfirm, vi.fn())
    payload.actions[1]!.onClick()
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('confirm action has primary=true', () => {
    const payload = buildHintModalPayload(mockEntry, vi.fn(), vi.fn())
    expect(payload.actions[1]!.primary).toBe(true)
  })
})
