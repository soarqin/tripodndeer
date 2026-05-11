import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TutorialCompleteModalContent, buildTutorialCompletePayload } from '../TutorialCompleteModal'

describe('TutorialCompleteModal', () => {
  it('renders with "教学完成" title and correct body', () => {
    render(<TutorialCompleteModalContent />)
    expect(screen.getByText(/恭喜完成秦灭巴蜀教学/)).toBeDefined()
    expect(screen.getByText(/5 步核心循环已全部走通/)).toBeDefined()
  })

  it('buildTutorialCompletePayload returns correct payload', () => {
    const onEnterMain = vi.fn()
    const onContinue = vi.fn()
    const payload = buildTutorialCompletePayload(onEnterMain, onContinue)

    expect(payload.title).toBe('教学完成！')
    expect(payload.dismissable).toBe(false)
    expect(payload.testId).toBe('tutorial-complete-modal')
    expect(payload.actions).toHaveLength(2)
  })

  it('"进入主剧本" button calls onEnterMain', () => {
    const onEnterMain = vi.fn()
    const onContinue = vi.fn()
    const payload = buildTutorialCompletePayload(onEnterMain, onContinue)

    const enterMainAction = payload.actions.find(a => a.id === 'enter-main')
    expect(enterMainAction).toBeDefined()
    expect(enterMainAction?.label).toBe('进入主剧本')
    expect(enterMainAction?.primary).toBe(true)
    expect(enterMainAction?.testId).toBe('tutorial-complete-enter-main')

    enterMainAction?.onClick()
    expect(onEnterMain).toHaveBeenCalled()
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('"继续探索" button calls onContinue', () => {
    const onEnterMain = vi.fn()
    const onContinue = vi.fn()
    const payload = buildTutorialCompletePayload(onEnterMain, onContinue)

    const continueAction = payload.actions.find(a => a.id === 'continue')
    expect(continueAction).toBeDefined()
    expect(continueAction?.label).toBe('继续探索')
    expect(continueAction?.primary).toBeFalsy()
    expect(continueAction?.testId).toBe('tutorial-complete-continue')

    continueAction?.onClick()
    expect(onContinue).toHaveBeenCalled()
    expect(onEnterMain).not.toHaveBeenCalled()
  })
})
