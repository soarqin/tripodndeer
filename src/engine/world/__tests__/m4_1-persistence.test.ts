import { describe, expect, it } from 'vitest'

import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { M1DataSchemaV7, type M1DataV7 } from '~/shared/schemas'

type V7ReformState = M1DataV7['reformStates'][number]

const SAMPLE_REFORM_STATE: V7ReformState = {
  realmId: 'realm_qin',
  reformId: 'reform_hu_fu_qi_she',
  currentStageId: 'wuling_proposal',
  startedAtTick: 12,
  stageEnteredAtTick: 12,
  status: 'in_progress',
  choiceHistory: [
    { stageId: 'wuling_proposal', choiceId: 'decree', tick: 12 },
  ],
}

function buildV6WithReform(reformStates: V7ReformState[]): M1DataV7 {
  const base = loadM1Data()
  return { ...base, reformStates }
}

describe('M4.1 persistence: JSON round-trip', () => {
  it('preserves reformStates array through JSON.stringify + JSON.parse', () => {
    const data = buildV6WithReform([SAMPLE_REFORM_STATE])
    const json = JSON.stringify(data)
    const parsed = M1DataSchemaV7.parse(JSON.parse(json))

    expect(parsed.reformStates).toEqual([SAMPLE_REFORM_STATE])
    expect(parsed.schema_version).toBe(7)
  })

  it('preserves multiple reform states in deterministic order', () => {
    const second: V7ReformState = {
      realmId: 'realm_zhao',
      reformId: 'reform_hu_fu_qi_she',
      currentStageId: 'stage1',
      startedAtTick: 0,
      stageEnteredAtTick: 0,
      status: 'paused',
      choiceHistory: [],
    }
    const data = buildV6WithReform([SAMPLE_REFORM_STATE, second])
    const parsed = M1DataSchemaV7.parse(JSON.parse(JSON.stringify(data)))

    expect(parsed.reformStates).toHaveLength(2)
    expect(parsed.reformStates).toEqual([SAMPLE_REFORM_STATE, second])
  })

  it('preserves choiceHistory entries with full fidelity', () => {
    const richState: V7ReformState = {
      ...SAMPLE_REFORM_STATE,
      choiceHistory: [
        { stageId: 'stage1', choiceId: 'choice_a', tick: 1 },
        { stageId: 'stage2', choiceId: 'choice_b', tick: 37 },
        { stageId: 'stage3', choiceId: 'choice_c', tick: 73 },
      ],
    }
    const data = buildV6WithReform([richState])
    const parsed = M1DataSchemaV7.parse(JSON.parse(JSON.stringify(data)))

    expect(parsed.reformStates[0]?.choiceHistory).toEqual(richState.choiceHistory)
  })
})

describe('M4.1 persistence: createWorldFromM1Data populates reformStates Map', () => {
  it('loads reformStates from M1DataV6 into world.reformStates Map keyed by realmId', () => {
    const data = buildV6WithReform([SAMPLE_REFORM_STATE])
    const world = createWorldFromM1Data(data, 42, 'realm_qin')

    expect(world.reformStates.size).toBe(1)
    expect(world.reformStates.get('realm_qin')).toEqual(SAMPLE_REFORM_STATE)
  })

  it('empty reformStates array yields empty world.reformStates Map', () => {
    const data = buildV6WithReform([])
    const world = createWorldFromM1Data(data, 42, 'realm_qin')

    expect(world.reformStates.size).toBe(0)
  })

  it('full round-trip: World → array → JSON → parse → World preserves reform state', () => {
    const original = createWorldFromM1Data(buildV6WithReform([SAMPLE_REFORM_STATE]), 42, 'realm_qin')

    const reformStatesArray: V7ReformState[] = [...original.reformStates.values()].map((s) => ({
      realmId: s.realmId,
      reformId: s.reformId,
      currentStageId: s.currentStageId,
      startedAtTick: s.startedAtTick,
      stageEnteredAtTick: s.stageEnteredAtTick,
      status: s.status,
      choiceHistory: [...s.choiceHistory],
    }))
    const serialisable: M1DataV7 = buildV6WithReform(reformStatesArray)
    const json = JSON.stringify(serialisable)
    const reparsed = M1DataSchemaV7.parse(JSON.parse(json))
    const reloaded = createWorldFromM1Data(reparsed, 42, 'realm_qin')

    expect(reloaded.reformStates.get('realm_qin')).toEqual(
      original.reformStates.get('realm_qin'),
    )
    expect(reparsed.schema_version).toBe(7)
  })
})
