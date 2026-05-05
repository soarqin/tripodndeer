import type { RealmId } from './core'
import type { GeneralId } from './character'

export const ESPIONAGE_ACTION_KINDS = ['reconnaissance', 'rumor', 'discord', 'counter_intel'] as const
export type EspionageActionKind = typeof ESPIONAGE_ACTION_KINDS[number]
export const ESPIONAGE_RISK_TIERS: Record<EspionageActionKind, 'low' | 'mid' | 'high' | 'defensive'> = {
  reconnaissance: 'low',
  rumor: 'mid',
  discord: 'high',
  counter_intel: 'defensive',
} as const
export type EspionageRiskTier = 'low' | 'mid' | 'high' | 'defensive'

// ─── M7 Espionage: SpyMission & IntelligenceCoverage ────────────────────────

export type SpyMissionId = string
export type CoverageKey = string  // format: `${observerRealmId}__${targetRealmId}` (directional, NOT lex-sorted)
export type SpyMissionStatus = 'in_progress' | 'success' | 'failed' | 'exposed' | 'cancelled'

export interface SpyMission {
  readonly id: SpyMissionId
  readonly spyGeneralId: GeneralId
  readonly spyRealmId: RealmId           // observer realm
  readonly targetRealmId: RealmId
  readonly action: EspionageActionKind
  readonly startTick: number
  readonly resolveTick: number           // startTick + duration
  readonly status: SpyMissionStatus
  readonly targetGeneralId: GeneralId | null  // only used for discord action
}

export type IntelligenceCoverage = ReadonlyMap<CoverageKey, number>  // 0-100 directional

export function makeCoverageKey(observerId: RealmId, targetId: RealmId): CoverageKey {
  return `${observerId}__${targetId}`
}

// ─── M7 Espionage: CounterIntelState & AIEspionageOption ────────────────────

export interface CounterIntelState {
  readonly realmId: RealmId
  readonly detectionLevel: number  // 0-10 integer
  readonly lastUpdatedTick: number
}

// AIEspionageOption is a PARALLEL type to AIOption — does NOT extend it
// This is Path B decision: keeps AIOption.kind union clean
export interface AIEspionageOption {
  readonly kind: EspionageActionKind
  readonly spyRealmId: RealmId
  readonly targetRealmId: RealmId
  readonly score?: number
}
