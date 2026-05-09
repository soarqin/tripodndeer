import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { loadStaticEntries } from '../codex-data-loader'
import { renderMarkdown } from '../markdown-renderer'

describe('codex real content smoke test', () => {
  it('loads at least 25 static entries', () => {
    expect(loadStaticEntries().length).toBeGreaterThanOrEqual(25)
  })

  it('renders every static entry body without throwing', () => {
    const entries = loadStaticEntries()
    const entryIds = new Set(entries.map((entry) => entry.id))

    for (const entry of entries) {
      const { unmount } = render(
        React.createElement(React.Fragment, null, renderMarkdown(entry.body, { entryIds, onLinkClick: () => {} })),
      )
      unmount()
    }
  })

  it('keeps mechanic and history file names on the expected prefixes', () => {
    for (const entry of loadStaticEntries()) {
      if (entry.category === 'mechanics') {
        expect(entry.id).toMatch(/^mechanic-[a-z0-9-]+$/)
      } else if (entry.category === 'history') {
        expect(entry.id).toMatch(/^history-[a-z0-9-]+$/)
      }
    }
  })

  it('does not contain broken codex:// internal links', () => {
    const entries = loadStaticEntries()
    const entryIds = new Set(entries.map((entry) => entry.id))
    const linkPattern = /\[([^\]]+)\]\(codex:\/\/([^\)]+)\)/g

    for (const entry of entries) {
      for (const match of entry.body.matchAll(linkPattern)) {
        const targetId = match[2]
        expect(targetId).toBeTruthy()
        if (!targetId) continue
        expect(entryIds.has(targetId)).toBe(true)
      }
    }
  })
})
