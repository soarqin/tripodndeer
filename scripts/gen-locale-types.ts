import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const localeFile = resolve(process.cwd(), 'src/content/locales/zh-CN.json')
const outputFile = resolve(process.cwd(), 'src/shared/locale-keys.ts')

const locale = JSON.parse(readFileSync(localeFile, 'utf-8')) as Record<string, string>
const keys = Object.keys(locale)

let content: string
if (keys.length === 0) {
  content = `// Auto-generated from src/content/locales/zh-CN.json\n// Run: pnpm gen:locale-types\nexport type LocaleKey = never\n`
} else {
  const keyUnion = keys.map(k => `  | '${k}'`).join('\n')
  content = `// Auto-generated from src/content/locales/zh-CN.json\n// Run: pnpm gen:locale-types\nexport type LocaleKey =\n${keyUnion}\n`
}

writeFileSync(outputFile, content, 'utf-8')
console.log(`Generated ${keys.length} locale keys → ${outputFile}`)
