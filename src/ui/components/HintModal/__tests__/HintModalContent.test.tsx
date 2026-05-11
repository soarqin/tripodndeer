import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HintModalContent } from '../HintModalContent'

describe('HintModalContent', () => {
  it('renders body text', () => {
    const { container } = render(React.createElement(HintModalContent, { body: '这是提示内容' }))
    expect(container.textContent).toContain('这是提示内容')
  })

  it('renders body with newlines', () => {
    const { container } = render(React.createElement(HintModalContent, { body: '第一段\n\n第二段' }))
    expect(container.textContent).toContain('第一段')
    expect(container.textContent).toContain('第二段')
  })
})
