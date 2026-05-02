import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecruitmentLog } from '../RecruitmentLog'
import { useGameStore } from '~/ui/store'
import { useGenerals } from '~/ui/store/selectors'
import { General } from '~/shared/types'

type StoreSelector = Parameters<typeof useGameStore>[0]
type StoreState = StoreSelector extends (state: infer S) => unknown ? S : never

vi.mock('~/ui/store', () => ({
  useGameStore: vi.fn(),
}))

vi.mock('~/ui/store/selectors', () => ({
  useGenerals: vi.fn(),
}))

describe('RecruitmentLog', () => {
  it('renders empty state when no recent recruits', () => {
    vi.mocked(useGameStore).mockImplementation((selector: StoreSelector) => {
      const state = {
        playerRealmId: 'realm_qin',
        world: { tick: 100 },
      } as StoreState
      return selector(state)
    })

    const generals = new Map<string, General>([
      [
        'gen_1',
        {
          id: 'gen_1',
          realmId: 'realm_qin',
          name: 'Old Gen',
          might: 50,
          command: 50,
          loyalty: 100,
          recruitedAtTick: 50, // Too old (100 - 50 > 9)
        },
      ],
      [
        'gen_2',
        {
          id: 'gen_2',
          realmId: 'realm_qin',
          name: 'No Tick Gen',
          might: 50,
          command: 50,
          loyalty: 100,
          // No recruitedAtTick
        },
      ],
      [
        'gen_3',
        {
          id: 'gen_3',
          realmId: 'realm_zhao',
          name: 'Other Realm Gen',
          might: 50,
          command: 50,
          loyalty: 100,
          recruitedAtTick: 95, // Recent but wrong realm
        },
      ],
    ])
    vi.mocked(useGenerals).mockReturnValue(generals)

    render(<RecruitmentLog />)

    expect(screen.getByTestId('recruitment-log')).toBeDefined()
    expect(screen.getByTestId('recruitment-log-empty').textContent).toBe('暂无近期招募')
  })

  it('renders up to 5 recent recruits sorted by recruitedAtTick descending', () => {
    vi.mocked(useGameStore).mockImplementation((selector: StoreSelector) => {
      const state = {
        playerRealmId: 'realm_qin',
        world: { tick: 100 },
      } as StoreState
      return selector(state)
    })

    const generals = new Map<string, General>()
    // Add 6 recent recruits
    for (let i = 1; i <= 6; i++) {
      generals.set(`gen_${i}`, {
        id: `gen_${i}`,
        realmId: 'realm_qin',
        name: `Gen ${i}`,
        might: 50 + i,
        command: 50,
        loyalty: 100,
        recruitedAtTick: 90 + i, // 91 to 96
        attrs: { wu: 50 + i, zheng: 40 + i, jiao: 10, mou: 10, xue: 10, po: 10 },
      })
    }

    vi.mocked(useGenerals).mockReturnValue(generals)

    render(<RecruitmentLog />)

    expect(screen.queryByTestId('recruitment-log-empty')).toBeNull()

    const entries = screen.getAllByTestId(/^recruitment-log-entry-/)
    expect(entries).toHaveLength(5) // Max 5

    // Should be sorted descending by recruitedAtTick (96, 95, 94, 93, 92)
    expect(entries[0]?.textContent).toContain('Gen 6')
    expect(entries[0]?.textContent).toContain('(武 56 政 46)')
    expect(entries[1]?.textContent).toContain('Gen 5')
    expect(entries[2]?.textContent).toContain('Gen 4')
    expect(entries[3]?.textContent).toContain('Gen 3')
    expect(entries[4]?.textContent).toContain('Gen 2')
  })
})
