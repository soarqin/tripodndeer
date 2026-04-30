import { useState, useMemo } from 'react'
import { useGameStore } from '~/ui/store'
import { selectPlayerRealm } from '~/ui/store/selectors'
import { scoreProposalAcceptance } from '~/engine/systems/peace/proposal-lifecycle'
import type { PeaceTerm, RealmId, SiteId, PeaceProposal } from '~/shared/types'
import styles from './PeacePanel.module.css'

interface PeacePanelProps {
  targetRealmId: RealmId
  onClose: () => void
}

export function PeacePanel({ targetRealmId, onClose }: PeacePanelProps) {
  const world = useGameStore(state => state.world)
  const playerRealm = useGameStore(selectPlayerRealm)
  const issueOrder = useGameStore(state => state.issueOrder)

  const [selectedSites, setSelectedSites] = useState<Set<SiteId>>(new Set())
  const [indemnity, setIndemnity] = useState<number>(0)
  const [tributeAmount, setTributeAmount] = useState<number>(0)
  const [tributeYears, setTributeYears] = useState<number>(1)

  const targetRealm = world.realms.get(targetRealmId)

  // Find occupied sites: owned by target, occupied by player
  const occupiedSites = useMemo(() => {
    if (!playerRealm) return []
    return [...world.sites.values()].filter(
      site => site.ownerId === targetRealmId && site.occupation?.occupierId === playerRealm.id
    )
  }, [world.sites, targetRealmId, playerRealm])

  if (!playerRealm || !targetRealm) return null

  const handleSiteToggle = (siteId: SiteId) => {
    const next = new Set(selectedSites)
    if (next.has(siteId)) {
      next.delete(siteId)
    } else {
      next.add(siteId)
    }
    setSelectedSites(next)
  }

  // Build terms
  const terms: PeaceTerm[] = []
  if (selectedSites.size > 0) {
    terms.push({
      type: 'cession',
      payload: { siteIds: Array.from(selectedSites) }
    })
  }
  if (indemnity > 0) {
    terms.push({
      type: 'indemnity',
      payload: { amount: indemnity }
    })
  }
  if (tributeAmount > 0) {
    terms.push({
      type: 'tribute',
      payload: { amountPerYear: tributeAmount, years: tributeYears }
    })
  }

  // Calculate score
  const mockProposal: PeaceProposal = {
    id: 'mock',
    proposingRealmId: playerRealm.id,
    targetRealmId,
    terms,
    proposedAt: world.date,
    status: 'pending',
    acknowledgedAt: null
  }
  
  const score = scoreProposalAcceptance(world, mockProposal)
  const isLikelyToAccept = score >= 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    issueOrder({
      type: 'propose-peace',
      peaceProposalData: {
        proposalId: `peace_${Date.now()}`,
        proposingRealmId: playerRealm.id,
        targetRealmId,
        terms
      }
    })
    
    onClose()
  }

  return (
    <div className={styles.panel} data-testid="peace-panel">
      <div className={styles.header}>
        <div className={styles.title}>向 {targetRealm.displayName} 提议和平</div>
        <button className={styles.closeButton} onClick={onClose} data-testid="close-btn">×</button>
      </div>

      <form onSubmit={handleSubmit} className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>割让邑 (Cession)</div>
          {occupiedSites.length === 0 ? (
            <div className={styles.emptyText}>没有占领的邑</div>
          ) : (
            <div className={styles.checkboxList}>
              {occupiedSites.map(site => (
                <label key={site.id} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    checked={selectedSites.has(site.id)}
                    onChange={() => handleSiteToggle(site.id)}
                    data-testid={`cession-site-${site.id}`}
                  />
                  {site.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>战争赔款 (Indemnity)</div>
          <div className={styles.field}>
            <label className={styles.label}>金额 (0 - 100000)</label>
            <input
              type="number"
              className={styles.input}
              min="0"
              max="100000"
              value={indemnity}
              onChange={e => setIndemnity(Number(e.target.value))}
              data-testid="indemnity-input"
            />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>朝贡 (Tribute)</div>
          <div className={styles.field}>
            <label className={styles.label}>每年金额 (0 - 5000)</label>
            <input
              type="number"
              className={styles.input}
              min="0"
              max="5000"
              value={tributeAmount}
              onChange={e => setTributeAmount(Number(e.target.value))}
              data-testid="tribute-amount-input"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>持续年数 (1 - 10)</label>
            <input
              type="number"
              className={styles.input}
              min="1"
              max="10"
              value={tributeYears}
              onChange={e => setTributeYears(Number(e.target.value))}
              data-testid="tribute-years-input"
            />
          </div>
        </div>
      </form>

      <div className={styles.footer}>
        <div className={styles.score} data-testid="acceptance-score">
          接受意愿: 
          <span className={`${styles.scoreValue} ${isLikelyToAccept ? styles.scorePositive : styles.scoreNegative}`}>
            {score.toFixed(1)}
          </span>
        </div>
        <button 
          type="submit" 
          className={styles.submitButton} 
          onClick={handleSubmit}
          data-testid="submit-btn"
        >
          发送提议
        </button>
      </div>
    </div>
  )
}
