import type { BattleResolution } from '~/engine/systems/combat-v2'
import styles from './BattlePanel.module.css'

interface BattlePanelProps {
  resolution: BattleResolution
}

const STEP_LABELS: Record<string, string> = {
  'base-power': '基础战力',
  'counter': '兵种克制',
  'terrain': '地形修正',
  'pass-defense': '关隘防御',
  'siege-defense': '攻城防御',
  'might': '将领武力',
  'tactic': '战法效果',
  'variance': '随机因素',
}

export function BattlePanel({ resolution }: BattlePanelProps) {
  const formatMultiplier = (val: number) => {
    if (val === 1) return '-'
    return `x${val.toFixed(2)}`
  }

  return (
    <div className={styles.panel} data-testid="battle-panel">
      <div className={styles.header}>
        <h2 className={styles.title}>战斗结果</h2>
      </div>
      
      <div className={styles.content}>
        <div className={styles.summary}>
          <div className={styles.winner} data-testid="battle-winner">
            胜方：{resolution.winner === 'attacker' ? '攻方' : '守方'}
          </div>
          <div className={styles.losses}>
            <span data-testid="attacker-loss">攻方损失：{resolution.attackerLoss}</span>
            <span data-testid="defender-loss">守方损失：{resolution.defenderLoss}</span>
          </div>
        </div>

        <div className={styles.steps} data-testid="battle-steps">
          {resolution.steps.map((step, index) => (
            <div key={index} className={styles.step} data-testid={`battle-step-${step.name}`}>
              <span className={styles.stepName}>{STEP_LABELS[step.name] ?? step.name}</span>
              <div className={styles.multipliers}>
                <span className={`${styles.multiplier} ${styles.attackerMultiplier}`}>
                  {formatMultiplier(step.attackerMultiplier)}
                </span>
                <span className={`${styles.multiplier} ${styles.defenderMultiplier}`}>
                  {formatMultiplier(step.defenderMultiplier)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {resolution.deadGenerals.length > 0 && (
          <div className={styles.deadGenerals} data-testid="battle-dead-generals">
            将领阵亡
          </div>
        )}
      </div>
    </div>
  )
}
