import { describe, expect, it, vi } from 'vitest'
import { buildTutorialHintPayload } from '../buildTutorialHintPayload'
import { ModalPriority } from '@/ui/store/slices/ui-slice'
import type { TutorialHintEntry } from '~/shared'

const mockHintWithCodex: TutorialHintEntry = {
  stepId: 'panel-tour',
  titleZH: '面板导览',
  bodyZH: '打开面板查看当前势力信息。',
  codexEntryId: 'mechanic-panel-tour',
}

const mockHintWithoutCodex: TutorialHintEntry = {
  stepId: 'declare-march',
  titleZH: '出征',
  bodyZH: '选择目标后发布行军命令。',
}

describe('buildTutorialHintPayload', () => {
  it('returns priority TUTORIAL_STEP (200)', () => {
    const payload = buildTutorialHintPayload(mockHintWithCodex, vi.fn(), vi.fn())
    expect(payload.priority).toBe(ModalPriority.TUTORIAL_STEP)
    expect(payload.priority).toBe(200)
  })

  it('returns 2 actions when codexEntryId exists', () => {
    const payload = buildTutorialHintPayload(mockHintWithCodex, vi.fn(), vi.fn())
    expect(payload.actions).toHaveLength(2)
    expect(payload.actions[0]!.id).toBe('dismiss')
    expect(payload.actions[1]!.id).toBe('confirm')
  })

  it('returns 1 action when codexEntryId is missing', () => {
    const payload = buildTutorialHintPayload(mockHintWithoutCodex, vi.fn(), vi.fn())
    expect(payload.actions).toHaveLength(1)
    expect(payload.actions[0]!.id).toBe('dismiss')
  })

  it('returns dismissable true and testId with stepId', () => {
    const payload = buildTutorialHintPayload(mockHintWithCodex, vi.fn(), vi.fn())
    expect(payload.dismissable).toBe(true)
    expect(payload.testId).toBe('tutorial-hint-modal-panel-tour')
  })
})
