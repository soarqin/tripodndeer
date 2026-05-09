import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { CodexPanel } from '../CodexPanel'
import { Modal } from '~/ui/components/Modal/Modal'
import { useGameStore } from '~/ui/store/game-store'
import { CODEX_EMPTY_STATE_M1_CHARACTERS, CODEX_EMPTY_SEARCH_RESULTS } from '~/content/codex/empty-state-messages'
import * as dataLoader from '../codex-data-loader'
import type { World } from '~/shared/types'

vi.mock('../codex-data-loader', () => ({
  loadStaticEntries: vi.fn(),
  deriveCharacterEntries: vi.fn()
}))

const dummyWorld = {
  characterTemplates: new Map()
} as unknown as World

describe('CodexPanel', () => {
  beforeEach(() => {
    useGameStore.setState({
      activePanel: null,
      selectedCodexEntryId: null,
      world: dummyWorld,
      modalQueue: [],
      codexPreviousClockSpeed: null,
    })
    
    vi.mocked(dataLoader.loadStaticEntries).mockReturnValue([
      { id: 'mech-1', category: 'mechanics', title: 'Combat', body: 'Combat rules' },
      { id: 'hist-1', category: 'history', title: 'Qin Dynasty', body: 'History of Qin' }
    ])
    
    vi.mocked(dataLoader.deriveCharacterEntries).mockReturnValue([
      { id: 'char-1', category: 'characters', title: 'Bai Qi', body: 'Great general' }
    ])
  })

  it('does not render when activePanel is not codex', () => {
    render(<CodexPanel />)
    expect(screen.queryByTestId('codex-panel')).toBeNull()
  })

  it('renders when activePanel is codex', () => {
    useGameStore.setState({ activePanel: 'codex' })
    render(<CodexPanel />)
    expect(screen.getByTestId('codex-panel')).toBeTruthy()
    expect(screen.getByTestId('codex-panel-title').textContent).toContain('史书百科')
  })

  it('closes panel when close button is clicked', () => {
    useGameStore.setState({ activePanel: 'codex' })
    render(<CodexPanel />)
    
    fireEvent.click(screen.getByTestId('codex-panel-close'))
    expect(useGameStore.getState().activePanel).toBeNull()
  })

  it('shows entries for selected category', () => {
    useGameStore.setState({ activePanel: 'codex' })
    render(<CodexPanel />)
    
    expect(screen.getByTestId('codex-entry-mech-1')).toBeTruthy()
    expect(screen.queryByTestId('codex-entry-hist-1')).toBeNull()
    
    fireEvent.click(screen.getByTestId('codex-category-history'))
    expect(screen.queryByTestId('codex-entry-mech-1')).toBeNull()
    expect(screen.getByTestId('codex-entry-hist-1')).toBeTruthy()
  })

  it('updates selectedCodexEntryId when entry is clicked', () => {
    useGameStore.setState({ activePanel: 'codex' })
    render(<CodexPanel />)
    
    fireEvent.click(screen.getByTestId('codex-entry-mech-1'))
    expect(useGameStore.getState().selectedCodexEntryId).toBe('mech-1')
  })

  it('filters entries by search query', () => {
    useGameStore.setState({ activePanel: 'codex' })
    render(<CodexPanel />)
    
    const input = screen.getByTestId('codex-search-input')
    fireEvent.change(input, { target: { value: 'combat' } })
    
    expect(screen.getByTestId('codex-entry-mech-1')).toBeTruthy()
    
    fireEvent.change(input, { target: { value: 'nonexistent' } })
    expect(screen.queryByTestId('codex-entry-mech-1')).toBeNull()
    expect(screen.getByTestId('codex-search-empty').textContent).toContain(CODEX_EMPTY_SEARCH_RESULTS)
  })

  it('clears search when category is switched', () => {
    useGameStore.setState({ activePanel: 'codex' })
    render(<CodexPanel />)
    
    const input = screen.getByTestId('codex-search-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'combat' } })
    expect(input.value).toBe('combat')
    
    fireEvent.click(screen.getByTestId('codex-category-history'))
    expect(input.value).toBe('')
  })

  it('shows M1 empty state when 0 character templates', () => {
    vi.mocked(dataLoader.deriveCharacterEntries).mockReturnValue([])
    useGameStore.setState({ activePanel: 'codex' })
    render(<CodexPanel />)
    
    fireEvent.click(screen.getByTestId('codex-category-characters'))
    expect(screen.getByTestId('codex-empty-state-m1').textContent).toContain(CODEX_EMPTY_STATE_M1_CHARACTERS)
  })

  it('shows entry content when selectedCodexEntryId is set', () => {
    useGameStore.setState({ activePanel: 'codex', selectedCodexEntryId: 'mech-1' })
    render(<CodexPanel />)
    
    expect(screen.getByTestId('codex-detail').textContent).toContain('Combat rules')
  })

  it('handles internal codex:// link click', () => {
    vi.mocked(dataLoader.loadStaticEntries).mockReturnValue([
      { id: 'mech-1', category: 'mechanics', title: 'Combat', body: 'See [History](codex://hist-1)' },
      { id: 'hist-1', category: 'history', title: 'Qin Dynasty', body: 'History of Qin' }
    ])
    
    useGameStore.setState({ activePanel: 'codex', selectedCodexEntryId: 'mech-1' })
    render(<CodexPanel />)
    
    const link = screen.getByText('History')
    fireEvent.click(link)

    expect(useGameStore.getState().selectedCodexEntryId).toBe('hist-1')
  })

  it('keeps Codex visible while a queued modal opens and closes', () => {
    useGameStore.setState({
      clockState: { speed: '4x', realTimeAccum: 0 },
      previousClockSpeed: '1x',
      codexPreviousClockSpeed: null,
      activePanel: null,
      selectedCodexEntryId: null,
      modalQueue: [],
    })

    act(() => {
      useGameStore.getState().openCodex('mech-1')
    })
    expect(useGameStore.getState().clockState.speed).toBe('pause')
    expect(useGameStore.getState().codexPreviousClockSpeed).toBe('4x')

    act(() => {
      useGameStore.getState().openModal({
        title: '测试弹窗',
        content: React.createElement('div', null, 'modal'),
        actions: [],
      })
    })

    expect(useGameStore.getState().modalQueue).toHaveLength(1)

    render(
      <>
        <CodexPanel />
        <Modal title="测试弹窗" content={React.createElement('div', null, 'modal')} actions={[]} onClose={() => {}} />
      </>,
    )

    const codexPanel = screen.getByTestId('codex-panel')
    const modalBackdrop = screen.getByTestId('modal-backdrop')
    expect(codexPanel.compareDocumentPosition(modalBackdrop) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    act(() => {
      useGameStore.getState().closeModal()
    })
    expect(useGameStore.getState().modalQueue).toHaveLength(0)
    expect(screen.getByTestId('codex-panel')).toBeTruthy()
    expect(useGameStore.getState().clockState.speed).toBe('pause')

    act(() => {
      useGameStore.getState().closeCodex()
    })
    expect(useGameStore.getState().activePanel).toBeNull()
    expect(useGameStore.getState().selectedCodexEntryId).toBeNull()
    expect(useGameStore.getState().clockState.speed).toBe('4x')
  })
})
