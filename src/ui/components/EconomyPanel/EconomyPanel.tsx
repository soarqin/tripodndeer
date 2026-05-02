import { useState } from 'react'
import { useGameStore } from '~/ui/store'
import { M5_GOVERNOR_TAX_BONUS_PER_ZHENG } from '~/content/m2/balance'
import type { PoliticalSystem } from '~/shared/types'
import {
  selectActivePanel,
  selectPlayerTreasury,
  selectPlayerFoodStores,
  selectPlayerTaxRate,
  selectPlayerMonthlyEconomyDeltas,
  selectPlayerOwnedSiteEconomyTotals,
  selectPlayerActiveEdicts,
  selectPlayerGovernorAssignments,
  selectPlayerActiveReform,
  selectPlayerReformTraits,
  selectPlayerPoliticalSystem,
  useSites,
  useGenerals,
} from '~/ui/store/selectors'
import styles from './EconomyPanel.module.css'

function politicalSystemLabel(system: PoliticalSystem): string {
  const labels: Record<PoliticalSystem, string> = {
    enfeoffment: '分封制',
    commandery: '郡县制',
    legalist_centralized: '法家集权',
  }
  return labels[system]
}

function traitDisplayName(trait: string): string {
  const names: Record<string, string> = {
    shang_yang_reform_done: '商鞅变法',
    hu_fu_qi_she_done: '胡服骑射',
    li_kui_reform_done: '李悝变法',
    wu_qi_failed_legacy: '吴起遗志',
    chu_wu_qi_legacy_done: '楚国吴起遗志',
    qi_jixia_reform_done: '稷下变制',
    han_shen_buhai_done: '申不害术治',
    reform_failed_scar: '变法失败之痛',
  }
  return names[trait] ?? trait
}

interface ReformSectionProps {
  politicalSystem: PoliticalSystem
  reformTraits: readonly string[]
  activeReformId: string | null
}

function ReformSection({ politicalSystem, reformTraits, activeReformId }: ReformSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>变法 (Reforms)</div>
      <div className={styles.statRow}>
        <span className={styles.label}>政治体制</span>
        <span className={styles.value} data-testid="political-system-display">
          {politicalSystemLabel(politicalSystem)}
        </span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.label}>变法特质</span>
        <span className={styles.value} data-testid="reform-trait-list">
          {reformTraits.length > 0 ? (
            reformTraits.map(trait => (
              <span key={trait} className={styles.traitBadge}>
                {traitDisplayName(trait)}
              </span>
            ))
          ) : (
            '无'
          )}
        </span>
      </div>
      {activeReformId && (
        <div className={styles.statRow}>
          <span className={styles.label}>进行中</span>
          <span className={styles.value}>{activeReformId}</span>
        </div>
      )}
    </div>
  )
}

export function EconomyPanel() {
  const activePanel = useGameStore(selectActivePanel)
  const playerRealmId = useGameStore((s) => s.playerRealmId)
  const treasury = useGameStore(selectPlayerTreasury)
  const foodStores = useGameStore(selectPlayerFoodStores)
  const taxRate = useGameStore(selectPlayerTaxRate)
  const deltas = useGameStore(selectPlayerMonthlyEconomyDeltas)
  const totals = useGameStore(selectPlayerOwnedSiteEconomyTotals)
  const activeEdicts = useGameStore(selectPlayerActiveEdicts)
  const governorAssignments = useGameStore(selectPlayerGovernorAssignments)
  const activeReform = useGameStore(selectPlayerActiveReform)
  const reformTraits = useGameStore(selectPlayerReformTraits)
  const politicalSystem = useGameStore(selectPlayerPoliticalSystem)
  const sites = useSites()
  const generals = useGenerals()
  const activatePlayerEdict = useGameStore((s) => s.activatePlayerEdict)
  const assignPlayerGovernor = useGameStore((s) => s.assignPlayerGovernor)
  const tick = useGameStore((s) => s.world.tick)
  const pendingOrdersCount = useGameStore((s) => s.world.pendingOrders.length)
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [selectedGeneralId, setSelectedGeneralId] = useState<string>('')
  if (activePanel !== 'neizheng') return null
  const ownedSites = [...sites.values()].filter((s) => s.ownerId === playerRealmId)
  const playerGenerals = [...generals.values()].filter((g) => g.realmId === playerRealmId)
  const assignedGeneralIds = new Set(governorAssignments.map((a) => a.generalId))
  const availableGenerals = playerGenerals.filter((g) => !assignedGeneralIds.has(g.id))
  const handleActivateTaxRelief = () => activatePlayerEdict({
    edictId: `edict_${tick}_tax_${activeEdicts.length}_${pendingOrdersCount}`,
    kind: 'edict_tax_relief',
    durationMonths: 3,
  })
  const handleActivateGrainReserve = () => activatePlayerEdict({
    edictId: `edict_${tick}_grain_${activeEdicts.length}_${pendingOrdersCount}`,
    kind: 'edict_grain_reserve',
    durationMonths: 3,
  })
  const handleAssignGovernor = () => {
    if (!selectedSiteId || !selectedGeneralId) return
    assignPlayerGovernor({ siteId: selectedSiteId, generalId: selectedGeneralId })
    setSelectedGeneralId('')
  }
  const isAssignDisabled = !selectedSiteId || !selectedGeneralId || availableGenerals.length === 0

  return (
    <div className={styles.panel} data-testid="economy-panel">
      <div className={styles.header}>M4 Economy</div>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>国库与粮仓</div>
          <div className={styles.statRow}>
            <span className={styles.label}>资金 (Treasury)</span>
            <span className={styles.value}>{treasury.toLocaleString()}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.label}>月收支 (Treasury Delta)</span>
            <span className={`${styles.value} ${deltas.treasuryDelta >= 0 ? styles.positive : styles.negative}`}>
              {deltas.treasuryDelta > 0 ? '+' : ''}{deltas.treasuryDelta.toLocaleString()}
            </span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.label}>粮草 (Food Stores)</span>
            <span className={styles.value}>{foodStores.toLocaleString()}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.label}>月收支 (Food Delta)</span>
            <span className={`${styles.value} ${deltas.foodStoresDelta >= 0 ? styles.positive : styles.negative}`}>
              {deltas.foodStoresDelta > 0 ? '+' : ''}{deltas.foodStoresDelta.toLocaleString()}
            </span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.label}>税率 (Tax Rate)</span>
            <span className={styles.value}>{taxRate}%</span>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>人口与户数</div>
          <div className={styles.statRow}>
            <span className={styles.label}>总人口 (Population)</span>
            <span className={styles.value}>{totals.population.toLocaleString()}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.label}>月增长 (Pop Delta)</span>
            <span className={`${styles.value} ${deltas.populationDelta >= 0 ? styles.positive : styles.negative}`}>
              {deltas.populationDelta > 0 ? '+' : ''}{deltas.populationDelta.toLocaleString()}
            </span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.label}>总户数 (Households)</span>
            <span className={styles.value}>{totals.households.toLocaleString()}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.label}>月增长 (Households Delta)</span>
            <span className={`${styles.value} ${deltas.householdsDelta >= 0 ? styles.positive : styles.negative}`}>
              {deltas.householdsDelta > 0 ? '+' : ''}{deltas.householdsDelta.toLocaleString()}
            </span>
          </div>
        </div>

        <ReformSection
          politicalSystem={politicalSystem}
          reformTraits={reformTraits}
          activeReformId={activeReform?.reformId ?? null}
        />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>政令 (Edicts)</div>
          <div className={styles.buttonGroup}>
            <button className={styles.button} onClick={handleActivateTaxRelief}>
              Activate Tax Relief
            </button>
            <button className={styles.button} onClick={handleActivateGrainReserve}>
              Activate Grain Reserve
            </button>
          </div>
          {activeEdicts.length > 0 && (
            <div className={styles.edictList}>
              {activeEdicts.map((edict) => (
                <div key={edict.id} className={styles.edictItem}>
                  <span>{edict.kind === 'edict_tax_relief' ? '免税' : '开仓放粮'}</span>
                  <span>剩余 {edict.remainingMonths} 月</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>邑与太守 (Sites & Governors)</div>
          <div className={styles.governorForm}>
            <select
              className={styles.select}
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              aria-label="Select Site"
            >
              <option value="">选择邑...</option>
              {ownedSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              value={selectedGeneralId}
              onChange={(e) => setSelectedGeneralId(e.target.value)}
              aria-label="Select General"
            >
              <option value="">选择将领...</option>
              {availableGenerals.map((general) => (
                <option key={general.id} value={general.id}>
                  {general.name}
                </option>
              ))}
            </select>
            <button
              className={styles.button}
              onClick={handleAssignGovernor}
              disabled={isAssignDisabled}
            >
              Assign Governor
            </button>
          </div>
          {availableGenerals.length === 0 && (
            <div className={styles.errorMsg}>无可用将领</div>
          )}

          <div className={styles.siteList}>
            {ownedSites.map((site) => {
              const assignment = governorAssignments.find((a) => a.siteId === site.id)
              const governor = assignment ? generals.get(assignment.generalId) : null
              return (
                <div key={site.id} className={styles.siteCard}>
                  <div className={styles.siteHeader}>
                    <span>{site.name}</span>
                    <span>
                      {governor ? (
                        <>
                          太守: {governor.name}
                          <span data-testid="governor-tax-bonus">
                            {' '}
                            +{Math.floor(M5_GOVERNOR_TAX_BONUS_PER_ZHENG * (governor.attrs?.zheng ?? 0))}
                          </span>
                        </>
                      ) : (
                        '无太守'
                      )}
                    </span>
                  </div>
                  <div className={styles.siteStats}>
                    <span>人口: {site.economy.population.toLocaleString()}</span>
                    <span>户数: {site.economy.households.toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
