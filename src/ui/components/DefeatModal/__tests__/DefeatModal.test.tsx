import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DefeatModalContent, buildDefeatModalPayload } from '../DefeatModal'
import { useGameStore, type GameStore } from '@/ui/store/game-store'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { Realm, Site, General, RulerState } from '~/shared/types'

vi.mock('@/ui/store/game-store', () => ({
  useGameStore: vi.fn(),
}))

describe('DefeatModalContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders narrative correctly', () => {
    const world = makeEmptyWorld({
      tick: 360, // 10 years
      playerRealmId: 'realm_qin',
    })
    
    const realms = new Map<string, Realm>([
      ['realm_qin', { id: 'realm_qin', displayName: '秦', capital: 'site_xianyang' } as Realm],
      ['realm_zhao', { id: 'realm_zhao', displayName: '赵', capital: 'site_handan' } as Realm],
    ])
    
    const sites = new Map<string, Site>([
      ['site_xianyang', { id: 'site_xianyang', ownerId: 'realm_zhao' } as Site],
    ])
    
    const generals = new Map<string, General>([
      ['gen_zhaoxiang', { id: 'gen_zhaoxiang', name: '嬴稷' } as General],
    ])
    
    const rulers = new Map<string, RulerState>([
      ['realm_qin', { generalId: 'gen_zhaoxiang' } as RulerState],
    ])
    
    world.realms = realms
    world.sites = sites
    world.generals = generals
    world.rulers = rulers

    vi.mocked(useGameStore).mockImplementation((selector) => selector({ world } as unknown as GameStore))

    render(<DefeatModalContent />)

    expect(screen.getByText('存续:')).toBeDefined()
    expect(screen.getByText('10 年')).toBeDefined()
    
    expect(screen.getByText('末代君主:')).toBeDefined()
    expect(screen.getByText('嬴稷')).toBeDefined()
    
    expect(screen.getByText('亡于:')).toBeDefined()
    expect(screen.getByText('赵')).toBeDefined()
  })
})

describe('buildDefeatModalPayload', () => {
  it('returns payload with 3 actions', () => {
    const onSpectate = vi.fn()
    const onLoadSave = vi.fn()
    const onExitToMenu = vi.fn()

    const payload = buildDefeatModalPayload(onSpectate, onLoadSave, onExitToMenu)

    expect(payload.title).toBe('亡国录')
    expect(payload.actions).toHaveLength(3)
    
    expect(payload.actions[0]?.label).toBe('观战')
    expect(payload.actions[1]?.label).toBe('逆转天命 (载入存档)')
    expect(payload.actions[2]?.label).toBe('退出至主菜单')
    
    payload.actions[0]?.onClick()
    expect(onSpectate).toHaveBeenCalled()
    
    payload.actions[1]?.onClick()
    expect(onLoadSave).toHaveBeenCalled()
    
    payload.actions[2]?.onClick()
    expect(onExitToMenu).toHaveBeenCalled()
  })
})
