import { useGameStore } from '~/ui/store'
import { selectAllPlayerArmies, selectActivePanel, selectSelectedArmy } from '~/ui/store/selectors'
import styles from './ArmyListPanel.module.css'

export function ArmyListPanel() {
  const activePanel = useGameStore(selectActivePanel)
  const armies = useGameStore(selectAllPlayerArmies)
  const selectedArmy = useGameStore(selectSelectedArmy)
  const selectArmy = useGameStore(state => state.selectArmy)

  if (activePanel !== 'junshi') return null

  return (
    <div className={styles.panel} data-testid="army-list-panel">
      <h2 className={styles.title}>军事</h2>
      {armies.length === 0 && <p className={styles.empty}>无军团</p>}
      {armies.map(army => (
        <div
          key={army.id}
          data-testid={`army-row-${army.id}`}
          className={`${styles.row} ${selectedArmy?.id === army.id ? styles.selected : ''}`}
          onClick={() => selectArmy(army.id)}
          role="button"
          tabIndex={0}
        >
          <span className={styles.armyId}>{army.id}</span>
          <span className={styles.location}>{army.location}</span>
          <span className={styles.manpower}>{army.manpower.toLocaleString()}</span>
          <span className={styles.state}>{army.state}</span>
          {army.destination && (
            <span className={styles.destination}>→ {army.destination}</span>
          )}
          {army.ticksRemaining > 0 && (
            <span className={styles.ticks}>{army.ticksRemaining}旬</span>
          )}
        </div>
      ))}
    </div>
  )
}
