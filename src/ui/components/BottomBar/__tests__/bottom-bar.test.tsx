import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BottomBar } from '../BottomBar'

describe('BottomBar', () => {
  it('renders 12 buttons', () => {
    render(<BottomBar />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(12)
  })

  it('11 buttons are enabled (not disabled)', () => {
    render(<BottomBar />)
    const buttons = screen.getAllByRole('button')
    const enabledButtons = buttons.filter(btn => !(btn as HTMLButtonElement).disabled)
    expect(enabledButtons).toHaveLength(11)
    expect(enabledButtons[0]?.textContent).toBe('王宫')
    expect(enabledButtons[1]?.textContent).toBe('军事')
    expect(enabledButtons[2]?.textContent).toBe('外交')
    expect(enabledButtons[3]?.textContent).toBe('内政')
    expect(enabledButtons[4]?.textContent).toBe('文化')
    expect(enabledButtons[5]?.textContent).toBe('谍报')
    expect(enabledButtons[6]?.textContent).toBe('人才')
    expect(enabledButtons[7]?.textContent).toBe('州郡')
    expect(enabledButtons[8]?.textContent).toBe('地区')
    expect(enabledButtons[9]?.textContent).toBe('名册')
    expect(enabledButtons[10]?.textContent).toBe('返回主菜单')
  })

  it('disabled buttons have aria-disabled="true"', () => {
    render(<BottomBar />)
    const disabledButtons = screen.getAllByRole('button').filter(btn => (btn as HTMLButtonElement).disabled)
    expect(disabledButtons).toHaveLength(1)
    disabledButtons.forEach(btn => {
      expect(btn.getAttribute('aria-disabled')).toBe('true')
    })
  })

  it('clicking 王宫 calls the onWanggong callback', () => {
    const onWanggong = vi.fn()
    render(<BottomBar onWanggong={onWanggong} />)
    const wanggongBtn = screen.getByTestId('bottom-bar-wanggong')
    fireEvent.click(wanggongBtn)
    expect(onWanggong).toHaveBeenCalledTimes(1)
  })

  it('clicking 军事 calls the onJunshi callback', () => {
    const onJunshi = vi.fn()
    render(<BottomBar onJunshi={onJunshi} />)
    const junshiBtn = screen.getByTestId('bottom-bar-junshi')
    fireEvent.click(junshiBtn)
    expect(onJunshi).toHaveBeenCalledTimes(1)
  })

  it('clicking 返回主菜单 calls the onBackToMenu callback', () => {
    const onBackToMenu = vi.fn()
    render(<BottomBar onBackToMenu={onBackToMenu} />)
    const backBtn = screen.getByTestId('back-to-menu-btn')
    fireEvent.click(backBtn)
    expect(onBackToMenu).toHaveBeenCalledTimes(1)
  })
})
