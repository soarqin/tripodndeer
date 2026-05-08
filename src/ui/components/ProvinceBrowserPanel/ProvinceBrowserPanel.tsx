import { useState } from 'react'
import { useGameStore } from '~/ui/store'
import { selectActivePanel, useSites } from '~/ui/store/selectors'
import styles from './ProvinceBrowserPanel.module.css'

export function ProvinceBrowserPanel() {
  const activePanel = useGameStore(selectActivePanel)
  const provinces = useGameStore((state) => state.world.provinces)
  const regions = useGameStore((state) => state.world.regions)
  const realms = useGameStore((state) => state.world.realms)
  const sites = useSites()

  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (activePanel !== 'province-browser') return null

  const provinceList = [...provinces.values()]

  return (
    <div className={styles.panel} data-testid="province-browser-panel">
      <div className={styles.header}>州郡 (Provinces)</div>
      <div className={styles.content}>
        {provinceList.length === 0 ? (
          <div className={styles.emptyState} data-testid="province-empty-state">
            当前剧本未提供州郡数据
          </div>
        ) : (
          <div className={styles.cardList}>
            {provinceList.map((province) => {
              const region = regions.get(province.regionId)
              const realm = realms.get(province.realmId)
              const isExpanded = expandedId === province.id

              return (
                <div
                  key={province.id}
                  className={styles.card}
                  data-testid={`province-card-${province.id}`}
                  onClick={() => setExpandedId(isExpanded ? null : province.id)}
                >
                  <div className={styles.cardHeader}>
                    <span className={styles.name}>{province.name}</span>
                    <div className={styles.tags}>
                      {region && <span className={styles.tag}>{region.name}</span>}
                      {realm && <span className={styles.tag}>{realm.displayName}</span>}
                      <span className={styles.tag}>{province.siteIds.length} 邑</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={styles.detail} data-testid="province-detail">
                      <div>下辖邑：</div>
                      <div className={styles.siteList}>
                        {province.siteIds.map((siteId) => {
                          const site = sites.get(siteId)
                          return (
                            <span key={siteId} className={styles.siteItem}>
                              {site ? site.name : siteId}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
