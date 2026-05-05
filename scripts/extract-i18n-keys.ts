import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'

interface I18nKeyRef {
  readonly key: string
}

interface ChainStage {
  readonly id: string
  readonly text?: string | I18nKeyRef
  readonly choices?: readonly ChainChoice[]
}

interface ChainChoice {
  readonly id: string
  readonly label?: string | I18nKeyRef
  readonly text?: string | I18nKeyRef
}

interface EventChainJson {
  readonly id: string
  readonly stages: readonly ChainStage[]
}

const SCAN_DIRS = [
  'src/content/m6',
  'src/content/m7',
] as const

function isKeyRef(value: unknown): value is I18nKeyRef {
  return typeof value === 'object' && value !== null && 'key' in value && typeof (value as { key: unknown }).key === 'string'
}

function collectFromDir(dir: string): { extracted: Record<string, string>; missingKeys: string[] } {
  const extracted: Record<string, string> = {}
  const missingKeys: string[] = []
  const fullDir = resolve(process.cwd(), dir)
  if (!existsSync(fullDir)) return { extracted, missingKeys }

  for (const file of readdirSync(fullDir)) {
    if (!file.endsWith('.json')) continue
    const path = join(fullDir, file)
    const json = JSON.parse(readFileSync(path, 'utf-8')) as EventChainJson
    if (!json.id || !Array.isArray(json.stages)) continue

    for (const stage of json.stages) {
      if (typeof stage.text === 'string') {
        const key = `event.${json.id}.${stage.id}.text`
        extracted[key] = stage.text
      } else if (isKeyRef(stage.text)) {
        missingKeys.push(stage.text.key)
      }

      if (Array.isArray(stage.choices)) {
        for (const choice of stage.choices) {
          if (typeof choice.label === 'string' && choice.label.length > 30) {
            const key = `event.${json.id}.${stage.id}.choice.${choice.id}.label`
            extracted[key] = choice.label
          }
          if (typeof choice.text === 'string') {
            const key = `event.${json.id}.${stage.id}.choice.${choice.id}.text`
            extracted[key] = choice.text
          } else if (isKeyRef(choice.text)) {
            missingKeys.push(choice.text.key)
          }
        }
      }
    }
  }
  return { extracted, missingKeys }
}

function main(): void {
  const allExtracted: Record<string, string> = {}
  const allMissing = new Set<string>()
  for (const dir of SCAN_DIRS) {
    const { extracted, missingKeys } = collectFromDir(dir)
    Object.assign(allExtracted, extracted)
    for (const k of missingKeys) allMissing.add(k)
  }

  const localePath = resolve(process.cwd(), 'src/content/locales/zh-CN.json')
  const existing = existsSync(localePath)
    ? (JSON.parse(readFileSync(localePath, 'utf-8')) as Record<string, string>)
    : {}

  for (const k of allMissing) {
    if (!(k in existing) && !(k in allExtracted)) {
      console.warn(`[extract-i18n-keys] missing translation for key: ${k}`)
    }
  }

  const merged = { ...existing, ...allExtracted }
  const sortedKeys = Object.keys(merged).sort()
  const sorted: Record<string, string> = {}
  for (const k of sortedKeys) sorted[k] = merged[k]!

  if (process.argv.includes('--write')) {
    writeFileSync(localePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8')
    console.log(`[extract-i18n-keys] wrote ${sortedKeys.length} keys → ${localePath}`)
  } else {
    console.log(JSON.stringify(allExtracted, null, 2))
    console.log(`\n[extract-i18n-keys] dry-run: ${Object.keys(allExtracted).length} extractable strings, ${allMissing.size} key refs`)
    console.log(`[extract-i18n-keys] use --write to merge into ${localePath}`)
  }
}

main()
