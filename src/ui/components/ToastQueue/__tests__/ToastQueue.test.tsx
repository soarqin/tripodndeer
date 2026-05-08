import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastQueue } from '../ToastQueue'
import { useGameStore } from '~/ui/store'

describe('ToastQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useGameStore.setState({ toastQueue: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when queue is empty', () => {
    const { container } = render(<ToastQueue />)
    expect(container.firstChild).toBeNull()
  })

  it('renders toasts and limits to 5', () => {
    render(<ToastQueue />)
    
    act(() => {
      for (let i = 1; i <= 6; i++) {
        useGameStore.getState().enqueueToast(`Toast ${i}`)
      }
    })

    const queue = useGameStore.getState().toastQueue
    expect(queue.length).toBe(5)
    expect(queue[0]?.text).toBe('Toast 2')
    expect(queue[4]?.text).toBe('Toast 6')

    expect(screen.getByTestId('toast-queue')).toBeDefined()
    expect(screen.queryByText('Toast 1')).toBeNull()
    expect(screen.getByText('Toast 2')).toBeDefined()
    expect(screen.getByText('Toast 6')).toBeDefined()
  })

  it('dismisses toast on click', () => {
    render(<ToastQueue />)
    
    act(() => {
      useGameStore.getState().enqueueToast('Click me')
    })

    const toast = screen.getByText('Click me')
    act(() => {
      toast.click()
    })

    expect(useGameStore.getState().toastQueue.length).toBe(0)
    expect(screen.queryByText('Click me')).toBeNull()
  })

  it('auto-dismisses toast after duration', () => {
    render(<ToastQueue />)
    
    act(() => {
      useGameStore.getState().enqueueToast('Auto dismiss', 10000)
    })

    expect(screen.getByText('Auto dismiss')).toBeDefined()

    act(() => {
      vi.advanceTimersByTime(10500)
    })

    expect(useGameStore.getState().toastQueue.length).toBe(0)
    expect(screen.queryByText('Auto dismiss')).toBeNull()
  })
})
