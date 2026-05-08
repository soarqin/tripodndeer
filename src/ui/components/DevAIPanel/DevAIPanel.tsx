import React from 'react'
import { useGameStore } from '~/ui/store'
import styles from './DevAIPanel.module.css'

export function DevAIPanel(): React.JSX.Element | null {
  const world = useGameStore((state) => state.world)
  
  const isDev = import.meta.env.DEV
  const isDevAI = new URLSearchParams(window.location.search).get('devAI') === '1'

  if (!isDev || !isDevAI) {
    return null
  }

  const { rngState, realms, rulers } = world

  return (
    <div className={styles.panel} data-testid="dev-ai-panel">
      <div className={styles.header}>Dev AI Panel</div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>RNG State</div>
        <div>Seed: {rngState.seed}</div>
        <div>Counter: {rngState.counter}</div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Ruler Personalities</div>
        <div className={styles.list}>
          {Array.from(realms.values()).map((realm) => {
            const ruler = realm.rulerId ? rulers.get(realm.rulerId) : null
            const personality = ruler?.personality ?? 'unknown'
            return (
              <div key={realm.id} className={styles.listItem}>
                <span className={styles.realmName}>{realm.displayName || realm.id}</span>
                <span className={styles.personality}>{personality}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
