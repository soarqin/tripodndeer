import { describe, expect, it } from 'vitest'
import { HINTS } from '../hints'
import { loadStaticEntries } from '@/ui/components/CodexPanel/codex-data-loader'

describe('hint codex link validity', () => {
  it('all 10 codexEntryIds resolve to valid codex entries', () => {
    const entries = loadStaticEntries()
    const entryIds = new Set(entries.map(e => e.id))

    for (const hint of HINTS) {
      expect(
        entryIds.has(hint.codexEntryId),
        `hint "${hint.id}" references codexEntryId "${hint.codexEntryId}" which does not exist in codex`,
      ).toBe(true)
    }
  })
})
