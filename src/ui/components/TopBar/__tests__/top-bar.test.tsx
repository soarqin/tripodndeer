import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopBar } from '../TopBar'
import { INITIAL_DATE } from '@/shared/constants'

const mockState = {
  world: {
    date: INITIAL_DATE,
    tick: 0,
    realms: new Map([
      [
        'realm_qin',
        {
          id: 'realm_qin',
          displayName: '秦',
          fullTitle: '秦国',
          color: '#111111',
          capital: 'site_1',
          initialSites: [],
          initialArmies: [],
          aiPersonality: 'aggressive_random',
        },
      ],
    ]),
    armies: new Map([
      [
        'army_1',
        {
          id: 'army_1',
          realmId: 'realm_qin',
          manpower: 100,
          location: 'site_1',
          state: 'idle',
          destination: null,
          ticksRemaining: 0,
          source: null,
        },
      ],
      [
        'army_2',
        {
          id: 'army_2',
          realmId: 'realm_qin',
          manpower: 50,
          location: 'site_2',
          state: 'idle',
          destination: null,
          ticksRemaining: 0,
          source: null,
        },
      ],
    ]),
    playerRealmId: 'realm_qin',
  },
}

vi.mock('@/ui/store/selectors', () => ({
  useWorldDate: () => INITIAL_DATE,
  useWorldTick: () => 0,
  useSpeed: () => 'pause',
  selectPlayerRealm: (state: typeof mockState) =>
    state.world.realms.get(state.world.playerRealmId) ?? null,
  selectAllPlayerArmies: (state: typeof mockState) =>
    [...state.world.armies.values()].filter(
      (army) => army.realmId === state.world.playerRealmId,
    ),
}))

vi.mock('@/ui/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}))

describe('TopBar', () => {
  it('renders realm name, manpower, date, localized speed, and localized tick label', () => {
    render(<TopBar />)
    expect(screen.getByText('秦 秦国')).toBeTruthy()
    expect(screen.getByText('总兵 150')).toBeTruthy()
    expect(screen.getByTestId('top-bar-date').textContent).toBe('公元前 453 年 春 上旬')

    const speed = screen.getByTestId('top-bar-speed')
    expect(speed.textContent).toContain('速度:')
    expect(speed.textContent).toContain('暂停')
    expect(screen.queryByText(/^pause$/)).toBeNull()

    const tick = screen.getByTestId('top-bar-tick-count')
    expect(tick.textContent).toBe('时步：0')
    expect(screen.queryByText(/^Tick:/)).toBeNull()
  })
})
