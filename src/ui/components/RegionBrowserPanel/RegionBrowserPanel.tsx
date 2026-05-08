import { useState } from 'react'
import { useGameStore } from '~/ui/store'
import { selectActivePanel } from '~/ui/store/selectors'
import styles from './RegionBrowserPanel.module.css'

export function RegionBrowserPanel() {
  const activePanel = useGameStore(selectActivePanel)
  const regions = useGameStore((state) => state.world.regions)
  const provinces = useGameStore((state) => state.world.provinces)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (activePanel !== 'region-browser') return null

  const regionList = [...regions.values()]

  return (
    <div className={styles.panel} data-testid="region-browser-panel">
      <div className={styles.header}>地区 (Regions)</div>
      <div className={styles.content}>
        {regionList.length === 0 ? (
          <div className={styles.emptyState} data-testid="region-empty-state">
            当前剧本未提供地区数据
          </div>
        ) : (
          <div className={styles.cardList}>
            {regionList.map((region) => {
              const isExpanded = expandedId === region.id

              return (
                <div
                  key={region.id}
                  className={styles.card}
                  data-testid={`region-card-${region.id}`}
                  onClick={() => setExpandedId(isExpanded ? null : region.id)}
                >
                  <div className={styles.cardHeader}>
                    <span className={styles.name}>{region.name}</span>
                    <div className={styles.tags}>
                      <span className={styles.tag}>{region.provinceIds.length} 州郡</span>
                    </div>
                  </div>

                  {region.description && (
                    <div className={styles.description}>{region.description}</div>
                  )}

                  {isExpanded && (
                    <div className={styles.detail} data-testid="region-detail">
                      <div>下辖州郡：</div>
                      <div className={styles.provinceList}>
                        {region.provinceIds.map((provinceId) => {
                          const province = provinces.get(provinceId)
                          return (
                            <span key={provinceId} className={styles.provinceItem}>
                              {province ? province.name : provinceId}
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
