import { test, expect } from '@playwright/test'

test.describe('M5 Modal Primitive', () => {
  test('Modal opens, shows dialog role, game pauses, confirm button closes it', async ({ page }) => {
    await page.goto('/?test-modal=basic')

    const modal = page.getByTestId('generic-modal')
    await expect(modal).toBeVisible()
    await expect(modal).toHaveAttribute('role', 'dialog')
    await expect(modal).toHaveAttribute('aria-modal', 'true')

    const pauseBtn = page.getByTestId('time-control-pause')
    await expect(pauseBtn).toHaveAttribute('aria-pressed', 'true')

    const confirmBtn = page.getByTestId('modal-action-confirm')
    await confirmBtn.click()

    await expect(modal).not.toBeVisible()
  })

  test('Tab key cycles focus within modal (keyboard trap)', async ({ page }) => {
    await page.goto('/')
    
    await page.getByTestId('trigger-test-modal').click()
    
    const modal = page.getByTestId('generic-modal')
    await expect(modal).toBeVisible()

    const confirmBtn = page.getByTestId('modal-action-confirm')
    
    await expect(confirmBtn).toBeFocused()

    await page.keyboard.press('Tab')
    
    await expect(confirmBtn).toBeFocused()
  })

  test('Esc closes dismissable modal, but NOT required modal', async ({ page }) => {
    await page.goto('/')
    
    await page.getByTestId('trigger-test-modal').click()
    
    const modal = page.getByTestId('generic-modal')
    await expect(modal).toBeVisible()

    await page.keyboard.press('Escape')
    
    await expect(modal).not.toBeVisible()

    await page.evaluate(() => {
      interface GameStore {
        openModal: (modal: unknown) => void
        closeModal: () => void
      }
      const w = window as Window & { __game: { store: { getState: () => GameStore } } }
      w.__game.store.getState().openModal({
        title: 'Required Modal',
        content: 'You must click confirm.',
        dismissable: false,
        actions: [
          {
            id: 'confirm',
            label: 'Confirm',
            onClick: () => {
              w.__game.store.getState().closeModal()
            }
          }
        ]
      })
    })

    await expect(modal).toBeVisible()

    await page.keyboard.press('Escape')
    
    await expect(modal).toBeVisible()

    await page.getByTestId('modal-backdrop').click({ position: { x: 10, y: 10 } })

    await expect(modal).toBeVisible()

    await page.getByTestId('modal-action-confirm').click()
    await expect(modal).not.toBeVisible()
  })
})
