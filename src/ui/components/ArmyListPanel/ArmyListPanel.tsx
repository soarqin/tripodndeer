import { useEffect } from 'react'
import { useGameStore } from '~/ui/store'
import { selectAllPlayerArmies, selectActivePanel, selectSelectedArmy, useGenerals } from '~/ui/store/selectors'
import styles from './ArmyListPanel.module.css'

export function ArmyListPanel() {
  const activePanel = useGameStore(selectActivePanel)
  const armies = useGameStore(selectAllPlayerArmies)
  const selectedArmy = useGameStore(selectSelectedArmy)
  const selectArmy = useGameStore(state => state.selectArmy)
  const recordPanelOpened = useGameStore(state => state.recordPanelOpened)
  const generals = useGenerals()

  const isVisible = activePanel === 'junshi'
  useEffect(() => {
    if (isVisible) recordPanelOpened('army')
  }, [isVisible, recordPanelOpened])

  if (activePanel !== 'junshi') return null

  return (
    <div className={styles.panel} data-testid="army-list-panel">
      <h2 className={styles.title}>军事</h2>
      {armies.length === 0 && <p className={styles.empty}>无军团</p>}
      {armies.map(army => {
        const general = army.generalId ? generals.get(army.generalId) : undefined
        
        return (
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
            
            {general && (
              <div className={styles.generalInfo}>
                将领: {general.name} (武:{general.might} 统:{general.command})
              </div>
            )}
            
            {army.composition && (
              <div className={styles.compositionInfo}>
                {[
                  army.composition.infantry > 0 ? `步:${army.composition.infantry}` : null,
                  army.composition.chariot > 0 ? `车:${army.composition.chariot}` : null,
                  army.composition.cavalry > 0 ? `骑:${army.composition.cavalry}` : null,
                  army.composition.crossbow > 0 ? `弩:${army.composition.crossbow}` : null,
                ].filter(Boolean).join(' ')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
