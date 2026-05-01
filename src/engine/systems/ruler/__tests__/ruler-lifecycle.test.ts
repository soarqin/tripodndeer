import { describe, expect, it } from 'vitest'

import { rulerLifecyclePhase } from '../ruler-lifecycle'
import { makeTestWorld } from '~/engine/__tests__/world-test-fixtures'
import type { GameDate, RealmId, RulerState, World } from '~/shared/types'
import { M5_HEALTH_DECREASE_PER_YEAR } from '~/content/m2/balance'

const yearStart: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const midYear: GameDate = { yearBC: 260, season: 'summer', month: 2, xun: 'zhong' }
const rng = { seed: 42, counter: 0 }

function makeRuler(realmId: RealmId, overrides: Partial<RulerState> = {}): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}`,
    age: 40,
    lifespan: 65,
    health: 80,
    personality: 'steward',
    successionLawId: 'primogeniture',
    ...overrides,
  }
}

function worldWithRulers(rulers: readonly RulerState[], date: GameDate = yearStart): World {
  return makeTestWorld({
    date,
    rulers: new Map(rulers.map((ruler) => [ruler.realmId, ruler])),
  })
}

describe('rulerLifecyclePhase', () => {
  it('does nothing outside year start (xun=shang of season=spring, month=1)', () => {
    const ruler = makeRuler('realm_qin')
    const world = worldWithRulers([ruler], midYear)

    const result = rulerLifecyclePhase(world, rng)

    expect(result.world).toBe(world)
    expect(result.nextRng).toBe(rng)
    expect(result.events).toEqual([])
  })

  it('increments ruler age by 1 at year start', () => {
    const ruler = makeRuler('realm_qin', { age: 40 })
    const world = worldWithRulers([ruler])

    const result = rulerLifecyclePhase(world, rng)

    expect(result.world.rulers.get('realm_qin')?.age).toBe(41)
  })

  it('decreases ruler health by M5_HEALTH_DECREASE_PER_YEAR at year start', () => {
    const ruler = makeRuler('realm_qin', { health: 80 })
    const world = worldWithRulers([ruler])

    const result = rulerLifecyclePhase(world, rng)

    expect(result.world.rulers.get('realm_qin')?.health).toBe(80 - M5_HEALTH_DECREASE_PER_YEAR)
  })

  it('emits rulerDied event with cause=natural when age reaches lifespan', () => {
    const ruler = makeRuler('realm_qin', { age: 64, lifespan: 65, health: 50 })
    const world = worldWithRulers([ruler])

    const result = rulerLifecyclePhase(world, rng)

    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toEqual({
      type: 'rulerDied',
      payload: {
        realmId: 'realm_qin',
        generalId: 'general_realm_qin',
        cause: 'natural',
      },
    })
  })

  it('emits rulerDied event when health drops to or below death threshold', () => {
    const ruler = makeRuler('realm_qin', { age: 30, lifespan: 65, health: 1 })
    const world = worldWithRulers([ruler])

    const result = rulerLifecyclePhase(world, rng)

    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toEqual({
      type: 'rulerDied',
      payload: {
        realmId: 'realm_qin',
        generalId: 'general_realm_qin',
        cause: 'natural',
      },
    })
  })

  it('does NOT remove ruler from world.rulers when ruler dies (succession flow handles removal)', () => {
    const ruler = makeRuler('realm_qin', { age: 64, lifespan: 65, health: 50 })
    const world = worldWithRulers([ruler])

    const result = rulerLifecyclePhase(world, rng)

    expect(result.world.rulers.has('realm_qin')).toBe(true)
    expect(result.events).toHaveLength(1)
  })

  it('orders rulerDied events by realmId in dictionary order when multiple rulers die', () => {
    const rulers = [
      makeRuler('realm_zhao', { age: 64, lifespan: 65, health: 50 }),
      makeRuler('realm_chu', { age: 64, lifespan: 65, health: 50 }),
      makeRuler('realm_qin', { age: 64, lifespan: 65, health: 50 }),
    ]
    const world = worldWithRulers(rulers)

    const result = rulerLifecyclePhase(world, rng)

    expect(result.events.map((e) => (e as { payload: { realmId: string } }).payload.realmId)).toEqual([
      'realm_chu',
      'realm_qin',
      'realm_zhao',
    ])
  })

  it('does not emit rulerDied event when ruler is healthy and below lifespan', () => {
    const ruler = makeRuler('realm_qin', { age: 40, lifespan: 65, health: 80 })
    const world = worldWithRulers([ruler])

    const result = rulerLifecyclePhase(world, rng)

    expect(result.events).toEqual([])
    expect(result.world.rulers.get('realm_qin')?.age).toBe(41)
    expect(result.world.rulers.get('realm_qin')?.health).toBe(79)
  })

  it('returns the same RNG state by reference (no random consumed)', () => {
    const ruler = makeRuler('realm_qin')
    const world = worldWithRulers([ruler])

    const result = rulerLifecyclePhase(world, rng)

    expect(result.nextRng).toBe(rng)
  })

  it('produces deterministic results across repeated runs', () => {
    const rulers = [
      makeRuler('realm_qin', { age: 64, lifespan: 65, health: 1 }),
      makeRuler('realm_zhao'),
    ]
    const world = worldWithRulers(rulers)

    const first = rulerLifecyclePhase(world, rng)
    const second = rulerLifecyclePhase(world, rng)

    expect(first.events).toEqual(second.events)
    expect([...first.world.rulers.entries()]).toEqual([...second.world.rulers.entries()])
  })
})
