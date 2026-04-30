/* eslint-disable max-lines-per-function */
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventBanner } from './EventBanner'
import { useGameStore } from '~/ui/store'

describe('EventBanner', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not render when no banner', () => {
    render(<EventBanner />)
    expect(screen.queryByTestId('event-banner')).toBeNull()
  })

  it('renders when banner is set', () => {
    act(() => {
      useGameStore.getState().showBanner('Test Banner')
    })
    render(<EventBanner />)
    expect(screen.getByTestId('event-banner')).toBeTruthy()
  })

  it('shows correct text', () => {
    act(() => {
      useGameStore.getState().showBanner('Test Banner Text')
    })
    render(<EventBanner />)
    expect(screen.getByTestId('event-banner').textContent).toBe('Test Banner Text')
  })

  it.each([
    ['siegeStarted', '围城开始'],
    ['peaceProposed', '提议议和'],
    ['passCaptured', '关隘易主'],
  ])('maps new event type %s to %s', (eventType, expectedText) => {
    act(() => {
      useGameStore.getState().showBanner(eventType)
    })

    render(<EventBanner />)

    expect(screen.getByTestId('event-banner').textContent).toBe(expectedText)
  })

  it('auto-hides after 3 seconds', () => {
    act(() => {
      useGameStore.getState().showBanner('Test Banner')
    })
    render(<EventBanner />)
    expect(screen.getByTestId('event-banner')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(3001)
    })

    expect(screen.queryByTestId('event-banner')).toBeNull()
  })

  it('player conquest event triggers banner (mock store with siteConquered event)', () => {
    act(() => {
      useGameStore.getState().showBanner('Site Conquered!')
    })
    render(<EventBanner />)
    expect(screen.getByTestId('event-banner').textContent).toBe('Site Conquered!')
    
    act(() => {
      vi.advanceTimersByTime(3001)
    })
    expect(screen.queryByTestId('event-banner')).toBeNull()
  })
})
