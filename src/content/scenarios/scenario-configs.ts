export interface ScenarioConfig {
  readonly id: 'm1' | 'm9'
  readonly name: string
  readonly description: string
  readonly difficulty: 'beginner' | 'standard' | 'advanced'
  readonly recommendedRealms: readonly string[]
  readonly thumbnailType: 'svg-placeholder'
}

export const SCENARIO_CONFIGS: readonly ScenarioConfig[] = [
  {
    id: 'm1',
    name: '春秋战国前传',
    description: '50 站点小型剧本，适合快速对局与功能验证',
    difficulty: 'beginner',
    recommendedRealms: ['realm_qin', 'realm_chu', 'realm_qi'],
    thumbnailType: 'svg-placeholder',
  },
  {
    id: 'm9',
    name: '战国 v1',
    description: '战国全境 250 站点，完整历史人物名册',
    difficulty: 'standard',
    recommendedRealms: ['realm_qin', 'realm_chu', 'realm_qi', 'realm_zhao', 'realm_wei', 'realm_han', 'realm_yan'],
    thumbnailType: 'svg-placeholder',
  },
]
