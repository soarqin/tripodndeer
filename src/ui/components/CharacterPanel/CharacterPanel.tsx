import { useState } from 'react'
import { useGameStore } from '~/ui/store'
import { selectActivePanel, useGenerals, useSites } from '~/ui/store/selectors'
import styles from './CharacterPanel.module.css'

export function CharacterPanel() {
  const activePanel = useGameStore(selectActivePanel)
  const playerRealmId = useGameStore((s) => s.playerRealmId)
  const generals = useGenerals()
  const sites = useSites()
  const assignPlayerPost = useGameStore((s) => s.assignPlayerPost)
  const unassignPlayerPost = useGameStore((s) => s.unassignPlayerPost)
  const assignPlayerGovernor = useGameStore((s) => s.assignPlayerGovernor)

  const [selectedSiteIds, setSelectedSiteIds] = useState<Record<string, string>>({})

  if (activePanel !== 'rencai') return null

  const playerGenerals = [...generals.values()].filter((g) => g.realmId === playerRealmId)
  const ownedSites = [...sites.values()].filter((s) => s.ownerId === playerRealmId)

  const handleAssignPost = (generalId: string, post: import('~/shared/types').Post) => {
    assignPlayerPost({ generalId, post })
  }

  const handleUnassignPost = (generalId: string, post: import('~/shared/types').Post) => {
    unassignPlayerPost({ generalId, post })
  }

  const handleAssignGovernor = (generalId: string) => {
    const siteId = selectedSiteIds[generalId]
    if (!siteId) return
    assignPlayerGovernor({ siteId, generalId })
  }

  return (
    <div className={styles.panel} data-testid="character-panel">
      <div className={styles.header}>人才 (Characters)</div>
      <div className={styles.content}>
        <div className={styles.characterList}>
          {playerGenerals.map((general) => {
            const hasPosts = general.posts && general.posts.length > 0
            const isCommanderOrWarrior = general.specialty === 'commander' || general.specialty === 'warrior'
            const isAdministratorOrReformer = general.specialty === 'administrator' || general.specialty === 'reformer'
            const isDiplomat = general.specialty === 'diplomat'

            return (
              <div key={general.id} className={styles.characterCard} data-testid="character-card">
                <div className={styles.cardHeader}>
                  <span className={styles.name}>{general.name}</span>
                  <div className={styles.tags}>
                    {general.specialty && <span className={styles.tag}>{general.specialty}</span>}
                    {general.loyaltyState && <span className={styles.tag}>{general.loyaltyState}</span>}
                    {general.posts?.map((post) => (
                      <span key={post} className={`${styles.tag} ${styles.postTag}`} data-testid="character-post-general">
                        {post}
                      </span>
                    ))}
                  </div>
                </div>

                {general.attrs && (
                  <div className={styles.attrs}>
                    <div className={styles.attr}><span className={styles.attrLabel}>武</span><span className={styles.attrValue}>{general.attrs.wu}</span></div>
                    <div className={styles.attr}><span className={styles.attrLabel}>政</span><span className={styles.attrValue}>{general.attrs.zheng}</span></div>
                    <div className={styles.attr}><span className={styles.attrLabel}>交</span><span className={styles.attrValue}>{general.attrs.jiao}</span></div>
                    <div className={styles.attr}><span className={styles.attrLabel}>谋</span><span className={styles.attrValue}>{general.attrs.mou}</span></div>
                    <div className={styles.attr}><span className={styles.attrLabel}>学</span><span className={styles.attrValue}>{general.attrs.xue}</span></div>
                    <div className={styles.attr}><span className={styles.attrLabel}>魄</span><span className={styles.attrValue}>{general.attrs.po}</span></div>
                  </div>
                )}

                <div className={styles.actions}>
                  {isCommanderOrWarrior && (
                    <button
                      className={styles.button}
                      onClick={() => handleAssignPost(general.id, 'general')}
                      data-testid={`character-card-${general.id}-assign-general`}
                    >
                      任大将军
                    </button>
                  )}
                  {isDiplomat && (
                    <button
                      className={styles.button}
                      onClick={() => handleAssignPost(general.id, 'chancellor')}
                      data-testid={`character-card-${general.id}-assign-chancellor`}
                    >
                      任相国
                    </button>
                  )}
                  {isAdministratorOrReformer && (
                    <>
                      <select
                        className={styles.select}
                        value={selectedSiteIds[general.id] || ''}
                        onChange={(e) => setSelectedSiteIds({ ...selectedSiteIds, [general.id]: e.target.value })}
                      >
                        <option value="">选择邑...</option>
                        {ownedSites.map((site) => (
                          <option key={site.id} value={site.id}>{site.name}</option>
                        ))}
                      </select>
                      <button
                        className={styles.button}
                        onClick={() => handleAssignGovernor(general.id)}
                        disabled={!selectedSiteIds[general.id]}
                        data-testid={`character-card-${general.id}-assign-governor`}
                      >
                        任太守
                      </button>
                    </>
                  )}
                  {hasPosts && (
                    <button
                      className={styles.button}
                      onClick={() => handleUnassignPost(general.id, general.posts![0]!)}
                    >
                      解任
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
