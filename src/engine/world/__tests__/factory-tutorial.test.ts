import { describe, expect, it } from 'vitest'

import { createWorldFromTutorialData } from '../factory'

describe('createWorldFromTutorialData', () => {
  it('returns a valid World with tutorial scenario data', () => {
    const world = createWorldFromTutorialData()
    expect(world).toBeDefined()
    expect(world.tick).toBe(0)
  })

  it('has exactly 10 sites', () => {
    const world = createWorldFromTutorialData()
    expect(world.sites.size).toBe(10)
  })

  it('has exactly 4 realms', () => {
    const world = createWorldFromTutorialData()
    expect(world.realms.size).toBe(4)
  })

  it('spawns exactly 6 generals from character templates', () => {
    const world = createWorldFromTutorialData()
    expect(world.generals.size).toBe(6)
  })

  it('sets scenarioId to "tutorial"', () => {
    const world = createWorldFromTutorialData()
    expect(world.scenarioId).toBe('tutorial')
  })

  it('forces difficulty to "weak"', () => {
    const world = createWorldFromTutorialData()
    expect(world.difficulty).toBe('weak')
  })

  it('initializes tutorialState (not null)', () => {
    const world = createWorldFromTutorialData()
    expect(world.tutorialState).not.toBeNull()
  })

  it('sets tutorialState.currentStep to "panel-tour"', () => {
    const world = createWorldFromTutorialData()
    expect(world.tutorialState?.currentStep).toBe('panel-tour')
  })

  it('initializes tutorialState Sets as empty', () => {
    const world = createWorldFromTutorialData()
    expect(world.tutorialState?.completedSteps.size).toBe(0)
    expect(world.tutorialState?.dismissedStepHints.size).toBe(0)
    expect(world.tutorialState?.panelsOpened.size).toBe(0)
  })

  it('sets tutorialState.timeoutHintShown to false', () => {
    const world = createWorldFromTutorialData()
    expect(world.tutorialState?.timeoutHintShown).toBe(false)
  })

  it('sets playerRealmId to "realm_qin_tutorial"', () => {
    const world = createWorldFromTutorialData()
    expect(world.playerRealmId).toBe('realm_qin_tutorial')
  })

  it('starts at 316 BC spring shang xun', () => {
    const world = createWorldFromTutorialData()
    expect(world.date).toEqual({ yearBC: 316, season: 'spring', month: 1, xun: 'shang' })
  })

  it('uses default seed 42 when opts.seed not provided', () => {
    const world = createWorldFromTutorialData()
    expect(world.rngState).toEqual({ seed: 42, counter: 0 })
  })

  it('honors opts.seed when provided', () => {
    const world = createWorldFromTutorialData({ seed: 1234 })
    expect(world.rngState).toEqual({ seed: 1234, counter: 0 })
  })

  it('attaches a phase pipeline', () => {
    const world = createWorldFromTutorialData()
    expect(world.phases.length).toBeGreaterThan(0)
  })

  it('contains all 4 expected realm IDs', () => {
    const world = createWorldFromTutorialData()
    expect(world.realms.has('realm_qin_tutorial')).toBe(true)
    expect(world.realms.has('realm_shu_tutorial')).toBe(true)
    expect(world.realms.has('realm_ba_tutorial')).toBe(true)
    expect(world.realms.has('realm_ju_tutorial')).toBe(true)
  })

  it('starts with empty combat / diplomatic collections', () => {
    const world = createWorldFromTutorialData()
    expect(world.wars.size).toBe(0)
    expect(world.peaceProposals.size).toBe(0)
    expect(world.sieges.size).toBe(0)
    expect(world.passes.size).toBe(0)
    expect(world.adjacencyEdges.size).toBe(0)
    expect(world.academies.size).toBe(0)
  })

  it('loads 2 armies from realm.initialArmies (Qin + Shu + Ba)', () => {
    const world = createWorldFromTutorialData()
    expect(world.armies.size).toBe(3)
    expect(world.armies.has('army_qin_tutorial_1')).toBe(true)
    expect(world.armies.has('army_shu_tutorial_1')).toBe(true)
    expect(world.armies.has('army_ba_tutorial_1')).toBe(true)
  })

  it('character templates are populated as Map', () => {
    const world = createWorldFromTutorialData()
    expect(world.characterTemplates.size).toBe(6)
    expect(world.characterTemplates.has('char_qin_huiwen_tutorial')).toBe(true)
    expect(world.characterTemplates.has('char_sima_cuo_tutorial')).toBe(true)
  })

  it('intelligenceCoverage is seeded for every realm pair', () => {
    const world = createWorldFromTutorialData()
    expect(world.intelligenceCoverage.size).toBe(4 * 3)
  })

  it('counterIntelStates seeded for every realm', () => {
    const world = createWorldFromTutorialData()
    expect(world.counterIntelStates.size).toBe(4)
  })
})
