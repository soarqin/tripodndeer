export type CodexCategory = 'mechanics' | 'history' | 'characters'

export interface CodexEntry {
  readonly id: string
  readonly category: CodexCategory
  readonly title: string
  readonly body: string
}

export type CodexEntryIndex = ReadonlyMap<string, CodexEntry>
