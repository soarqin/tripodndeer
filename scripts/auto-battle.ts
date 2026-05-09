import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import { runAutoBattle, type AutoBattleConfig } from '~/engine/automation/auto-battle'

type CliArgMap = Partial<Record<'seed' | 'scenario' | 'difficulty' | 'ticks', string>> & {
  json?: boolean
}

interface CliIO {
  write: (value: string) => void
  error: (value: string) => void
}

interface ParsedAutoBattleArgs {
  config: AutoBattleConfig
  json: boolean
}

function parseArgs(argv: readonly string[]): ParsedAutoBattleArgs {
  const args: CliArgMap = {}

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]!

    if (value === '--json') {
      args.json = true
      continue
    }

    if (!value.startsWith('--')) continue

    const [flag, inlineValue] = value.slice(2).split('=', 2)
    const nextValue = inlineValue ?? argv[index + 1]

    if (nextValue === undefined || nextValue.startsWith('--')) continue

    if (flag === 'seed' || flag === 'scenario' || flag === 'difficulty' || flag === 'ticks') {
      args[flag] = nextValue
      if (inlineValue === undefined) index += 1
    }
  }

  return {
    json: args.json ?? false,
    config: {
      scenarioId: (args.scenario ?? 'm9') as AutoBattleConfig['scenarioId'],
      difficulty: (args.difficulty ?? 'hero') as AutoBattleConfig['difficulty'],
      seed: Number(args.seed ?? '42'),
      maxTicks: Number(args.ticks ?? '500'),
      stopCondition: 'unification',
    },
  }
}

function serializeResult(result: Awaited<ReturnType<typeof runAutoBattle>>) {
  return {
    winnerRealmId: result.winnerRealmId,
    endTick: result.endTick,
    finalRealmStats: Object.fromEntries(result.finalRealmStats.entries()),
  }
}

function formatHumanSummary(config: AutoBattleConfig, result: Awaited<ReturnType<typeof runAutoBattle>>): string {
  const lines = [
    'Auto battle complete',
    `Scenario: ${config.scenarioId}`,
    `Difficulty: ${config.difficulty}`,
    `Seed: ${config.seed}`,
    `Max ticks: ${config.maxTicks}`,
    `Stop condition: ${config.stopCondition}`,
    `End tick: ${result.endTick}`,
    `Winner: ${result.winnerRealmId ?? 'none'}`,
    'Final realm stats:',
  ]

  for (const [realmId, stats] of [...result.finalRealmStats.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`- ${realmId}: ${stats.sites} sites, ${stats.active ? 'active' : 'inactive'}`)
  }

  return `${lines.join('\n')}\n`
}

export async function runAutoBattleCli(argv = process.argv.slice(2), io: CliIO = { write: (value) => process.stdout.write(value), error: (value) => process.stderr.write(value) }): Promise<void> {
  try {
    const { config, json } = parseArgs(argv)
    const result = runAutoBattle(config)

    if (json) {
      io.write(`${JSON.stringify(serializeResult(result), null, 2)}\n`)
      return
    }

    io.write(formatHumanSummary(config, result))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    io.error(`${message}\n`)
    process.exitCode = 1
  }
}

const isMainModule = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isMainModule) {
  void runAutoBattleCli()
}
