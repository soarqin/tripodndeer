import type { BatchReport } from './auto-battle-batch'

/**
 * Serialize BatchReport to deterministic JSON string.
 * Key order matches BatchReport interface definition: meta / outcomes / distribution / behaviorMetrics / runtime
 */
export function serializeReportToJson(report: BatchReport): string {
  return JSON.stringify(report, null, 2)
}

/**
 * Generate human-readable Markdown from BatchReport.
 * Pure mechanical transformation — no editorial logic.
 */
export function toMarkdown(report: BatchReport): string {
  const lines: string[] = []

  lines.push('# M8.3 AI Win Rate Distribution Baseline')
  lines.push('')

  // Meta section
  lines.push('## Meta')
  lines.push('')
  lines.push('| Field | Value |')
  lines.push('|---|---|')
  lines.push(`| Scenario | ${report.meta.scenarioId} |`)
  lines.push(`| Difficulty | ${report.meta.difficulty} |`)
  lines.push(`| Samples | ${report.meta.samples} |`)
  lines.push(`| Seed Range | ${report.meta.seedRange[0]}–${report.meta.seedRange[1]} |`)
  lines.push(`| Max Ticks | ${report.meta.maxTicks} |`)
  lines.push(`| Stop Condition | ${report.meta.stopCondition} |`)
  lines.push('')

  // Outcomes section
  lines.push('## Outcomes')
  lines.push('')
  lines.push(`- Unification Rate: ${(report.outcomes.unificationRate * 100).toFixed(1)}%`)
  lines.push(`- Null Winner Count: ${report.outcomes.nullWinnerCount}`)
  lines.push(`- Max Ticks Hit: ${report.outcomes.maxTicksHitCount}`)
  lines.push(`- Unattributed Actions: ${report.outcomes.unattributedActions}`)
  lines.push('')

  // Distribution table
  lines.push('## Distribution')
  lines.push('')
  lines.push('| Realm | Wins | Win Rate | Expected | In Tolerance | Active |')
  lines.push('|---|---|---|---|---|---|')
  for (const [realmId, dist] of Object.entries(report.distribution)) {
    const winRate = (dist.winRate * 100).toFixed(1) + '%'
    const expected = dist.expectedRate !== undefined ? (dist.expectedRate * 100).toFixed(0) + '%' : '—'
    const inTol = dist.inTolerance ? '✓' : '✗'
    const active = dist.active ? 'yes' : 'no'
    lines.push(`| ${realmId} | ${dist.winCount} | ${winRate} | ${expected} | ${inTol} | ${active} |`)
  }
  lines.push('')

  // Behavior Metrics section
  lines.push('## §7.3 Behavior Metrics')
  lines.push('')
  lines.push('| Archetype | Metric | Value | Sample Size |')
  lines.push('|---|---|---|---|')
  lines.push(`| Conqueror | Avg Wars Declared / Game | ${report.behaviorMetrics.conqueror.avgWarsDeclaredPerGame.toFixed(2)} | ${report.behaviorMetrics.conqueror.sampleSize} |`)
  lines.push(`| Steward | Avg War Years / Game | ${report.behaviorMetrics.steward.avgWarYearsPerGame.toFixed(2)} | ${report.behaviorMetrics.steward.sampleSize} |`)
  lines.push(`| Schemer | Avg Alliances / Game | ${report.behaviorMetrics.schemer.avgAlliancesPerGame.toFixed(2)} | ${report.behaviorMetrics.schemer.sampleSize} |`)
  lines.push('')

  // Runtime section
  lines.push('## Runtime')
  lines.push('')
  lines.push(`- Total: ${(report.runtime.runtimeMs / 1000 / 60).toFixed(1)} min`)
  lines.push(`- Per Game Mean: ${report.runtime.perGameMeanMs.toFixed(0)} ms`)
  lines.push(`- Per Game P95: ${report.runtime.perGameP95Ms.toFixed(0)} ms`)
  lines.push('')

  // Discrepancy summary (if any realm is out of tolerance)
  const outOfTolerance = Object.entries(report.distribution).filter(
    ([, dist]) => dist.expectedRate !== undefined && !dist.inTolerance,
  )
  if (outOfTolerance.length > 0) {
    lines.push('## Discrepancy Summary')
    lines.push('')
    lines.push('Realms outside §7.2 expected ±5pp tolerance:')
    lines.push('')
    for (const [realmId, dist] of outOfTolerance) {
      const actual = (dist.winRate * 100).toFixed(1)
      const expected = dist.expectedRate !== undefined ? (dist.expectedRate * 100).toFixed(0) : '?'
      const diff = dist.expectedRate !== undefined ? ((dist.winRate - dist.expectedRate) * 100).toFixed(1) : '?'
      lines.push(`- **${realmId}**: actual ${actual}% vs expected ${expected}% (diff: ${diff}pp)`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
