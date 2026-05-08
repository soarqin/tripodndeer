import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProvinceBrowserPanel } from '../ProvinceBrowserPanel'
import { useGameStore } from '~/ui/store'
import type { World } from '~/shared/types'

describe('ProvinceBrowserPanel', () => {
  beforeEach(() => {
    useGameStore.setState({
      activePanel: 'province-browser',
      world: {
        provinces: new Map(),
        regions: new Map(),
        realms: new Map(),
        sites: new Map(),
      } as unknown as World,
    })
  })

  it('renders empty state when provinces map is empty (M1)', () => {
    render(<ProvinceBrowserPanel />)
    expect(screen.getByTestId('province-empty-state').textContent).toContain('当前剧本未提供州郡数据')
  })

  it('renders province cards when data exists (M9)', () => {
    useGameStore.setState({
      world: {
        provinces: new Map([
          [
            'prov_1',
            {
              id: 'prov_1',
              name: 'Hanzhong',
              regionId: 'reg_1',
              realmId: 'realm_qin',
              siteIds: ['site_1', 'site_2'],
              historicalNotes: '',
            },
          ],
        ]),
        regions: new Map([
          ['reg_1', { id: 'reg_1', name: 'Guanzhong', provinceIds: ['prov_1'] }],
        ]),
        realms: new Map([
          ['realm_qin', { id: 'realm_qin', name: 'Qin' }],
        ]),
        sites: new Map([
          ['site_1', { id: 'site_1', name: 'Nanzheng' }],
          ['site_2', { id: 'site_2', name: 'Chenggu' }],
        ]),
      } as unknown as World,
    })

    render(<ProvinceBrowserPanel />)
    
    expect(screen.queryByTestId('province-empty-state')).toBeNull()
    
    const card = screen.getByTestId('province-card-prov_1')
    expect(card).toBeDefined()
    expect(card.textContent).toContain('Hanzhong')
    expect(card.textContent).toContain('Guanzhong')
    expect(card.textContent).toContain('Qin')
    expect(card.textContent).toContain('2 邑')
    
    expect(screen.queryByTestId('province-detail')).toBeNull()
    
    fireEvent.click(card)
    
    const detail = screen.getByTestId('province-detail')
    expect(detail).toBeDefined()
    expect(detail.textContent).toContain('Nanzheng')
    expect(detail.textContent).toContain('Chenggu')
  })
})
