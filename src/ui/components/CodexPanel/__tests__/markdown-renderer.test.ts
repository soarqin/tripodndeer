import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderMarkdown } from '../markdown-renderer'

function renderMarkdownInFragment(
  source: string,
  props?: Parameters<typeof renderMarkdown>[1],
) {
  return render(React.createElement(React.Fragment, null, renderMarkdown(source, props)))
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

  it('renders codex links as clickable anchors when entry exists', () => {
    const onLinkClick = vi.fn()
    const { container } = renderMarkdownInFragment('[条目](codex://entry-1)', {
      entryIds: new Set(['entry-1']),
      onLinkClick,
    })

    const link = container.querySelector('[data-codex-link="entry-1"]')
    expect(link?.textContent).toBe('条目')
    expect(link?.tagName).toBe('A')

    if (link) fireEvent.click(link)
    expect(onLinkClick).toHaveBeenCalledWith('entry-1')
  })

  it('renders unknown codex links as broken spans', () => {
    const { container } = renderMarkdownInFragment('[条目](codex://missing)')
    const broken = container.querySelector('[data-codex-broken="true"]')
    expect(broken?.tagName).toBe('SPAN')
    expect(broken?.getAttribute('title')).toBe('该条目不存在')
    expect(broken?.textContent).toBe('条目')
  })

  it('renders external links literally', () => {
    const { container } = renderMarkdownInFragment('[外链](https://example.com)')
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('[外链](https://example.com)')
  })

  it('renders empty link urls literally', () => {
    const { container } = renderMarkdownInFragment('[空]()')
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('[空]()')
  })

  it('renders malformed bracket text literally', () => {
    const { container } = renderMarkdownInFragment('[bracket(no-paren)')
    expect(container.querySelector('p')?.textContent).toBe('[bracket(no-paren)')
    expect(container.querySelector('a')).toBeNull()
  })

  it('renders incomplete h3 markers as paragraph text', () => {
    const { container } = renderMarkdownInFragment('###incomplete')
    expect(container.querySelector('h3')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('###incomplete')
  })

  it('renders single asterisks literally', () => {
    const { container } = renderMarkdownInFragment('*single')
    expect(container.querySelector('ul')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('*single')
  })

  it('treats leading newline content as a paragraph', () => {
    const { container } = renderMarkdownInFragment('\nleading-newline')
    expect(container.querySelector('p')?.textContent).toBe('leading-newline')
  })

  it('renders img payloads as literal escaped text', () => {
    const { container } = renderMarkdownInFragment('<img src=x onerror=alert(1)>')
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('<img src=x onerror=alert(1)>')
  })

  it('renders angle-bracket script payloads as literal text', () => {
    const { container } = renderMarkdownInFragment('<script>alert(1)</script>')
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('<script>alert(1)</script>')
  })

  it('preserves entity text literally', () => {
    const { container } = renderMarkdownInFragment('&lt;')
    expect(container.querySelector('p')?.textContent).toBe('&lt;')
  })
})
