import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CharacterBrowserPanel } from '../CharacterBrowserPanel'
import { useGameStore } from '~/ui/store'
import type { World } from '~/shared/types'

describe('CharacterBrowserPanel', () => {
  beforeEach(() => {
    useGameStore.setState({
      activePanel: 'character-browser',
      world: {
        generals: new Map(),
        characterTemplates: new Map(),
        realms: new Map(),
        sites: new Map(),
      } as unknown as World,
    })
  })

  it('renders empty state in history tab when templates map is empty (M1)', () => {
    render(<CharacterBrowserPanel />)
    
    const historyTab = screen.getByTestId('tab-history')
    fireEvent.click(historyTab)
    
    expect(screen.getByTestId('character-browser-empty-state').textContent).toContain('暂无历史名册数据')
  })

  it('renders character cards when data exists (M9)', () => {
    useGameStore.setState({
      world: {
        generals: new Map([
          [
            'gen_1',
            {
              id: 'gen_1',
              name: 'Bai Qi',
              realmId: 'realm_qin',
              specialty: 'military',
              attrs: { wu: 95, zheng: 50, jiao: 40, mou: 80, xue: 60, po: 90 },
            },
          ],
        ]),
        characterTemplates: new Map([
          [
            'char_1',
            {
              id: 'char_1',
              givenName: 'Qi',
              familyName: 'Bai',
              realmId: 'realm_qin',
              birthYearBC: 332,
              deathYearBC: 257,
              birthplace: 'site_xianyang',
              specialty: 'military',
              attributes: { wu: 95, zheng: 50, jiao: 40, mou: 80, xue: 60, po: 90 },
              historicalNotes: 'Famous general of Qin.',
              aliases: ['Wu An Jun'],
            },
          ],
        ]),
        realms: new Map([
          ['realm_qin', { id: 'realm_qin', displayName: 'Qin' }],
        ]),
        sites: new Map([
          ['site_xianyang', { id: 'site_xianyang', name: '咸阳' }],
        ]),
      } as unknown as World,
    })

    render(<CharacterBrowserPanel />)
    
    const aliveCard = screen.getByTestId('character-card-gen_1')
    expect(aliveCard).toBeDefined()
    expect(aliveCard.textContent).toContain('Bai Qi')
    expect(aliveCard.textContent).toContain('Qin')
    expect(aliveCard.textContent).toContain('military')
    
    expect(screen.queryByTestId('character-detail')).toBeNull()
    
    fireEvent.click(aliveCard)
    
    let detail = screen.getByTestId('character-detail')
    expect(detail).toBeDefined()
    expect(detail.textContent).toContain('武: 95')
    
    const historyTab = screen.getByTestId('tab-history')
    fireEvent.click(historyTab)
    
    expect(screen.queryByTestId('character-browser-empty-state')).toBeNull()
    
    const historyCard = screen.getByTestId('character-card-char_1')
    expect(historyCard).toBeDefined()
    expect(historyCard.textContent).toContain('BaiQi')
    expect(historyCard.textContent).toContain('Qin')
    expect(historyCard.textContent).toContain('332 ~ 257')
    
    fireEvent.click(historyCard)
    
    detail = screen.getByTestId('character-detail')
    expect(detail).toBeDefined()
    expect(detail.textContent).toContain('武: 95')
    expect(detail.textContent).toContain('Wu An Jun')
    expect(detail.textContent).toContain('Famous general of Qin.')
    expect(detail.textContent).toContain('出生地')
    expect(detail.textContent).toContain('咸阳')
  })
})
