import scenarioV1 from '@/content/m1/scenario.json'
import { describe, expect, it } from 'vitest'

import { M7_COVERAGE_TIER_1 } from '~/content/m2/balance'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { migrateScenarioV6ToV7 } from '~/engine/world/migrations/v6-to-v7'
import m6SaveV6 from '~/engine/world/migrations/__tests__/fixtures/m6-save-v6.json'
import { makeCoverageKey } from '~/shared/types'

describe('factory adjacency-aware intelligenceCoverage seeding', () => {
  it('M1 full scenario has at least one adjacent pair seeded with M7_COVERAGE_TIER_1', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const tier1Count = [...world.intelligenceCoverage.values()].filter(
      v => v === M7_COVERAGE_TIER_1,
    ).length
    expect(tier1Count).toBeGreaterThan(0)
  })

  it('M1 full scenario only seeds 0 or M7_COVERAGE_TIER_1 (no other values)', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    for (const value of world.intelligenceCoverage.values()) {
      expect([0, M7_COVERAGE_TIER_1]).toContain(value)
    }
  })

  it('factory and migration produce identical coverage Maps for M1 scenario', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const factoryCoverage = [...world.intelligenceCoverage.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )

    const v7 = migrateScenarioV6ToV7(scenarioV1)
    const migratedWorld = createWorldFromM1Data(v7, 42, 'realm_qin')
    const migratedCoverage = [...migratedWorld.intelligenceCoverage.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )

    expect(factoryCoverage).toEqual(migratedCoverage)
  })

  it('coverage is directional: qin→chu and chu→qin both seeded with same adjacency value', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const qinToChu = world.intelligenceCoverage.get(makeCoverageKey('realm_qin', 'realm_chu'))
    const chuToQin = world.intelligenceCoverage.get(makeCoverageKey('realm_chu', 'realm_qin'))

    expect(qinToChu).toBeDefined()
    expect(chuToQin).toBeDefined()
    expect(qinToChu).toBe(chuToQin)
  })

  it('V6 fixture (1 site, 3 realms) yields all-zero coverage (no adjacency)', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    const world = createWorldFromM1Data(v7, 42, 'realm_qin')

    expect(world.intelligenceCoverage.size).toBe(6)
    for (const value of world.intelligenceCoverage.values()) {
      expect(value).toBe(0)
    }
  })

  it('does not include self-coverage (qin→qin)', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    expect(world.intelligenceCoverage.has(makeCoverageKey('realm_qin', 'realm_qin'))).toBe(false)
  })

  it('produces 56 directional entries for the 8-realm M1 scenario', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    expect(world.intelligenceCoverage.size).toBe(56)
  })
})
