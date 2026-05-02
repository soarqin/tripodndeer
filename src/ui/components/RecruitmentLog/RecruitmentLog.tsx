import { useGameStore } from '~/ui/store'
import { useGenerals } from '~/ui/store/selectors'
import styles from './RecruitmentLog.module.css'

export function RecruitmentLog() {
  const playerRealmId = useGameStore((s) => s.playerRealmId)
  const tick = useGameStore((s) => s.world.tick)
  const generals = useGenerals()

  const recentRecruits = [...generals.values()]
    .filter(
      (g) =>
        g.realmId === playerRealmId &&
        g.recruitedAtTick !== undefined &&
        tick - g.recruitedAtTick <= 9,
    )
    .sort((a, b) => (b.recruitedAtTick as number) - (a.recruitedAtTick as number))
    .slice(0, 5)

  return (
    <div className={styles.container} data-testid="recruitment-log">
      <div className={styles.header}>近期招募</div>
      {recentRecruits.length === 0 ? (
        <div className={styles.empty} data-testid="recruitment-log-empty">
          暂无近期招募
        </div>
      ) : (
        <ul className={styles.list}>
          {recentRecruits.map((g) => (
            <li key={g.id} className={styles.entry} data-testid={`recruitment-log-entry-${g.id}`}>
              <span className={styles.name}>{g.name}</span>
              <span className={styles.attrs}>
                (武 {g.attrs?.wu ?? g.might} 政 {g.attrs?.zheng ?? 0})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
