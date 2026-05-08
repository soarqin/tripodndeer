import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { EventLogPanel } from '../EventLogPanel'
import { useGameStore } from '~/ui/store'

describe('EventLogPanel', () => {
  beforeEach(() => {
    useGameStore.setState({ eventLog: [] })
  })

  it('renders nothing when log is empty', () => {
    const { container } = render(<EventLogPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('renders log entries and limits to 200', () => {
    render(<EventLogPanel />)
    
    act(() => {
      for (let i = 1; i <= 201; i++) {
        useGameStore.getState().appendEventLog({
          id: `id-${i}`,
          tick: i,
          type: 'test',
          text: `Event ${i}`,
          createdAt: Date.now(),
        })
      }
    })

    const log = useGameStore.getState().eventLog
    expect(log.length).toBe(200)
    expect(log[0]?.text).toBe('Event 201')
    expect(log[199]?.text).toBe('Event 2')

    expect(screen.getByTestId('event-log-panel')).toBeDefined()
    expect(screen.queryByText('Event 1')).toBeNull()
    expect(screen.getByText('Event 201')).toBeDefined()
    expect(screen.getByText('Event 2')).toBeDefined()
  })

  it('clears log on button click', () => {
    render(<EventLogPanel />)
    
    act(() => {
      useGameStore.getState().appendEventLog({
        id: 'id-1',
        tick: 1,
        type: 'test',
        text: 'Event 1',
        createdAt: Date.now(),
      })
    })

    expect(screen.getByText('Event 1')).toBeDefined()

    const clearButton = screen.getByText('清空')
    act(() => {
      clearButton.click()
    })

    expect(useGameStore.getState().eventLog.length).toBe(0)
    expect(screen.queryByText('Event 1')).toBeNull()
  })
})
