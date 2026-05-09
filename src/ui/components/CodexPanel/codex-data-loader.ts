import type { World } from '~/shared/types'
import type { CharacterTemplate } from '~/shared/types/world'
import type { CodexEntry } from './codex-types'
import { SPECIALTY_DISPLAY_NAMES_ZH } from '~/content/codex/specialty-display-names'

type StaticMdModules = Readonly<Record<string, string>>

const zhCollator = new Intl.Collator('zh-CN')

function fileIdFromPath(filePath: string): string {
  const fileName = filePath.split('/').pop() ?? filePath
  return fileName.replace(/\.md$/, '')
}

function titleFromMarkdown(body: string, fallbackId: string): string {
  const firstLine = body.split(/\r?\n/, 1)[0] ?? ''
  const match = /^#\s+(.+)$/.exec(firstLine.trim())
  return match?.[1]?.trim() || fallbackId
}

function buildStaticEntries(modules: StaticMdModules): readonly CodexEntry[] {
  const entries = Object.entries(modules).map(([filePath, body]) => {
    const id = fileIdFromPath(filePath)
    const category = filePath.includes('/mechanics/') ? 'mechanics' : 'history'

    return {
      id,
      category,
      title: titleFromMarkdown(body, id),
      body,
    } satisfies CodexEntry
  })

  entries.sort((left, right) => left.id.localeCompare(right.id))
  return entries
}

function formatDeathYear(deathYearBC: number | null): string {
  return deathYearBC === null ? '不详' : `前 ${deathYearBC}`
}

function buildCharacterBody(template: CharacterTemplate): string {
  const aliasSuffix = template.aliases?.length ? `（字 ${template.aliases[0]}）` : ''
  const fallbackParagraph = template.historicalNotes.length < 50
    ? '\n\n此人物历史记载较少，详见相关史册。'
    : ''

  return [
    `# ${template.familyName} ${template.givenName}${aliasSuffix}`,
    '',
    `**生卒**：前 ${template.birthYearBC} ─ ${formatDeathYear(template.deathYearBC)}`,
    `**籍贯**：${template.birthplace}`,
    `**专长**：${SPECIALTY_DISPLAY_NAMES_ZH[template.specialty]}`,
    '',
    '**历史记述**：',
    '',
    template.historicalNotes,
    fallbackParagraph,
    '',
    `**属性**：武 ${template.attributes.wu} / 政 ${template.attributes.zheng} / 交 ${template.attributes.jiao} / 谋 ${template.attributes.mou} / 学 ${template.attributes.xue} / 魄 ${template.attributes.po}`,
  ].join('\n')
}

export function loadStaticEntriesFromModules(modules: StaticMdModules): readonly CodexEntry[] {
  return buildStaticEntries(modules)
}

export function loadStaticEntries(): readonly CodexEntry[] {
  const mechanicModules = import.meta.glob('/src/content/codex/mechanics/*.md', { as: 'raw', eager: true }) as StaticMdModules
  const historyModules = import.meta.glob('/src/content/codex/history/*.md', { as: 'raw', eager: true }) as StaticMdModules

  return buildStaticEntries({ ...mechanicModules, ...historyModules })
}

export function deriveCharacterEntries(world: World): readonly CodexEntry[] {
  const templates = [...world.characterTemplates.values()].sort((left, right) => {
    return zhCollator.compare(
      `${left.familyName}${left.givenName}`,
      `${right.familyName}${right.givenName}`,
    )
  })

  return templates.map((template) => ({
    id: `character-${template.id}`,
    category: 'characters',
    title: `${template.familyName} ${template.givenName}`,
    body: buildCharacterBody(template),
  }))
}
