import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '~/ui/store'
import type { World } from '~/shared/types'
import { CharacterPanel } from '../CharacterPanel'

describe('CharacterPanel', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
    useGameStore.setState({
      activePanel: 'rencai',
      playerRealmId: 'realm_qin',
      world: {
        date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
        tick: 0,
        sites: new Map(),
        realms: new Map(),
        armies: new Map(),
        edges: new Map(),
        wars: new Map(),
        peaceProposals: new Map(),
        relations: new Map(),
        diplomaticProposals: new Map(),
        treaties: new Map(),
        diplomacyHistory: [],
        coalitions: new Map(),
        zhouInvestiture: new Map(),
        generals: new Map([
          [
            'gen_1',
            {
              id: 'gen_1',
              realmId: 'realm_qin',
              name: '白起',
              might: 95,
              command: 90,
              loyalty: 80,
              attrs: { wu: 95, zheng: 50, jiao: 40, mou: 80, xue: 60, po: 90 },
              specialty: 'commander',
            },
          ],
        ]),
        rulers: new Map(),
        academies: new Map(),
        eventChainStates: new Map(),
        reformStates: new Map(),
        disasterStates: new Map(),
        tradeRoutes: new Map(),
        factionInfluences: new Map(),
        passes: new Map(),
        adjacencyEdges: new Map(),
        sieges: new Map(),
        edicts: new Map(),
        governorAssignments: new Map(),
        intelligenceCoverage: new Map(),
        spyMissions: new Map(),
        counterIntelStates: new Map(),
        provinces: new Map(),
        regions: new Map(),
        characterTemplates: new Map(),
        localization: new Map(),
        aiState: new Map(),
        difficulty: 'hero',
        diplomaticMemory: new Map(),
        playerRealmId: 'realm_qin',
        rngState: { seed: 42, counter: 0 },
        phases: [],
        pendingOrders: [],
      } as World,
    })
  })

  it('opens codex from a character card', () => {
    render(<CharacterPanel />)

    fireEvent.click(screen.getByTestId('character-panel-codex-link'))

    const state = useGameStore.getState()
    expect(state.activePanel).toBe('codex')
    expect(state.selectedCodexEntryId).toMatch(/^character-/)
  })
})
