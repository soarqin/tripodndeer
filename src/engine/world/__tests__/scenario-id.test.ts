import { describe, expect, it } from 'vitest'

import { createInitialWorld, createWorldFromM1Data, createWorldFromM9Data, loadM0Data, loadM1Data, loadM9Data } from '../factory'

describe('World.scenarioId factory wiring', () => {
  it('M0 initial factory sets scenarioId to m1', () => {
    const world = createInitialWorld(loadM0Data(), 42)

    expect(world.scenarioId).toBe('m1')
    expect(world.tutorialState).toBeNull()
  })

  it('M1 factory sets scenarioId to m1', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')

    expect(world.scenarioId).toBe('m1')
    expect(world.tutorialState).toBeNull()
  })

  it('M9 factory sets scenarioId to m9', async () => {
    const world = createWorldFromM9Data(await loadM9Data(), 42, 'realm_qin')

    expect(world.scenarioId).toBe('m9')
    expect(world.tutorialState).toBeNull()
  })
})
