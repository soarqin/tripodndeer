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
import { useEffect, useState } from 'react'
import { cosineSimilarity } from '~/engine/systems/culture/ideology-distance'
import { M6_PRESTIGE_DIFFERENTIAL_WEIGHT, M6_IDEOLOGY_DISTANCE_WEIGHT, M7_FAILURE_ATTITUDE_DELTA, M7_FAILURE_TRUST_DELTA } from '~/content/m2/balance'
import { buildHintModalPayload } from '@/ui/components/HintModal/buildHintModalPayload'
import { HINTS } from '@/content/m10_2/hints'
import { getCurrentScenarioId } from '@/ui/coordinator/use-hint-coordinator'

const HINT_ID = 'hint_alliance'

const ACTION_LABELS: Record<string, string> = {
  envoy: '遣使',
  alliance: '盟约',
  non_aggression: '互不侵犯',
  tribute: '朝贡',
  marriage: '联姻',
  declare_war: '宣战',
  peace: '议和',
}

const REJECTION_REASONS: Record<string, string> = {
  truce_active: '停战期内不可宣战',
  current_war: '正在交战',
  duplicate_proposal: '已有同类提案',
  already_allied: '已缔结盟约',
  missing_casus_belli: '缺少战争借口',
}

const STATUS_LABELS: Record<string, string> = {
  submitted: '已提交',
  accepted: '已接受',
  rejected: '已拒绝',
}

export function DiplomacyPanel() {
  const targetRealmId = useGameStore(selectDiplomacyTargetRealmId)
  const activePanel = useGameStore(state => state.activePanel)
  const playerRealm = useGameStore(selectPlayerRealm)
  const closeDiplomacyPanel = useGameStore(state => state.closeDiplomacyPanel)
  const setActivePanel = useGameStore(state => state.setActivePanel)
  const submitPlayerDiplomacyAction = useGameStore(state => state.submitPlayerDiplomacyAction)
  const openPeacePanel = useGameStore(state => state.openPeacePanel)
  const relationSummaries = useGameStore(selectDiplomacyRelationSummaries)
  const feedbackList = useGameStore(selectDiplomacyFeedback)
  const coalitionPressure = useGameStore(selectCoalitionPressure)
  const zhouInvestiture = useGameStore(selectPlayerZhouInvestiture)
  const world = useGameStore(state => state.world)
  const seenHints = useGameStore(state => state.seenHints)
  const hintsEnabled = useGameStore(state => state.hintsEnabled)
  const openModal = useGameStore(state => state.openModal)
  const markHintSeen = useGameStore(state => state.markHintSeen)
  const closeModal = useGameStore(state => state.closeModal)
  const openCodex = useGameStore(state => state.openCodex)
  const targetRealm = useGameStore(state => targetRealmId ? state.world.realms.get(targetRealmId) : undefined)

  const isVisible = (targetRealmId !== null || activePanel === 'waijiao') && playerRealm !== undefined
  useEffect(() => { if (isVisible) useGameStore.getState().recordPanelOpened('diplomacy') }, [isVisible])

  useEffect(() => {
    if (!hintsEnabled) return
    if (getCurrentScenarioId(world) !== 'm9') return
    if (seenHints[HINT_ID]) return

    const entry = HINTS.find(h => h.id === HINT_ID)
    if (!entry) return

    openModal(buildHintModalPayload(
      entry,
      () => { markHintSeen(HINT_ID); closeModal(); openCodex(entry.codexEntryId) },
      () => { markHintSeen(HINT_ID); closeModal() },
    ))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [localFeedback, setLocalFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  if ((!targetRealmId && activePanel !== 'waijiao') || !playerRealm) return null

  let ideologyBonus = 0
  let prestigeDiff = 0
  if (targetRealm) {
    const proposerPrestige = playerRealm.prestige ?? 0
    const targetPrestige = targetRealm.prestige ?? 0
    prestigeDiff = Math.round(M6_PRESTIGE_DIFFERENTIAL_WEIGHT * (proposerPrestige - targetPrestige))

    const proposerLean = playerRealm.ideologyLean
    const targetLean = targetRealm.ideologyLean
    if (proposerLean && targetLean) {
      const similarity = cosineSimilarity(proposerLean, targetLean)
      ideologyBonus = Math.round(M6_IDEOLOGY_DISTANCE_WEIGHT * similarity)
    }
  }

  const summary = targetRealmId ? relationSummaries.find(s => s.counterpartRealmId === targetRealmId) : undefined
  
  // If no summary exists, we still need to show the panel with default values
  const displaySummary = summary || {
    counterpartRealmId: targetRealmId || '',
    counterpartRealmName: targetRealmId || '请选择势力',
    attitude: 0,
    trust: 0,
    atWar: false,
    activeTreatyIds: [],
    pendingProposalIds: [],
    hasActiveTruce: false,
  }

  const targetFeedback = targetRealmId ? feedbackList.filter(f => f.targetRealmId === targetRealmId) : []
  const latestFeedback = targetFeedback[targetFeedback.length - 1]

  const handleClose = () => {
    closeDiplomacyPanel()
    if (activePanel === 'waijiao') {
      setActivePanel(null)
    }
  }

  const handleAction = (kind: 'envoy' | 'alliance' | 'non_aggression' | 'tribute' | 'marriage' | 'declare_war' | 'peace') => {
    if (!targetRealmId) {
      setLocalFeedback({ ok: false, message: '请先选择目标势力' })
      return
    }
    if (kind === 'peace') {
      openPeacePanel()
      return
    }
    const result = submitPlayerDiplomacyAction({
      kind,
      targetRealmId,
    })
    
    if (result.ok) {
      setLocalFeedback({ ok: true, message: `行动已提交：${ACTION_LABELS[kind] || kind}` })
    } else {
      const reasonText = result.reason ? (REJECTION_REASONS[result.reason] || '行动暂不可用') : '行动暂不可用'
      setLocalFeedback({ ok: false, message: `已拒绝：${reasonText}` })
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} data-testid="diplomacy-panel">
        <div className={styles.header}>
          <h2>外交: {displaySummary.counterpartRealmName}</h2>
          <button className={styles.closeBtn} onClick={handleClose}>X</button>
        </div>

        <div className={styles.content}>
          <div className={styles.section} data-testid="diplomacy-relation-summary">
            <h3>关系摘要</h3>
            <p>态度: {displaySummary.attitude}</p>
            <p>信任: {displaySummary.trust}</p>
            <p>状态: {displaySummary.atWar ? '交战中' : '和平'}</p>
            {zhouInvestiture && <p>周天子册封: {zhouInvestiture.recognizedTitle}</p>}
            {coalitionPressure.length > 0 && <p>面临合纵压力</p>}
            <p className={styles.spyPenaltyNote} title="间者被发现时的外交惩罚">
              谍者暴露惩罚: {M7_FAILURE_ATTITUDE_DELTA} 态度 / {M7_FAILURE_TRUST_DELTA} 信任
            </p>
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
                遣使
              </button>
              <button 
                data-testid="diplomacy-action-alliance"
                onClick={() => handleAction('alliance')}
              >
                盟约
              </button>
              <button 
                data-testid="diplomacy-action-non_aggression"
                onClick={() => handleAction('non_aggression')}
              >
                互不侵犯
              </button>
              <button 
                data-testid="diplomacy-action-tribute"
                onClick={() => handleAction('tribute')}
              >
                朝贡
              </button>
              <button 
                data-testid="diplomacy-action-marriage"
                onClick={() => handleAction('marriage')}
              >
                联姻
              </button>
              <button 
                data-testid="diplomacy-action-declare_war"
                onClick={() => handleAction('declare_war')}
              >
                宣战
              </button>
              <button 
                data-testid="diplomacy-action-peace"
                onClick={() => handleAction('peace')}
              >
                议和
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
                {latestFeedback.status === 'rejected' ? (
                  <p>已拒绝：{latestFeedback.reason ? (REJECTION_REASONS[latestFeedback.reason] || '行动暂不可用') : '行动暂不可用'}</p>
                ) : (
                  <>
                    <p>最新状态: {STATUS_LABELS[latestFeedback.status] || '处理中'}</p>
                    {latestFeedback.acceptanceScore !== null && (
                      <p>
                        接受度:{' '}
                        <span title={`意识形态相近 +${ideologyBonus} / 威望差 ${prestigeDiff}`}>
                          {latestFeedback.acceptanceScore}
                        </span>
                      </p>
                    )}
                    {latestFeedback.reason && <p>原因: {REJECTION_REASONS[latestFeedback.reason] || '行动暂不可用'}</p>}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
