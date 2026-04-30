import { useGameStore } from '~/ui/store'
import {
  selectDiplomacyTargetRealmId,
  selectPlayerRealm,
  selectDiplomacyRelationSummaries,
  selectDiplomacyFeedback,
  selectCoalitionPressure,
  selectPlayerZhouInvestiture,
} from '~/ui/store/selectors'
import styles from './DiplomacyPanel.module.css'
import { useState } from 'react'

export function DiplomacyPanel() {
  const targetRealmId = useGameStore(selectDiplomacyTargetRealmId)
  const playerRealm = useGameStore(selectPlayerRealm)
  const closeDiplomacyPanel = useGameStore(state => state.closeDiplomacyPanel)
  const submitPlayerDiplomacyAction = useGameStore(state => state.submitPlayerDiplomacyAction)
  const relationSummaries = useGameStore(selectDiplomacyRelationSummaries)
  const feedbackList = useGameStore(selectDiplomacyFeedback)
  const coalitionPressure = useGameStore(selectCoalitionPressure)
  const zhouInvestiture = useGameStore(selectPlayerZhouInvestiture)

  const [localFeedback, setLocalFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  if (!targetRealmId || !playerRealm) return null

  const summary = relationSummaries.find(s => s.counterpartRealmId === targetRealmId)
  
  // If no summary exists, we still need to show the panel with default values
  const displaySummary = summary || {
    counterpartRealmId: targetRealmId,
    counterpartRealmName: targetRealmId,
    attitude: 0,
    trust: 0,
    atWar: false,
    activeTreatyIds: [],
    pendingProposalIds: [],
    hasActiveTruce: false,
  }

  const targetFeedback = feedbackList.filter(f => f.targetRealmId === targetRealmId)
  const latestFeedback = targetFeedback[targetFeedback.length - 1]

  const handleAction = (kind: 'envoy' | 'alliance' | 'peace') => {
    const result = submitPlayerDiplomacyAction({
      kind,
      targetRealmId,
    })
    
    if (result.ok) {
      setLocalFeedback({ ok: true, message: `Action submitted: ${kind}` })
    } else {
      setLocalFeedback({ ok: false, message: `Rejected: ${result.reason}` })
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} data-testid="diplomacy-panel">
        <div className={styles.header}>
          <h2>外交: {displaySummary.counterpartRealmName}</h2>
          <button className={styles.closeBtn} onClick={closeDiplomacyPanel}>X</button>
        </div>

        <div className={styles.content}>
          <div className={styles.section} data-testid="diplomacy-relation-summary">
            <h3>关系摘要</h3>
            <p>态度: {displaySummary.attitude}</p>
            <p>信任: {displaySummary.trust}</p>
            <p>状态: {displaySummary.atWar ? '交战中' : '和平'}</p>
            {zhouInvestiture && <p>周天子册封: {zhouInvestiture.recognizedTitle}</p>}
            {coalitionPressure.length > 0 && <p>面临合纵压力</p>}
          </div>

          <div className={styles.section} data-testid="diplomacy-active-treaties">
            <h3>活跃条约</h3>
            {displaySummary.activeTreatyIds.length > 0 ? (
              <ul>
                {displaySummary.activeTreatyIds.map(id => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            ) : (
              <p>无</p>
            )}
            {displaySummary.hasActiveTruce && <p>停战期内</p>}
          </div>

          <div className={styles.section}>
            <h3>可用行动</h3>
            <div className={styles.actions}>
              <button 
                data-testid="diplomacy-action-envoy"
                onClick={() => handleAction('envoy')}
              >
                派遣使节
              </button>
              <button 
                data-testid="diplomacy-action-alliance"
                onClick={() => handleAction('alliance')}
              >
                提议结盟
              </button>
              <button 
                data-testid="diplomacy-action-peace"
                onClick={() => handleAction('peace')}
              >
                提议议和
              </button>
            </div>
          </div>

          <div className={styles.section} data-testid="diplomacy-feedback">
            <h3>反馈</h3>
            {localFeedback && (
              <p className={localFeedback.ok ? styles.success : styles.error}>
                {localFeedback.message}
              </p>
            )}
            {latestFeedback && (
              <div className={styles.latestFeedback}>
                <p>最新状态: {latestFeedback.status}</p>
                {latestFeedback.reason && <p>原因: {latestFeedback.reason}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
