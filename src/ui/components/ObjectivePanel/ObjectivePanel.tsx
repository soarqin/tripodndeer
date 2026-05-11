import React, { useState } from 'react'
import { useGameStore } from '~/ui/store'
import { TUTORIAL_STEPS } from '~/content/m10_3/tutorial-steps'
import styles from './ObjectivePanel.module.css'

export function ObjectivePanel(): React.JSX.Element | null {
  const world = useGameStore((state) => state.world)
  const resetToBootPending = useGameStore((state) => state.resetToBootPending)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  if (world.scenarioId !== 'tutorial' || !world.tutorialState) {
    return null
  }

  const { currentStep, completedSteps } = world.tutorialState
  const completedCount = completedSteps.size
  const totalCount = TUTORIAL_STEPS.length

  if (isCollapsed) {
    return (
      <div className={styles.container} data-testid="objective-panel">
        <button
          className={styles.badge}
          onClick={() => setIsCollapsed(false)}
          data-testid="objective-panel-expand"
        >
          <span>教学步骤</span>
          <span>{completedCount}/{totalCount}</span>
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container} data-testid="objective-panel">
      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            教学步骤
            <span className={styles.progress}>{completedCount}/{totalCount}</span>
          </h3>
          <button
            className={styles.toggleButton}
            onClick={() => setIsCollapsed(true)}
            data-testid="objective-panel-collapse"
          >
            收起
          </button>
        </div>
        <ul className={styles.list}>
          {TUTORIAL_STEPS.map((step) => {
            const isCompleted = completedSteps.has(step.id)
            const isCurrent = currentStep === step.id
            let itemClass = styles.stepFuture
            let icon = '○'

            if (isCompleted) {
              itemClass = styles.stepCompleted
              icon = '✓'
            } else if (isCurrent) {
              itemClass = styles.stepCurrent
              icon = '▶'
            }

            return (
              <li key={step.id} className={`${styles.step} ${itemClass}`}>
                <span className={styles.stepIcon}>{icon}</span>
                <span>{step.titleZH}</span>
              </li>
            )
          })}
        </ul>
        <div className={styles.footer}>
          {showConfirm ? (
            <div className={styles.confirmBox}>
              <p>确定退出教学？教学进度将丢失</p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.confirmBtn}
                  onClick={() => resetToBootPending()}
                  data-testid="exit-tutorial-confirm"
                >
                  确定
                </button>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setShowConfirm(false)}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              className={styles.exitBtn}
              onClick={() => setShowConfirm(true)}
              data-testid="exit-tutorial-btn"
            >
              退出教学
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
