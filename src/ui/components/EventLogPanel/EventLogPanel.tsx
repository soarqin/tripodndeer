import React from 'react'
import { useGameStore } from '~/ui/store'
import styles from './EventLogPanel.module.css'

export function EventLogPanel(): React.JSX.Element | null {
  const eventLog = useGameStore((state) => state.eventLog)
  const clearEventLog = useGameStore((state) => state.clearEventLog)

  if (eventLog.length === 0) {
    return null
  }

  return (
    <div className={styles.panel} data-testid="event-log-panel">
      <div className={styles.header}>
        <span className={styles.title}>事件日志</span>
        <button className={styles.clearButton} onClick={clearEventLog}>
          清空
        </button>
      </div>
      <div className={styles.list}>
        {eventLog.map((entry) => (
          <div
            key={entry.id}
            className={styles.entry}
            data-testid={`event-log-entry-${entry.id}`}
          >
            <span className={styles.tick}>[Tick {entry.tick}]</span>
            <span className={styles.type}>[{entry.type}]</span>
            <span className={styles.text}>{entry.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
