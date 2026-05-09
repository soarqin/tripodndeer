import { describe, expect, it } from 'vitest'

import {
  CODEX_BROKEN_LINK_TOOLTIP,
  CODEX_EMPTY_SEARCH_RESULTS,
  CODEX_EMPTY_STATE_M1_CHARACTERS,
} from '../empty-state-messages'

describe('codex empty-state messages', () => {
  it('exports non-empty Chinese strings', () => {
    for (const message of [
      CODEX_EMPTY_STATE_M1_CHARACTERS,
      CODEX_EMPTY_SEARCH_RESULTS,
      CODEX_BROKEN_LINK_TOOLTIP,
    ]) {
      expect(message).toMatch(/\S/)
    }
  })

  it('uses the expected M1 character hint text', () => {
    expect(CODEX_EMPTY_STATE_M1_CHARACTERS).toContain('战国雄')
  })

  it('keeps the search and broken-link messages non-empty', () => {
    expect(CODEX_EMPTY_SEARCH_RESULTS).toMatch(/\S/)
    expect(CODEX_BROKEN_LINK_TOOLTIP).toMatch(/\S/)
  })
})
