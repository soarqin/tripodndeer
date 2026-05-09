import React, { useState } from 'react'
import { SCENARIO_CONFIGS } from '~/content/scenarios/scenario-configs'
import { useGameStore } from '~/ui/store/game-store'
import type { DifficultyTier } from '~/shared/types'
import zhCN from '~/content/locales/zh-CN.json'
import styles from './ScenarioPicker.module.css'

const DIFFICULTY_LABELS = { beginner: '入门', standard: '标准', advanced: '困难' }
const DIFFICULTY_COLORS = { beginner: '#4CAF50', standard: '#2196F3', advanced: '#F44336' }

const DIFFICULTY_OPTIONS: { value: DifficultyTier; labelKey: keyof typeof zhCN }[] = [
  { value: 'weak', labelKey: 'difficulty.weak' },
  { value: 'common', labelKey: 'difficulty.common' },
  { value: 'hero', labelKey: 'difficulty.hero' },
  { value: 'hegemon', labelKey: 'difficulty.hegemon' },
  { value: 'sage', labelKey: 'difficulty.sage' },
]

export function ScenarioPicker(): React.JSX.Element {
  const loadWorld = useGameStore((state) => state.loadWorld)
  const [loading, setLoading] = React.useState(false)
  const [difficulty, setDifficulty] = useState<DifficultyTier>('hero')

  async function handleSelect(id: 'm1' | 'm9') {
    setLoading(true)
    await loadWorld(id, difficulty)
    // bootStatus becomes 'ready' → App re-renders main screen
  }

  return (
    <div className={styles.overlay} data-testid="scenario-picker">
      <div className={styles.container}>
        <h1 className={styles.title}>鼎鹿 · 选择剧本</h1>
        
        <div className={styles.difficultySelector}>
          <label htmlFor="difficulty-select">难度选择：</label>
          <select 
            id="difficulty-select"
            data-testid="difficulty-select"
            value={difficulty} 
            onChange={(e) => setDifficulty(e.target.value as DifficultyTier)}
            disabled={loading}
          >
            {DIFFICULTY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {zhCN[opt.labelKey]}{opt.value === 'hero' ? ' (hero - 默认)' : ''}
              </option>
            ))}
          </select>
        </div>

        {loading && <div className={styles.loading}>加载中...</div>}
        <div className={styles.grid}>
          {SCENARIO_CONFIGS.map((config) => (
            <button
              key={config.id}
              className={styles.card}
              data-testid={`scenario-card-${config.id}`}
              onClick={() => handleSelect(config.id)}
              disabled={loading}
            >
              <div className={styles.thumbnail}>
                <svg width="120" height="80" viewBox="0 0 120 80">
                  <rect width="120" height="80" fill="#1a1a2e" rx="4"/>
                  <ellipse cx="60" cy="40" rx="40" ry="25" fill="none" stroke="#4a9eff" strokeWidth="1.5"/>
                  <text x="60" y="44" textAnchor="middle" fill="#4a9eff" fontSize="10">{config.id.toUpperCase()}</text>
                </svg>
              </div>
              <div className={styles.info}>
                <h2 className={styles.name}>{config.name}</h2>
                <p className={styles.description}>{config.description}</p>
                <span
                  className={styles.difficulty}
                  style={{ backgroundColor: DIFFICULTY_COLORS[config.difficulty] }}
                >
                  {DIFFICULTY_LABELS[config.difficulty]}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
