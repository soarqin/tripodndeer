import { describe, it, expect } from 'vitest'
import {
  ReformDefinitionSchema,
  ReformStageSchema,
  ReformChoiceSchema,
} from '../schemas'

const minimalChoice = {
  id: 'choice_a',
  labelZh: '推行变法',
  effects: [],
  outcome: 'continue' as const,
}

const minimalStage = {
  id: 'stage1',
  textZh: '变法初议。',
  choices: [
    minimalChoice,
    { ...minimalChoice, id: 'choice_b', labelZh: '反对变法' },
  ],
  advanceAfterMonths: 6,
}

const minimalReform = {
  id: 'reform_shang_yang',
  displayName: 'Shang Yang Reform',
  displayNameZh: '商鞅变法',
  trigger: { kind: 'realm.id', value: 'realm_qin' },
  oneShot: true as const,
  stages: [minimalStage],
  successTrait: 'reformed_legalist',
  failureTrait: 'reform_failed',
}

describe('ReformChoiceSchema', () => {
  it('accepts a minimal valid choice', () => {
    expect(ReformChoiceSchema.safeParse(minimalChoice).success).toBe(true)
  })

  it('accepts choice with whitelisted effect type realm.treasury', () => {
    const choice = {
      ...minimalChoice,
      effects: [{ type: 'realm.treasury', realmId: 'realm_qin', delta: -200 }],
    }
    expect(ReformChoiceSchema.safeParse(choice).success).toBe(true)
  })

  it('accepts choice with nextStageId for continue outcome', () => {
    const choice = {
      ...minimalChoice,
      nextStageId: 'stage2',
    }
    expect(ReformChoiceSchema.safeParse(choice).success).toBe(true)
  })

  it('accepts success outcome', () => {
    expect(
      ReformChoiceSchema.safeParse({ ...minimalChoice, outcome: 'success' }).success,
    ).toBe(true)
  })

  it('accepts failure outcome', () => {
    expect(
      ReformChoiceSchema.safeParse({ ...minimalChoice, outcome: 'failure' }).success,
    ).toBe(true)
  })

  it('rejects choice with invalid outcome enum value', () => {
    const choice = { ...minimalChoice, outcome: 'pending' }
    expect(ReformChoiceSchema.safeParse(choice).success).toBe(false)
  })

  it('rejects choice with non-whitelisted effect type', () => {
    const choice = {
      ...minimalChoice,
      effects: [{ type: 'realm.legitimacy.add', realmId: 'realm_qin', delta: 5 }],
    }
    expect(ReformChoiceSchema.safeParse(choice).success).toBe(false)
  })

  it('rejects choice missing required outcome field', () => {
    const choice = {
      id: 'c1',
      labelZh: '推行',
      effects: [],
    }
    expect(ReformChoiceSchema.safeParse(choice).success).toBe(false)
  })

  it('rejects choice with empty id string', () => {
    const choice = { ...minimalChoice, id: '' }
    expect(ReformChoiceSchema.safeParse(choice).success).toBe(false)
  })
})

describe('ReformStageSchema', () => {
  it('accepts a minimal valid stage with 2 choices', () => {
    expect(ReformStageSchema.safeParse(minimalStage).success).toBe(true)
  })

  it('accepts a stage with 4 choices (max)', () => {
    const stage = {
      ...minimalStage,
      choices: [
        { ...minimalChoice, id: 'c1' },
        { ...minimalChoice, id: 'c2' },
        { ...minimalChoice, id: 'c3' },
        { ...minimalChoice, id: 'c4' },
      ],
    }
    expect(ReformStageSchema.safeParse(stage).success).toBe(true)
  })

  it('rejects a stage with only 1 choice (below min)', () => {
    const stage = { ...minimalStage, choices: [minimalChoice] }
    expect(ReformStageSchema.safeParse(stage).success).toBe(false)
  })

  it('rejects a stage with more than 4 choices', () => {
    const stage = {
      ...minimalStage,
      choices: [
        { ...minimalChoice, id: 'c1' },
        { ...minimalChoice, id: 'c2' },
        { ...minimalChoice, id: 'c3' },
        { ...minimalChoice, id: 'c4' },
        { ...minimalChoice, id: 'c5' },
      ],
    }
    expect(ReformStageSchema.safeParse(stage).success).toBe(false)
  })

  it('rejects a stage with non-positive advanceAfterMonths', () => {
    const stage = { ...minimalStage, advanceAfterMonths: 0 }
    expect(ReformStageSchema.safeParse(stage).success).toBe(false)
  })

  it('rejects a stage with non-integer advanceAfterMonths', () => {
    const stage = { ...minimalStage, advanceAfterMonths: 1.5 }
    expect(ReformStageSchema.safeParse(stage).success).toBe(false)
  })
})

describe('ReformDefinitionSchema', () => {
  it('parses a minimal valid ReformDefinition', () => {
    expect(ReformDefinitionSchema.safeParse(minimalReform).success).toBe(true)
  })

  it('parses a ReformDefinition with optional historicalYearRange', () => {
    const reform = {
      ...minimalReform,
      historicalYearRange: [359, 338] as const,
    }
    expect(ReformDefinitionSchema.safeParse(reform).success).toBe(true)
  })

  it('parses a ReformDefinition with 5 stages (max)', () => {
    const reform = {
      ...minimalReform,
      stages: [
        { ...minimalStage, id: 's1' },
        { ...minimalStage, id: 's2' },
        { ...minimalStage, id: 's3' },
        { ...minimalStage, id: 's4' },
        { ...minimalStage, id: 's5' },
      ],
    }
    expect(ReformDefinitionSchema.safeParse(reform).success).toBe(true)
  })

  it('rejects a ReformDefinition with more than 5 stages', () => {
    const reform = {
      ...minimalReform,
      stages: [
        { ...minimalStage, id: 's1' },
        { ...minimalStage, id: 's2' },
        { ...minimalStage, id: 's3' },
        { ...minimalStage, id: 's4' },
        { ...minimalStage, id: 's5' },
        { ...minimalStage, id: 's6' },
      ],
    }
    expect(ReformDefinitionSchema.safeParse(reform).success).toBe(false)
  })

  it('rejects a ReformDefinition with zero stages', () => {
    const reform = { ...minimalReform, stages: [] }
    expect(ReformDefinitionSchema.safeParse(reform).success).toBe(false)
  })

  it('rejects a ReformDefinition with oneShot: false', () => {
    const reform = { ...minimalReform, oneShot: false }
    expect(ReformDefinitionSchema.safeParse(reform).success).toBe(false)
  })

  it('rejects a ReformDefinition with invalid PredicateNode trigger', () => {
    const reform = {
      ...minimalReform,
      trigger: { kind: 'realm.unknown-thing', value: 'foo' },
    }
    expect(ReformDefinitionSchema.safeParse(reform).success).toBe(false)
  })

  it('rejects a ReformDefinition with empty successTrait', () => {
    const reform = { ...minimalReform, successTrait: '' }
    expect(ReformDefinitionSchema.safeParse(reform).success).toBe(false)
  })

  it('rejects a ReformDefinition with empty failureTrait', () => {
    const reform = { ...minimalReform, failureTrait: '' }
    expect(ReformDefinitionSchema.safeParse(reform).success).toBe(false)
  })

  it('rejects a ReformDefinition where a stage choice has non-whitelisted effect', () => {
    const reform = {
      ...minimalReform,
      stages: [
        {
          ...minimalStage,
          choices: [
            {
              ...minimalChoice,
              effects: [
                { type: 'realm.legitimacy.add', realmId: 'realm_qin', delta: 5 },
              ],
            },
            { ...minimalChoice, id: 'choice_b' },
          ],
        },
      ],
    }
    expect(ReformDefinitionSchema.safeParse(reform).success).toBe(false)
  })

  it('accepts a ReformDefinition using and predicate trigger', () => {
    const reform = {
      ...minimalReform,
      trigger: {
        kind: 'and',
        children: [
          { kind: 'realm.id', value: 'realm_qin' },
          { kind: 'realm.has-character-with-specialty', specialty: 'reformer' },
        ],
      },
    }
    expect(ReformDefinitionSchema.safeParse(reform).success).toBe(true)
  })
})
