/* eslint-disable max-lines-per-function */
import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '~/ui/store'
import { selectContextMenu, selectIdlePlayerArmies, selectPlayerRealm } from '~/ui/store/selectors'
import { isAtWar } from '~/engine/wars'
import styles from './SiteContextMenu.module.css'
import casusBelliData from '~/content/m2/casus-belli.json'

export function SiteContextMenu() {
  const contextMenu = useGameStore(selectContextMenu)
  const idleArmies = useGameStore(selectIdlePlayerArmies)
  const playerRealm = useGameStore(selectPlayerRealm)
  const world = useGameStore(state => state.world)
  const closeContextMenu = useGameStore(state => state.closeContextMenu)
  const issueOrder = useGameStore(state => state.issueOrder)
  const menuRef = useRef<HTMLDivElement>(null)
  const [showCasusBelliPicker, setShowCasusBelliPicker] = useState(false)

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

  // Reset state when context menu changes
  useEffect(() => {
    setShowCasusBelliPicker(false)
  }, [contextMenu])

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

  const handleDeclareWar = (casusBelliId: string) => {
    if (!site.ownerId) return
    issueOrder({ type: 'declare-war', targetRealmId: site.ownerId, casusBelli: casusBelliId })
    closeContextMenu()
  }

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
      ) : (
        <>
          {alreadyAtWar ? (
            adjacentIdleArmies.length === 0 ? (
              <button className={styles.itemDisabled} disabled>
                无空闲军团
              </button>
            ) : (
              <div>
                <div className={styles.label} data-testid="menu-march">派兵攻击</div>
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
            )
          ) : showCasusBelliPicker ? (
            <div data-testid="casus-belli-picker">
              <div className={styles.label}>选择宣战借口</div>
              {casusBelliData.map(cb => (
                <button
                  key={cb.id}
                  className={styles.item}
                  onClick={() => handleDeclareWar(cb.id)}
                >
                  {cb.name}
                </button>
              ))}
              <button
                className={styles.item}
                onClick={() => handleDeclareWar('none')}
              >
                ⚠️ 无故入侵
              </button>
            </div>
          ) : (
            <div>
              <button
                className={styles.item}
                data-testid="menu-declare-war-btn"
                onClick={() => setShowCasusBelliPicker(true)}
              >
                宣战
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
