import { useGameStore } from '~/ui/store'
import { selectPlayerRealm, selectAllPlayerArmies, selectActivePanel } from '~/ui/store/selectors'
import styles from './RealmOverviewPanel.module.css'
export function RealmOverviewPanel() {
  const activePanel = useGameStore(selectActivePanel)
  const realm = useGameStore(selectPlayerRealm)
  const armies = useGameStore(selectAllPlayerArmies)
  const world = useGameStore(state => state.world)

  if (activePanel !== 'wanggong') return null
  if (!realm) return null

  // Calculate stats
  const totalSites = world.sites.size
  const playerSites = [...world.sites.values()].filter(s => s.ownerId === realm.id).length
  const totalManpower = armies.reduce((sum, a) => sum + a.manpower, 0)
  const idleCount = armies.filter(a => a.state === 'idle').length
  const marchingCount = armies.filter(a => a.state === 'marching').length
  const retreatingCount = armies.filter(a => a.state === 'retreating').length
  const warCount = [...world.wars.keys()].filter(k => k.includes(realm.id)).length

  const capitalSite = world.sites.get(realm.capital)

  return (
    <div className={styles.panel} data-testid="realm-overview-panel">
      <div className={styles.header} style={{ backgroundColor: realm.color }}>
        <span data-testid="realm-name" className={styles.realmName}>
          {realm.displayName} · {realm.fullTitle}
        </span>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.label}>首都</span>
          <span className={styles.value}>{capitalSite?.name ?? realm.capital}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>疆域</span>
          <span data-testid="realm-sites-count" className={styles.value}>
            {playerSites} / {totalSites}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>总兵</span>
          <span data-testid="realm-total-manpower" className={styles.value}>
            {totalManpower.toLocaleString()}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>军团</span>
          <span className={styles.value}>
            闲{idleCount} 行{marchingCount} 退{retreatingCount}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>敌对</span>
          <span className={styles.value}>{warCount} 国</span>
        </div>
      </div>
    </div>
  )
}
