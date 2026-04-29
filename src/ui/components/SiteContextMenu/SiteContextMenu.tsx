/* eslint-disable max-lines-per-function */
import { useEffect, useRef } from 'react'
import { useGameStore } from '~/ui/store'
import { selectContextMenu, selectIdlePlayerArmies, selectPlayerRealm } from '~/ui/store/selectors'
import { isAtWar } from '~/engine/wars'
import styles from './SiteContextMenu.module.css'

export function SiteContextMenu() {
  const contextMenu = useGameStore(selectContextMenu)
  const idleArmies = useGameStore(selectIdlePlayerArmies)
  const playerRealm = useGameStore(selectPlayerRealm)
  const world = useGameStore(state => state.world)
  const closeContextMenu = useGameStore(state => state.closeContextMenu)
  const issueOrder = useGameStore(state => state.issueOrder)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu, closeContextMenu])

  if (!contextMenu || !playerRealm) return null

  const { siteId, x, y } = contextMenu
  const site = world.sites.get(siteId)
  if (!site) return null

  const isOwnSite = site.ownerId === playerRealm.id
  
  // Find idle armies adjacent to this site
  const adjacentIdleArmies = idleArmies.filter(army => {
    const armySite = world.sites.get(army.location)
    return armySite?.adjacency.includes(siteId)
  })

  const alreadyAtWar = site.ownerId
    ? isAtWar(world.wars, playerRealm.id, site.ownerId)
    : false

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      data-testid="site-context-menu"
      style={{ left: x, top: y }}
    >
      {isOwnSite ? (
        <button className={styles.itemDisabled} disabled>
          驻军详情（未来功能）
        </button>
      ) : adjacentIdleArmies.length === 0 ? (
        <button className={styles.itemDisabled} disabled>
          无空闲军团
        </button>
      ) : (
        <>
          {alreadyAtWar ? (
            <div>
              <div className={styles.label} data-testid="menu-march">进军 →</div>
              {adjacentIdleArmies.map(army => (
                <button
                  key={army.id}
                  data-testid={`menu-army-${army.id}`}
                  className={styles.item}
                  onClick={() => {
                    issueOrder({ type: 'march', armyId: army.id, targetSiteId: siteId })
                    closeContextMenu()
                  }}
                >
                  {army.id} ({army.manpower.toLocaleString()})
                </button>
              ))}
            </div>
          ) : (
            <div>
              <div className={styles.label} data-testid="menu-declare-war">宣战并进军 →</div>
              {adjacentIdleArmies.map(army => (
                <button
                  key={army.id}
                  data-testid={`menu-army-${army.id}`}
                  className={styles.item}
                  onClick={() => {
                    issueOrder({ type: 'declareWarAndMarch', armyId: army.id, targetSiteId: siteId })
                    closeContextMenu()
                  }}
                >
                  {army.id} ({army.manpower.toLocaleString()})
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
