import { describe, expect, it } from 'vitest'
import { loadStaticEntries } from '@/ui/components/CodexPanel/codex-data-loader'
import type { TutorialHintEntry } from '~/shared'
import { TUTORIAL_HINTS } from '../tutorial-hints'

describe('tutorial hint codex link validity', () => {
  it('all defined codexEntryIds resolve to valid codex entries', () => {
    const entries = loadStaticEntries()
    const entryIds = new Set(entries.map(entry => entry.id))
    const hintsWithCodex = TUTORIAL_HINTS.filter(
      (hint): hint is TutorialHintEntry & { codexEntryId: string } => hint.codexEntryId !== undefined,
    )

    if (hintsWithCodex.length === 0) {
      expect(true, 'all tutorial hints omit codex links').toBe(true)
      return
    }

    for (const hint of hintsWithCodex) {
      expect(
        entryIds.has(hint.codexEntryId),
        `stepId "${hint.stepId}" references codexEntryId "${hint.codexEntryId}" which does not exist in codex`,
      ).toBe(true)
    }
  })
})
