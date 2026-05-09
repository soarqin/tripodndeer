#!/usr/bin/env tsx
/**
 * M8.3 batch auto-battle runner.
 * Usage: pnpm test:baseline [--limit=N] [--seed-start=N] [--output=path] [--maxTicks=N]
 */
import { writeFileSync } from 'node:fs'

import { runAutoBattleBatch, type BatchConfig } from '~/engine/automation/auto-battle-batch'
import { serializeReportToJson, toMarkdown } from '~/engine/automation/batch-report'

function parseArgs(): {
  limit: number
  seedStart: number
  output: string
  maxTicks: number
  difficulty: 'hero'
} {
  const args = process.argv.slice(2)
  let limit = 100
  let seedStart = 1
  let output = '.sisyphus/evidence/m8_3-baseline.json'
  let maxTicks = 7200

  for (const arg of args) {
    if (arg.startsWith('--limit=')) limit = Number.parseInt(arg.slice(8), 10)
    else if (arg.startsWith('--seed-start=')) seedStart = Number.parseInt(arg.slice(13), 10)
    else if (arg.startsWith('--output=')) output = arg.slice(9)
    else if (arg.startsWith('--maxTicks=')) maxTicks = Number.parseInt(arg.slice(11), 10)
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: pnpm test:baseline [--limit=N] [--seed-start=N] [--output=path] [--maxTicks=N]')
      console.log('Defaults: limit=100, seed-start=1, output=.sisyphus/evidence/m8_3-baseline.json, maxTicks=7200')
      process.exit(0)
    }
  }

  if (Number.isNaN(limit) || limit < 1) {
    console.error('Invalid --limit')
    process.exit(1)
  }

  if (Number.isNaN(seedStart) || seedStart < 0) {
    console.error('Invalid --seed-start')
    process.exit(1)
  }

  if (Number.isNaN(maxTicks) || maxTicks < 100) {
    console.error('Invalid --maxTicks (min 100)')
    process.exit(1)
  }

  return { limit, seedStart, output, maxTicks, difficulty: 'hero' }
}

async function main(): Promise<void> {
  const { limit, seedStart, output, maxTicks, difficulty } = parseArgs()

  console.log(`M8.3 Batch Run: limit=${limit}, seedStart=${seedStart}, maxTicks=${maxTicks}`)
  console.log(`Output: ${output}`)

  const config: BatchConfig = {
    scenarioId: 'm9',
    difficulty,
    seedStart,
    limit,
    maxTicks,
    stopCondition: 'unification',
    progressCallback: (state) => {
      const etaSec = Math.round(state.etaMs / 1000)
      console.log(
        `Game ${state.gamesCompleted}/${state.totalGames} complete` +
        ` (winner: ${state.lastWinner ?? 'none'}, ETA: ~${etaSec}s)`
      )
    },
  }

  const report = await runAutoBattleBatch(config)

  const json = serializeReportToJson(report)
  writeFileSync(output, json, 'utf-8')
  console.log(`\nJSON written to: ${output}`)

  const mdPath = output.replace(/\.json$/, '.md')
  writeFileSync(mdPath, toMarkdown(report), 'utf-8')
  console.log(`Markdown written to: ${mdPath}`)

  console.log(`\nSummary: ${report.meta.samples} games, unification rate: ${(report.outcomes.unificationRate * 100).toFixed(1)}%`)
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
