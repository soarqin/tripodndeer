import { describe, expect, it } from 'vitest'
import { SCENARIO_CONFIGS } from '../scenario-configs'

describe('tutorial scenario config', () => {
  it('registers tutorial without changing existing configs', () => {
    expect(SCENARIO_CONFIGS.length).toBe(3)

    const tutorial = SCENARIO_CONFIGS.find((config) => config.id === 'tutorial')
    expect(tutorial).toBeDefined()
    expect(tutorial?.id).toBe('tutorial')
    expect(tutorial?.isNew).toBe(true)
    expect(tutorial?.skipsDifficultySelector).toBe(true)
    expect(tutorial?.name).toContain('教学')

    const m1 = SCENARIO_CONFIGS.find((config) => config.id === 'm1')
    const m9 = SCENARIO_CONFIGS.find((config) => config.id === 'm9')

    expect(m1).toMatchObject({
      id: 'm1',
      name: '春秋战国前传',
      description: '50 站点小型剧本，适合快速对局与功能验证',
      difficulty: 'beginner',
      recommendedRealms: ['realm_qin', 'realm_chu', 'realm_qi'],
      thumbnailType: 'svg-placeholder',
    })

    expect(m9).toMatchObject({
      id: 'm9',
      name: '战国 v1',
      description: '战国全境 250 站点，完整历史人物名册',
      difficulty: 'standard',
      recommendedRealms: ['realm_qin', 'realm_chu', 'realm_qi', 'realm_zhao', 'realm_wei', 'realm_han', 'realm_yan'],
      thumbnailType: 'svg-placeholder',
    })
  })
})
