import React from 'react'
import { useGameStore } from '~/ui/store/game-store'

export function TradePanelView() {
  const world = useGameStore(s => s.world)
  
  if (!world) return null
  
  const playerRealmId = world.playerRealmId
  const playerRoutes = [...world.tradeRoutes.values()].filter(
    r => r.fromRealmId === playerRealmId || r.toRealmId === playerRealmId
  )
  const activeRoutes = playerRoutes.filter(r => r.status === 'active')
  const cutRoutes = playerRoutes.filter(r => r.status === 'cut')
  
  return (
    <div data-testid="trade-panel">
      <h3>商路</h3>
      <div>
        {activeRoutes.map(route => (
          <div key={route.id} data-testid={`trade-route-${route.id}`}>
            {route.fromSiteId} ↔ {route.toSiteId} ({route.baseIncomePerXun}/旬)
          </div>
        ))}
      </div>
      {cutRoutes.length > 0 && (
        <div>
          <h4>已断商路</h4>
          {cutRoutes.map(route => (
            <div key={route.id} data-testid={`trade-route-${route.id}`} style={{ opacity: 0.5 }}>
              {route.fromSiteId} ↔ {route.toSiteId} (已断)
            </div>
          ))}
        </div>
      )}
      <button data-testid="trade-establish-btn" style={{ display: 'none' }}>建立新商路</button>
    </div>
  )
}
