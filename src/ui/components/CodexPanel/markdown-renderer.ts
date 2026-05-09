import React from 'react'

type ListMarker = '-' | '*'

type RenderMarkdownProps = {
  entryIds?: ReadonlySet<string>
  onLinkClick?: (id: string) => void
}

function parseInline(
  source: string,
  keyPrefix: string,
  props?: RenderMarkdownProps,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let cursor = 0
  let nodeIndex = 0
  const linkPattern = /\[([^\]]+)\]\(([^)]*)\)/g

  while (cursor < source.length) {
    linkPattern.lastIndex = cursor
    const linkMatch = linkPattern.exec(source)
    const start = source.indexOf('**', cursor)
    const linkStart = linkMatch?.index ?? -1

    if (start === -1 && linkStart === -1) {
      nodes.push(source.slice(cursor))
      break
    }

    const useLink = linkStart !== -1 && (start === -1 || linkStart < start)

    if (useLink && linkMatch) {
      const fullMatch = linkMatch[0]
      const linkText = linkMatch[1]
      const url = linkMatch[2] ?? ''

      if (linkStart > cursor) {
        nodes.push(source.slice(cursor, linkStart))
      }

      if (url.startsWith('codex://')) {
        const entryId = url.slice('codex://'.length)
        if (props?.entryIds?.has(entryId)) {
          nodes.push(
            React.createElement(
              'a',
              {
                key: `${keyPrefix}-link-${nodeIndex}`,
                'data-codex-link': entryId,
                onClick: () => props?.onLinkClick?.(entryId),
              },
              linkText,
            ),
          )
        } else {
          nodes.push(
            React.createElement(
              'span',
              {
                key: `${keyPrefix}-broken-link-${nodeIndex}`,
                'data-codex-broken': 'true',
                title: '该条目不存在',
              },
              linkText,
            ),
          )
        }
      } else {
        nodes.push(fullMatch)
      }

      nodeIndex += 1
      cursor = linkStart + fullMatch.length
      continue
    }

    if (start === -1) {
      nodes.push(source.slice(cursor))
      break
    }

    const end = source.indexOf('**', start + 2)
    if (end === -1) {
      nodes.push(source.slice(cursor))
      break
    }

    if (start > cursor) {
      nodes.push(source.slice(cursor, start))
    }

    nodes.push(
      React.createElement(
        'strong',
        { key: `${keyPrefix}-strong-${nodeIndex}` },
        source.slice(start + 2, end),
      ),
    )
    nodeIndex += 1
    cursor = end + 2
  }

  return nodes
}

function listMarkerFor(line: string): ListMarker | null {
  if (line.startsWith('- ')) return '-'
  if (line.startsWith('* ')) return '*'
  return null
}

export function renderMarkdown(
  source: string,
  props?: RenderMarkdownProps,
): React.ReactNode {
  if (!source.trim()) return []

  const lines = source.split('\n')
  const elements: React.ReactNode[] = []
  let keyCounter = 0
  let index = 0

  const nextKey = (prefix: string) => {
    const key = `${prefix}-${keyCounter}`
    keyCounter += 1
    return key
  }

  const appendParagraph = (paragraphLines: string[]) => {
    if (paragraphLines.length === 0) return
    const key = nextKey('p')
    elements.push(
      React.createElement('p', { key }, parseInline(paragraphLines.join(' '), key, props)),
    )
  }

  while (index < lines.length) {
    const line = lines[index] ?? ''

    if (!line.trim()) {
      index += 1
      continue
    }

    if (line.startsWith('### ')) {
      const key = nextKey('h3')
      elements.push(React.createElement('h3', { key }, parseInline(line.slice(4), key, props)))
      index += 1
      continue
    }

    if (line.startsWith('## ')) {
      const key = nextKey('h2')
      elements.push(React.createElement('h2', { key }, parseInline(line.slice(3), key, props)))
      index += 1
      continue
    }

    if (line.startsWith('# ')) {
      const key = nextKey('h1')
      elements.push(React.createElement('h1', { key }, parseInline(line.slice(2), key, props)))
      index += 1
      continue
    }

    const marker = listMarkerFor(line)
    if (marker !== null) {
      const listItems: React.ReactNode[] = []
      while (index < lines.length) {
        const itemLine = lines[index] ?? ''
        if (listMarkerFor(itemLine) !== marker) break

        const itemKey = nextKey('li')
        listItems.push(
          React.createElement('li', { key: itemKey }, parseInline(itemLine.slice(2), itemKey, props)),
        )
        index += 1
      }

      elements.push(React.createElement('ul', { key: nextKey('ul') }, listItems))
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const paragraphLine = lines[index] ?? ''
      if (!paragraphLine.trim()) break
      if (
        paragraphLine.startsWith('# ') ||
        paragraphLine.startsWith('## ') ||
        paragraphLine.startsWith('### ') ||
        listMarkerFor(paragraphLine) !== null
      ) {
        break
      }
      paragraphLines.push(paragraphLine)
      index += 1
    }

    appendParagraph(paragraphLines)
  }

  return elements
}
