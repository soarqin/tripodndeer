import React from 'react'
import { useGameStore } from '~/ui/store/game-store'
import type { FactionId } from '~/shared/types'

const FACTION_DISPLAY_NAMES: Record<FactionId, string> = {
  royal_kin: '君党',
  noble_clans: '公族',
  military_meritocracy: '军功派',
  reformists: '改革派',
  conservatives: '守旧派',
  foreign_clients: '外姓客卿',
}

export function FactionStatusView() {
  const world = useGameStore(s => s.world)
  
  if (!world) return null
  
  const factionState = world.factionInfluences.get(world.playerRealmId)
  
  if (!factionState) return (
    <div data-testid="faction-status">
      <p>派系数据加载中...</p>
    </div>
  )
  
  const factionIds: FactionId[] = [
    'royal_kin',
    'noble_clans',
    'military_meritocracy',
    'reformists',
    'conservatives',
    'foreign_clients'
  ]
  
  return (
    <div data-testid="faction-status">
      <h3>派系势力</h3>
      {factionIds.map(fid => {
        const influence = factionState.influences.get(fid) ?? 0
        return (
          <div key={fid} data-testid={`faction-bar-${fid}`}>
            <span>{FACTION_DISPLAY_NAMES[fid] ?? fid}</span>
            <div style={{ width: '100%', background: '#eee', height: 8 }}>
              <div style={{ width: `${influence}%`, background: '#4a90d9', height: 8 }} />
            </div>
            <span>{Math.round(influence)}</span>
          </div>
        )
      })}
    </div>
  )
}
