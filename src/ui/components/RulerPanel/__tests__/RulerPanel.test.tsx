import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { World } from '~/shared/types'

const mockState = {
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
    generals: new Map(),
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
  playerRealmId: 'realm_qin',
}

vi.mock('~/ui/store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}))

vi.mock('~/engine/systems/ruler/succession', () => ({
  selectHeir: () => null,
}))

import { RulerPanel } from '../RulerPanel'

describe('RulerPanel', () => {
  beforeEach(() => {
    mockState.world = {
      ...mockState.world,
      rulers: new Map([
        [
          'realm_qin',
          {
            realmId: 'realm_qin',
            generalId: 'gen_qin_ruler',
            age: 45,
            lifespan: 70,
            health: 88,
            personality: 'conqueror',
            personalityDims: {
              expansionDrive: 0.5,
              diplomaticTrust: 0.5,
              caution: 0.5,
              honor: 0.5,
              vindictiveness: 0.5,
              reformInclination: 0.5,
              patience: 0.5,
              preferredStrategy: 'diplomatic',
            },
            successionLawId: 'primogeniture',
            inOfficeSinceTick: 0,
          },
        ],
      ]),
      generals: new Map([
        [
          'gen_qin_ruler',
          {
            id: 'gen_qin_ruler',
            realmId: 'realm_qin',
            name: '嬴政',
            might: 90,
            command: 95,
            loyalty: 100,
            attrs: { wu: 80, zheng: 90, jiao: 60, mou: 85, xue: 40, po: 70 },
            specialty: 'commander',
          },
        ],
      ]),
    }
  })

  it('renders a multi-line personality tooltip from archetype data', () => {
    render(<RulerPanel />)

    const personality = screen.getByTestId('ruler-personality')
    const title = personality.getAttribute('title')

    expect(title).toContain('征服者')
    expect(title).toContain('决策权重')
    expect(title).toContain('×')
    expect(title).toContain('进攻')
    expect(personality.textContent).toBe('征服者')
  })
})
