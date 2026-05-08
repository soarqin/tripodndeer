import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RegionBrowserPanel } from '../RegionBrowserPanel'
import { useGameStore } from '~/ui/store'
import type { World } from '~/shared/types'

describe('RegionBrowserPanel', () => {
  beforeEach(() => {
    useGameStore.setState({
      activePanel: 'region-browser',
      world: {
        regions: new Map(),
        provinces: new Map(),
      } as unknown as World,
    })
  })

  it('renders empty state when regions map is empty (M1)', () => {
    render(<RegionBrowserPanel />)
    expect(screen.getByTestId('region-empty-state').textContent).toContain('当前剧本未提供地区数据')
  })

  it('renders region cards when data exists (M9)', () => {
    useGameStore.setState({
      world: {
        regions: new Map([
          [
            'reg_1',
            {
              id: 'reg_1',
              name: 'Guanzhong',
              description: 'Heartland of Qin',
              provinceIds: ['prov_1', 'prov_2'],
            },
          ],
        ]),
        provinces: new Map([
          ['prov_1', { id: 'prov_1', name: 'Hanzhong' }],
          ['prov_2', { id: 'prov_2', name: 'Longxi' }],
        ]),
      } as unknown as World,
    })

    render(<RegionBrowserPanel />)
    
    expect(screen.queryByTestId('region-empty-state')).toBeNull()
    
    const card = screen.getByTestId('region-card-reg_1')
    expect(card).toBeDefined()
    expect(card.textContent).toContain('Guanzhong')
    expect(card.textContent).toContain('Heartland of Qin')
    expect(card.textContent).toContain('2 州郡')
    
    expect(screen.queryByTestId('region-detail')).toBeNull()
    
    fireEvent.click(card)
    
    const detail = screen.getByTestId('region-detail')
    expect(detail).toBeDefined()
    expect(detail.textContent).toContain('Hanzhong')
    expect(detail.textContent).toContain('Longxi')
  })
})
