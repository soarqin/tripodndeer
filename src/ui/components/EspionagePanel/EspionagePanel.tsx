import { useState } from 'react'
import { useGameStore } from '~/ui/store/game-store'
import type { World } from '~/shared/types'
import { makeCoverageKey } from '~/shared/types'
import { M7_COVERAGE_TIER_1, M7_COVERAGE_TIER_2, M7_COVERAGE_TIER_3 } from '~/content/m2/balance'
import styles from './EspionagePanel.module.css'

type EspionageTab = 'agents' | 'operations' | 'intelligence'

export function EspionagePanel() {
  const [activeTab, setActiveTab] = useState<EspionageTab>('agents')
  const world = useGameStore(s => s.world)
  const playerRealmId = world?.playerRealmId
  
  return (
    <div data-testid="espionage-panel" className={styles.espionagePanel}>
      <div className={styles.tabs}>
        <button 
          data-testid="espionage-tab-agents"
          onClick={() => setActiveTab('agents')}
          className={activeTab === 'agents' ? styles.active : ''}
        >谍者</button>
        <button 
          data-testid="espionage-tab-operations"
          onClick={() => setActiveTab('operations')}
          className={activeTab === 'operations' ? styles.active : ''}
        >行动</button>
        <button 
          data-testid="espionage-tab-intelligence"
          onClick={() => setActiveTab('intelligence')}
          className={activeTab === 'intelligence' ? styles.active : ''}
        >情报</button>
      </div>
      
      <div className={styles.content}>
        {activeTab === 'agents' && <AgentsTab world={world} playerRealmId={playerRealmId} />}
        {activeTab === 'operations' && <OperationsTab world={world} playerRealmId={playerRealmId} />}
        {activeTab === 'intelligence' && <IntelligenceTab world={world} playerRealmId={playerRealmId} />}
      </div>
    </div>
  )
}

function AgentsTab({ world, playerRealmId }: { world: World | null | undefined, playerRealmId: string | undefined }) {
  if (!world || !playerRealmId) return null
  
  const spyGenerals = [...world.generals.values()].filter(
    g => g.realmId === playerRealmId && g.specialty === 'spy'
  )
  
  const activeMissions = [...world.spyMissions.values()].filter(
    m => m.spyRealmId === playerRealmId && m.status === 'in_progress'
  )
  
  return (
    <div data-testid="espionage-agents-tab" className={styles.tabContent}>
      {spyGenerals.map(general => {
        const mission = activeMissions.find(m => m.spyGeneralId === general.id)
        const statusText = mission ? `执行中: ${mission.action}` : 'idle'
        
        return (
          <div key={general.id} className={styles.row}>
            <span>{general.name}</span>
            <span>{statusText}</span>
          </div>
        )
      })}
    </div>
  )
}

function OperationsTab({ world, playerRealmId }: { world: World | null | undefined, playerRealmId: string | undefined }) {
  if (!world || !playerRealmId) return null
  
  const activeMissions = [...world.spyMissions.values()].filter(
    m => m.spyRealmId === playerRealmId && m.status === 'in_progress'
  )
  
  return (
    <div data-testid="espionage-operations-tab" className={styles.tabContent}>
      {activeMissions.map(mission => {
        const spy = world.generals.get(mission.spyGeneralId)
        const remainingTicks = mission.resolveTick - world.tick
        
        return (
          <div key={mission.id} className={styles.row}>
            <span>{spy?.name ?? mission.spyGeneralId}</span>
            <span>{mission.targetRealmId}</span>
            <span>{mission.action}</span>
            <span>{remainingTicks}旬</span>
          </div>
        )
      })}
    </div>
  )
}

function IntelligenceTab({ world, playerRealmId }: { world: World | null | undefined, playerRealmId: string | undefined }) {
  if (!world || !playerRealmId) return null
  
  const targetRealms = [...world.realms.values()].filter(r => r.id !== playerRealmId)
  
  return (
    <div data-testid="espionage-intelligence-tab" className={styles.tabContent}>
      {targetRealms.map(target => {
        const key = makeCoverageKey(playerRealmId, target.id)
        const coverage = world.intelligenceCoverage.get(key) ?? 0
        
        let tierLabel = '低'
        if (coverage >= M7_COVERAGE_TIER_3) tierLabel = '极高'
        else if (coverage >= M7_COVERAGE_TIER_2) tierLabel = '高'
        else if (coverage >= M7_COVERAGE_TIER_1) tierLabel = '中'
        
        return (
          <div key={target.id} className={styles.row}>
            <span>{target.id}</span>
            <span>{coverage}</span>
            <span>{tierLabel}</span>
          </div>
        )
      })}
    </div>
  )
}
