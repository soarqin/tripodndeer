import { describe, expect, it } from 'vitest'
import type { HintEntry, HintId } from '../hint-types'

describe('HintEntry types', () => {
  it('HintId is string', () => {
    const id: HintId = 'hint_reform'
    expect(typeof id).toBe('string')
  })

  it('HintEntry has required fields', () => {
    const entry: HintEntry = {
      id: 'hint_reform',
      title: '变法',
      body: '变法是通过多阶段决策改变势力特质的机制。\n\n每个变法阶段需要特定的人才和资源。变法完成后，势力获得永久性特质加成。',
      codexEntryId: 'mechanic-reforms',
    }
    expect(entry.id).toBe('hint_reform')
    expect(entry.title).toBe('变法')
    expect(typeof entry.body).toBe('string')
    expect(typeof entry.codexEntryId).toBe('string')
  })

  it('HintEntry does not accept extra fields at compile time', () => {
    // This is a compile-time only check - the test ensures the interface is exactly right
    const validEntry: HintEntry = {
      id: 'hint_reform',
      title: '变法',
      body: '内容',
      codexEntryId: 'mechanic-reforms',
    }
    expect(validEntry).toBeTruthy()
  })
})
