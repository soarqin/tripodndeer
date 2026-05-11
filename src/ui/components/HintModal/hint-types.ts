// See .sisyphus/plans/m10-2.md § Locked Decisions for architectural contract.

export type HintId = string

export interface HintEntry {
  readonly id: HintId
  readonly title: string         // 1 line
  readonly body: string          // 3-5 sentences, plain text + \n\n line breaks (no markdown)
  readonly codexEntryId: string  // must exist in m10_1 codex entries
}
