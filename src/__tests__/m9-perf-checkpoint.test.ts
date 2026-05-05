import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { runTickPhases } from '~/engine/clock'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import type { World } from '~/shared/types'

describe('M9 perf checkpoint', () => {
  it('100 ticks complete under 200ms p95 at 130 sites', () => {
    const world = createM9PerfCheckpointWorld()
    expect(world.sites.size).toBe(130)

    const times: number[] = []

    let currentWorld = world
    for (let i = 0; i < 100; i++) {
      const start = performance.now()
      const result = runTickPhases(currentWorld, currentWorld.rngState)
      times.push(performance.now() - start)
      currentWorld = result.world
    }

    times.sort((left, right) => left - right)
    const p50 = times[Math.floor(times.length * 0.5)]!
    const p95 = times[Math.floor(times.length * 0.95)]!
    const p99 = times[Math.floor(times.length * 0.99)]!

    const evidenceDir = path.resolve(process.cwd(), '.sisyphus/evidence/m9')
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true })
    fs.writeFileSync(
      path.join(evidenceDir, 'task-15-perf.json'),
      JSON.stringify({ sites: 130, p50, p95, p99, timestamp: new Date().toISOString() }, null, 2),
      'utf-8',
    )

    expect(
      p95,
      `M9 checkpoint p95 tick time ${p95.toFixed(2)}ms (p50 ${p50.toFixed(2)}ms, p99 ${p99.toFixed(2)}ms) should be < 200ms`,
    ).toBeLessThan(200)
  }, { timeout: 60000 })
})

function createM9PerfCheckpointWorld(): World {
  const baseWorld = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
  const sites = new Map(baseWorld.sites)
  const sourceSites = [...baseWorld.sites.values()].sort((left, right) => left.id.localeCompare(right.id))

  let cloneIndex = 0
  while (sites.size < 130) {
    const source = sourceSites[cloneIndex % sourceSites.length]!
    const siteId = `site_m9_perf_${String(cloneIndex + 1).padStart(3, '0')}`
    const offsetX = (cloneIndex % 8) * 4
    const offsetY = Math.floor(cloneIndex / 8) * 4

    sites.set(siteId, {
      ...source,
      id: siteId,
      name: `${source.name}·${cloneIndex + 1}`,
      position: [source.position[0] + offsetX, source.position[1] + offsetY] as const,
    })

    cloneIndex++
  }

  return { ...baseWorld, sites }
}
