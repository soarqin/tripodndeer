import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DevAIPanel } from '../DevAIPanel'
import { useGameStore } from '~/ui/store'
import { createInitialWorld, loadM0Data } from '~/engine/world/factory'

describe('DevAIPanel', () => {
  const originalLocation = window.location

  beforeEach(() => {
    useGameStore.setState({ world: createInitialWorld(loadM0Data(), 42) })
    
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '' },
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
    vi.unstubAllEnvs()
  })

  it('returns null when no URL param is present', () => {
    vi.stubEnv('DEV', true)
    window.location.search = ''
    
    const { container } = render(<DevAIPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when DEV is false even with URL param', () => {
    vi.stubEnv('DEV', false)
    window.location.search = '?devAI=1'
    
    const { container } = render(<DevAIPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('renders panel when DEV is true and URL param is present', () => {
    vi.stubEnv('DEV', true)
    window.location.search = '?devAI=1'
    
    render(<DevAIPanel />)
    expect(screen.getByTestId('dev-ai-panel')).toBeDefined()
    expect(screen.getByText('Dev AI Panel')).toBeDefined()
    expect(screen.getByText('RNG State')).toBeDefined()
    expect(screen.getByText('Ruler Personalities')).toBeDefined()
  })
})
