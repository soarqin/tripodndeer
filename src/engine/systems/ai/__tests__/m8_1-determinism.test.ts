import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { runTickPhases } from '~/engine/clock'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import type { World } from '~/shared/types'

const M1_SEED = 42
const PLAYER_REALM_ID = 'realm_qin'

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === 'undefined') return null
  if (typeof value !== 'object') return value
  if (value instanceof Map) {
    return [...value.entries()]
      .map(([key, entryValue]) => [String(key), canonicalize(entryValue)] as const)
      .sort(([left], [right]) => left.localeCompare(right))
  }
  if (value instanceof Set) {
    return [...value.values()]
      .map(canonicalize)
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
  }
  if (Array.isArray(value)) return value.map(canonicalize)

  const result: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) {
    if (key === 'phases') continue
    result[key] = canonicalize((value as Record<string, unknown>)[key])
  }
  return result
}

function hashWorld(world: World): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(world))).digest('hex')
}

function runTicks(seed: number, ticks: number): World {
  let world = createWorldFromM1Data(loadM1Data(), seed, PLAYER_REALM_ID)
  let currentRng = world.rngState

  for (let i = 0; i < ticks; i += 1) {
    const result = runTickPhases(world, currentRng)
    world = result.world
    currentRng = result.nextRng
  }

  return world
}

describe('post-M8.1 determinism', () => {
  it('M1 100-tick same seed produces byte-equal world hash', () => {
    const left = hashWorld(runTicks(M1_SEED, 100))
    const right = hashWorld(runTicks(M1_SEED, 100))

    expect(left).toBe(right)
  }, 120000)

  it('different seeds produce different results', () => {
    const left = hashWorld(runTicks(42, 10))
    const right = hashWorld(runTicks(43, 10))

    expect(left).not.toBe(right)
  })
})
