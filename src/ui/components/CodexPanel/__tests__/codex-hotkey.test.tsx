import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { useCodexHotkey } from '../codex-hotkey'

const openCodex = vi.fn()
const closeCodex = vi.fn()
let activePanel: string | null = null
let keydownHandler: ((event: KeyboardEvent) => void) | undefined
const addEventListener = window.addEventListener.bind(window)

vi.mock('~/ui/store/game-store', () => ({
  useGameStore: (selector: (state: {
    activePanel: string | null
    openCodex: typeof openCodex
    closeCodex: typeof closeCodex
  }) => unknown) => selector({ activePanel, openCodex, closeCodex }),
}))

function Harness() {
  useCodexHotkey()

  return (
    <div>
      <input data-testid="hotkey-input" />
      <textarea data-testid="hotkey-textarea" />
      <div data-testid="hotkey-editable" contentEditable />
    </div>
  )
}

describe('useCodexHotkey', () => {
  beforeEach(() => {
    activePanel = null
    openCodex.mockReset()
    closeCodex.mockReset()
    keydownHandler = undefined

    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'keydown') {
        keydownHandler = listener as (event: KeyboardEvent) => void
      }

      return addEventListener(type, listener as EventListener, options)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens codex on Shift+? when closed', () => {
    render(<Harness />)

    keydownHandler?.({ key: '?', shiftKey: true, target: window } as unknown as KeyboardEvent)

    expect(openCodex).toHaveBeenCalledTimes(1)
    expect(closeCodex).not.toHaveBeenCalled()
  })

  it('closes codex on Shift+? when already open', () => {
    activePanel = 'codex'
    render(<Harness />)

    keydownHandler?.({ key: '?', shiftKey: true, target: window } as unknown as KeyboardEvent)

    expect(closeCodex).toHaveBeenCalledTimes(1)
    expect(openCodex).not.toHaveBeenCalled()
  })

  it('ignores Shift+? from text inputs', () => {
    render(<Harness />)

    keydownHandler?.({ key: '?', shiftKey: true, target: screen.getByTestId('hotkey-input') } as unknown as KeyboardEvent)
    keydownHandler?.({ key: '?', shiftKey: true, target: screen.getByTestId('hotkey-textarea') } as unknown as KeyboardEvent)
    keydownHandler?.({ key: '?', shiftKey: true, target: screen.getByTestId('hotkey-editable') } as unknown as KeyboardEvent)

    expect(openCodex).not.toHaveBeenCalled()
    expect(closeCodex).not.toHaveBeenCalled()
  })

  it('removes listener on unmount', () => {
    const { unmount } = render(<Harness />)

    unmount()
    fireEvent.keyDown(window, { key: '?', shiftKey: true })

    expect(openCodex).not.toHaveBeenCalled()
    expect(closeCodex).not.toHaveBeenCalled()
  })
})
