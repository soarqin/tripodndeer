import { describe, expect, it } from 'vitest'

import {
  advanceReformStage,
  applyReformChoice,
  completeReform,
} from '../stage-progression'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  General,
  Realm,
  ReformDefinition,
  ReformState,
  World,
} from '~/shared/types'

function makeRealm(overrides: Partial<Realm> = {}): Realm {
  return {
    id: 'realm_qin',
    displayName: 'Qin',
    fullTitle: 'Qin',
    color: '#ff0000',
    capital: 'site_qin_capital',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 5000, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

function makeReformer(overrides: Partial<General> = {}): General {
  return {
    id: 'gen_reformer',
    realmId: 'realm_qin',
    name: 'Reformer',
    might: 50,
    command: 50,
    loyalty: 80,
    specialty: 'reformer',
    ...overrides,
  }
}

function makeReformDef(): ReformDefinition {
  return {
    id: 'test_reform',
    displayName: 'Test Reform',
    displayNameZh: '测试变法',
    trigger: { kind: 'realm.id', value: 'realm_qin' },
    oneShot: true,
    stages: [
      {
        id: 'stage1',
        textZh: 'Stage 1 prompt',
        choices: [
          {
            id: 'continue_choice',
            labelZh: 'Continue',
            effects: [],
            nextStageId: 'stage2',
            outcome: 'continue',
          },
          {
            id: 'success_choice',
            labelZh: 'Succeed',
            effects: [],
            outcome: 'success',
          },
          {
            id: 'failure_choice',
            labelZh: 'Fail',
            effects: [],
            outcome: 'failure',
          },
        ],
        advanceAfterMonths: 12,
      },
      {
        id: 'stage2',
        textZh: 'Stage 2 prompt',
        choices: [
          {
            id: 'finish_success',
            labelZh: 'Finish',
            effects: [],
            outcome: 'success',
          },
        ],
        advanceAfterMonths: 12,
      },
    ],
    successTrait: 'shang_yang_reform_done',
    failureTrait: 'reform_failed_scar',
  }
}

function makeInitialState(overrides: Partial<ReformState> = {}): ReformState {
  return {
    realmId: 'realm_qin',
    reformId: 'test_reform',
    currentStageId: 'stage1',
    startedAtTick: 0,
    stageEnteredAtTick: 0,
    status: 'in_progress',
    choiceHistory: [],
    ...overrides,
  }
}

function makeWorldWithReform(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    tick: 5,
    realms: new Map([['realm_qin', makeRealm()]]),
    generals: new Map([['gen_reformer', makeReformer()]]),
    reformStates: new Map([['realm_qin', makeInitialState()]]),
    ...overrides,
  })
}

describe('applyReformChoice: continue outcome', () => {
  it('advances to nextStageId and resets stageEnteredAtTick', () => {
    const world = makeWorldWithReform()
    const reformDef = makeReformDef()

    const { world: result } = applyReformChoice(
      world,
      'realm_qin',
      reformDef,
      'continue_choice',
    )

    const next = result.reformStates.get('realm_qin')
    expect(next).toBeDefined()
    expect(next?.currentStageId).toBe('stage2')
    expect(next?.stageEnteredAtTick).toBe(5)
    expect(next?.status).toBe('in_progress')
  })

  it('records choice in choiceHistory with tick and stage id', () => {
    const world = makeWorldWithReform()
    const reformDef = makeReformDef()

    const { world: result } = applyReformChoice(
      world,
      'realm_qin',
      reformDef,
      'continue_choice',
    )

    const next = result.reformStates.get('realm_qin')
    expect(next?.choiceHistory).toEqual([
      { stageId: 'stage1', choiceId: 'continue_choice', tick: 5 },
    ])
  })
})

describe('applyReformChoice: success outcome', () => {
  it('applies successTrait and sets status to completed_success', () => {
    const world = makeWorldWithReform()
    const reformDef = makeReformDef()

    const { world: result, events } = applyReformChoice(
      world,
      'realm_qin',
      reformDef,
      'success_choice',
    )

    const realm = result.realms.get('realm_qin')
    expect(realm?.traits).toContain('shang_yang_reform_done')
    expect(realm?.traits).not.toContain('reform_failed_scar')

    const reformState = result.reformStates.get('realm_qin')
    expect(reformState?.status).toBe('completed_success')

    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('reformCompleted')
    expect(events[0]?.payload).toMatchObject({
      realmId: 'realm_qin',
      reformId: 'test_reform',
      success: true,
    })
  })

  it('does not kill the reformer general on success', () => {
    const world = makeWorldWithReform()
    const reformDef = makeReformDef()

    const { world: result } = applyReformChoice(
      world,
      'realm_qin',
      reformDef,
      'success_choice',
    )

    expect(result.generals.has('gen_reformer')).toBe(true)
  })
})

describe('applyReformChoice: failure outcome', () => {
  it('applies failureTrait, treasury -2000, and kills reformer', () => {
    const world = makeWorldWithReform()
    const reformDef = makeReformDef()

    const { world: result, events } = applyReformChoice(
      world,
      'realm_qin',
      reformDef,
      'failure_choice',
    )

    const realm = result.realms.get('realm_qin')
    expect(realm?.traits).toContain('reform_failed_scar')
    expect(realm?.economy.treasury).toBe(3000)

    expect(result.generals.has('gen_reformer')).toBe(false)

    const reformState = result.reformStates.get('realm_qin')
    expect(reformState?.status).toBe('completed_failure')

    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('reformCompleted')
    expect(events[0]?.payload).toMatchObject({
      realmId: 'realm_qin',
      reformId: 'test_reform',
      success: false,
    })
  })

  it('handles failure when no reformer general exists', () => {
    const world = makeWorldWithReform({ generals: new Map() })
    const reformDef = makeReformDef()

    const { world: result } = applyReformChoice(
      world,
      'realm_qin',
      reformDef,
      'failure_choice',
    )

    const realm = result.realms.get('realm_qin')
    expect(realm?.traits).toContain('reform_failed_scar')
    expect(realm?.economy.treasury).toBe(3000)

    const reformState = result.reformStates.get('realm_qin')
    expect(reformState?.status).toBe('completed_failure')
  })
})

describe('applyReformChoice: choice history accumulation', () => {
  it('accumulates choices across consecutive stage transitions', () => {
    const reformDef = makeReformDef()
    const world1 = makeWorldWithReform()

    const step1 = applyReformChoice(
      world1,
      'realm_qin',
      reformDef,
      'continue_choice',
    )

    const step2 = applyReformChoice(
      { ...step1.world, tick: 12 },
      'realm_qin',
      reformDef,
      'finish_success',
    )

    const finalState = step2.world.reformStates.get('realm_qin')
    expect(finalState?.choiceHistory).toEqual([
      { stageId: 'stage1', choiceId: 'continue_choice', tick: 5 },
      { stageId: 'stage2', choiceId: 'finish_success', tick: 12 },
    ])
    expect(finalState?.status).toBe('completed_success')
  })
})

describe('applyReformChoice: guard clauses', () => {
  it('returns world unchanged when no reform state exists for realm', () => {
    const world = makeEmptyWorld({
      realms: new Map([['realm_qin', makeRealm()]]),
    })
    const reformDef = makeReformDef()

    const { world: result, events } = applyReformChoice(
      world,
      'realm_qin',
      reformDef,
      'success_choice',
    )

    expect(result).toBe(world)
    expect(events).toEqual([])
  })

  it('returns world unchanged when reform is already completed', () => {
    const world = makeWorldWithReform({
      reformStates: new Map([
        ['realm_qin', makeInitialState({ status: 'completed_success' })],
      ]),
    })
    const reformDef = makeReformDef()

    const { world: result, events } = applyReformChoice(
      world,
      'realm_qin',
      reformDef,
      'success_choice',
    )

    expect(result).toBe(world)
    expect(events).toEqual([])
  })

  it('returns world unchanged when choiceId not in current stage', () => {
    const world = makeWorldWithReform()
    const reformDef = makeReformDef()

    const { world: result, events } = applyReformChoice(
      world,
      'realm_qin',
      reformDef,
      'unknown_choice',
    )

    expect(result).toBe(world)
    expect(events).toEqual([])
  })
})

describe('advanceReformStage', () => {
  it('moves currentStageId and updates stageEnteredAtTick', () => {
    const world = makeWorldWithReform({ tick: 30 })

    const result = advanceReformStage(world, 'realm_qin', 'stage2')

    const next = result.reformStates.get('realm_qin')
    expect(next?.currentStageId).toBe('stage2')
    expect(next?.stageEnteredAtTick).toBe(30)
  })

  it('returns world unchanged when realm has no reform state', () => {
    const world = makeEmptyWorld()
    const result = advanceReformStage(world, 'realm_qin', 'stage2')
    expect(result).toBe(world)
  })
})

describe('completeReform', () => {
  it('marks status completed_success and adds successTrait', () => {
    const world = makeWorldWithReform()
    const reformDef = makeReformDef()

    const { world: result } = completeReform(world, 'realm_qin', reformDef, true)

    const realm = result.realms.get('realm_qin')
    expect(realm?.traits).toContain('shang_yang_reform_done')
    expect(result.reformStates.get('realm_qin')?.status).toBe(
      'completed_success',
    )
  })

  it('marks status completed_failure, deducts treasury, kills reformer', () => {
    const world = makeWorldWithReform()
    const reformDef = makeReformDef()

    const { world: result } = completeReform(world, 'realm_qin', reformDef, false)

    const realm = result.realms.get('realm_qin')
    expect(realm?.traits).toContain('reform_failed_scar')
    expect(realm?.economy.treasury).toBe(3000)
    expect(result.generals.has('gen_reformer')).toBe(false)
    expect(result.reformStates.get('realm_qin')?.status).toBe(
      'completed_failure',
    )
  })
})
