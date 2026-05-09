import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '../markdown-renderer'

function renderMarkdownInFragment(source: string) {
  return render(React.createElement(React.Fragment, null, renderMarkdown(source)))
}

describe('renderMarkdown', () => {
  it('renders h1 headings', () => {
    const { container } = renderMarkdownInFragment('# 标题')
    expect(container.querySelector('h1')?.textContent).toBe('标题')
  })

  it('renders h2 headings', () => {
    const { container } = renderMarkdownInFragment('## 标题')
    expect(container.querySelector('h2')?.textContent).toBe('标题')
  })

  it('renders h3 headings', () => {
    const { container } = renderMarkdownInFragment('### 标题')
    expect(container.querySelector('h3')?.textContent).toBe('标题')
  })

  it('renders inline bold as strong', () => {
    const { container } = renderMarkdownInFragment('**粗体**')
    expect(container.querySelector('p')?.textContent).toBe('粗体')
    expect(container.querySelector('strong')?.textContent).toBe('粗体')
  })

  it('renders dash unordered lists', () => {
    const { container } = renderMarkdownInFragment('- 项目一\n- 项目二')
    const listItems = container.querySelectorAll('ul > li')
    expect(listItems).toHaveLength(2)
    expect(listItems[0]?.textContent).toBe('项目一')
    expect(listItems[1]?.textContent).toBe('项目二')
  })

  it('renders asterisk unordered lists', () => {
    const { container } = renderMarkdownInFragment('* 项目一\n* 项目二')
    const listItems = container.querySelectorAll('ul > li')
    expect(listItems).toHaveLength(2)
    expect(listItems[0]?.textContent).toBe('项目一')
    expect(listItems[1]?.textContent).toBe('项目二')
  })

  it('separates paragraphs on empty lines', () => {
    const { container } = renderMarkdownInFragment('第一段\n\n第二段')
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]?.textContent).toBe('第一段')
    expect(paragraphs[1]?.textContent).toBe('第二段')
  })

  it('renders malformed unclosed bold literally', () => {
    const { container } = renderMarkdownInFragment('**unclosed')
    expect(container.querySelector('p')?.textContent).toBe('**unclosed')
    expect(container.querySelector('strong')).toBeNull()
  })

  it('renders HTML input as literal text', () => {
    const { container } = renderMarkdownInFragment('<script>alert(1)</script>')
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('<script>alert(1)</script>')
  })

  it('does not parse italic asterisks', () => {
    const { container } = renderMarkdownInFragment('*italic*')
    expect(container.querySelector('p')?.textContent).toBe('*italic*')
    expect(container.querySelector('em')).toBeNull()
  })

  it('does not parse ordered lists', () => {
    const { container } = renderMarkdownInFragment('1. ordered')
    expect(container.querySelector('p')?.textContent).toBe('1. ordered')
    expect(container.querySelector('ol')).toBeNull()
    expect(container.querySelector('li')).toBeNull()
  })

  it('returns an empty array for empty input', () => {
    expect(renderMarkdown('')).toEqual([])
  })

  it('keeps non-list asterisks literal after an asterisk list', () => {
    const { container } = renderMarkdownInFragment('* 列表项\n\n这是 *单独* 字符')
    expect(container.querySelectorAll('ul > li')).toHaveLength(1)
    expect(container.querySelector('li')?.textContent).toBe('列表项')
    expect(container.querySelector('p')?.textContent).toBe('这是 *单独* 字符')
    expect(container.querySelector('em')).toBeNull()
  })

  it('renders mixed headings, paragraphs, and lists', () => {
    const { container } = renderMarkdownInFragment('# 标题\n\n这是**重点**段落\n\n- 一\n- 二')
    expect(container.querySelector('h1')?.textContent).toBe('标题')
    expect(container.querySelector('p')?.textContent).toBe('这是重点段落')
    expect(container.querySelector('strong')?.textContent).toBe('重点')
    expect(container.querySelectorAll('ul > li')).toHaveLength(2)
  })

  it('returns an empty array for whitespace-only input', () => {
    expect(renderMarkdown('  \n\t')).toEqual([])
  })
})
