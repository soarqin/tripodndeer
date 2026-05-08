import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { Portrait } from '../Portrait'

describe('Portrait', () => {
  it('renders SVG element', () => {
    render(<Portrait name="张仪" realmId="realm_qin" />)
    const container = screen.getByTestId('portrait')
    expect(container.innerHTML).toContain('<svg')
  })

  it('uses correct size attribute', () => {
    render(<Portrait name="张仪" realmId="realm_qin" size={128} />)
    const container = screen.getByTestId('portrait')
    expect(container.innerHTML).toContain('width="128"')
    expect(container.innerHTML).toContain('height="128"')
    expect(container.style.width).toBe('128px')
    expect(container.style.height).toBe('128px')
  })
})
