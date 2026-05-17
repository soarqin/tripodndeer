import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useSaveHotkey } from '../use-save-hotkey'

const openModal = vi.fn()
const closeModal = vi.fn()
const replaceWorldFromSave = vi.fn()
const enqueueToast = vi.fn()
let keydownHandler: ((event: KeyboardEvent) => void) | undefined
const addEventListener = window.addEventListener.bind(window)

vi.mock('@/ui/store', () => ({
  useGameStore: Object.assign(
    (selector: (state: {
      openModal: typeof openModal
      closeModal: typeof closeModal
      replaceWorldFromSave: typeof replaceWorldFromSave
      enqueueToast: typeof enqueueToast
    }) => unknown) => selector({ openModal, closeModal, replaceWorldFromSave, enqueueToast }),
    {
      getState: () => ({ openModal, closeModal, replaceWorldFromSave, enqueueToast }),
      setState: vi.fn(),
    },
  ),
}))

vi.mock('@/ui/store/persistence/slot-crud', async () => {
  const actual = await vi.importActual<typeof import('@/ui/store/persistence/slot-crud')>('@/ui/store/persistence/slot-crud')
  return {
    ...actual,
    listSlots: vi.fn(),
    loadSlot: vi.fn(),
  }
})

vi.mock('@/engine/world/save-dto', async () => {
  const actual = await vi.importActual<typeof import('@/engine/world/save-dto')>('@/engine/world/save-dto')
  return {
    ...actual,
    saveDtoToWorld: vi.fn(),
    saveDtoToHintState: vi.fn(),
  }
})

function Harness() {
  useSaveHotkey()

  return (
    <div>
      <input data-testid="hotkey-input" />
      <textarea data-testid="hotkey-textarea" />
    </div>
  )
}

describe('useSaveHotkey', () => {
  beforeEach(() => {
    openModal.mockReset()
    closeModal.mockReset()
    replaceWorldFromSave.mockReset()
    enqueueToast.mockReset()
    keydownHandler = undefined

    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'keydown') {
        keydownHandler = listener as (event: KeyboardEvent) => void
      }

      return addEventListener(type, listener as EventListener, options)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens confirmation modal on F9 with latest auto save', async () => {
    const { listSlots, loadSlot } = await import('@/ui/store/persistence/slot-crud')
    const { saveDtoToWorld, saveDtoToHintState } = await import('@/engine/world/save-dto')

    vi.mocked(listSlots).mockResolvedValue([
      { slotId: 'auto_1', name: '旧自动存档', createdAt: 1000, tick: 10, scenarioId: 'm1', playerRealmName: '秦' },
      { slotId: 'auto_7', name: '新自动存档', createdAt: 2000, tick: 20, scenarioId: 'm1', playerRealmName: '秦' },
    ])
    vi.mocked(loadSlot).mockResolvedValue({
      ok: true,
      value: {
        slotId: 'auto_7',
        dto: { schemaVersion: 6, world: {} } as never,
        metadata: { slotId: 'auto_7', name: '新自动存档', createdAt: 2000, tick: 20, scenarioId: 'm1', playerRealmName: '秦' },
      },
    })
    vi.mocked(saveDtoToWorld).mockReturnValue({ ok: true, value: { scenarioId: 'm1' } as never })
    vi.mocked(saveDtoToHintState).mockReturnValue({ seenHints: { hint_a: true }, hintsEnabled: true })

    render(<Harness />)

    keydownHandler?.({ key: 'F9', target: window, preventDefault: vi.fn() } as unknown as KeyboardEvent)

    await waitFor(() => expect(openModal).toHaveBeenCalledTimes(1))
    const payload = openModal.mock.calls[0][0]
    expect(payload.title).toBe('逆转天命')
    expect(payload.content).toContain(new Date(2000).toLocaleString())

    await payload.actions[0].onClick()

    expect(closeModal).toHaveBeenCalledTimes(1)
    expect(loadSlot).toHaveBeenCalledWith('auto_7')
    expect(replaceWorldFromSave).toHaveBeenCalled()
    expect(saveDtoToHintState).toHaveBeenCalled()
  })

  it('ignores F9 from text inputs', () => {
    render(<Harness />)

    keydownHandler?.({ key: 'F9', target: screen.getByTestId('hotkey-input') } as unknown as KeyboardEvent)
    keydownHandler?.({ key: 'F9', target: screen.getByTestId('hotkey-textarea') } as unknown as KeyboardEvent)

    expect(openModal).not.toHaveBeenCalled()
    expect(enqueueToast).not.toHaveBeenCalled()
  })

  it('shows toast when no auto slots exist', async () => {
    const { listSlots } = await import('@/ui/store/persistence/slot-crud')
    vi.mocked(listSlots).mockResolvedValue([
      { slotId: 'slot1', name: '手动存档', createdAt: 123, tick: 10, scenarioId: 'm1', playerRealmName: '秦' },
    ])

    render(<Harness />)

    keydownHandler?.({ key: 'F9', target: window, preventDefault: vi.fn() } as unknown as KeyboardEvent)

    await waitFor(() => expect(enqueueToast).toHaveBeenCalledTimes(1))
    expect(enqueueToast).toHaveBeenCalledWith('暂无自动存档', 3000)
    expect(openModal).not.toHaveBeenCalled()
  })
})
