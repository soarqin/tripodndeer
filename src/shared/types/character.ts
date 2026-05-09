import type { RealmId } from './core'
import type { AcademyId } from './world'

export type GeneralId = string
export type RulerStateId = string

export type AIPersonality = 'aggressive_random' | 'aggressive' | 'cautious'

export type PersonalityArchetype =
  | 'conqueror'
  | 'steward'
  | 'schemer'
  | 'learned'
  | 'tyrant'
  | 'incompetent'
  | 'benevolent'
  | 'builder'

export interface RulerPersonalityProfile {
  readonly expansionDrive: number
  readonly diplomaticTrust: number
  readonly caution: number
  readonly honor: number
  readonly vindictiveness: number
  readonly reformInclination: number
  readonly patience: number
  readonly preferredStrategy: 'blitz' | 'siege' | 'attrition' | 'diplomatic'
}

export type Specialty =
  | 'commander'
  | 'warrior'
  | 'strategist'
  | 'administrator'
  | 'reformer'
  | 'diplomat'
  | 'spy'
  | 'scholar'
  | 'engineer'

export type Ambition = 'low' | 'mid' | 'high'

export type LoyaltyState =
  | 'loyal'
  | 'shirking'
  | 'seeking_departure'
  | 'secret_contact'
  | 'defected'

export type FactionId =
  | 'royal_kin'
  | 'noble_clans'
  | 'military_meritocracy'
  | 'reformists'
  | 'conservatives'
  | 'foreign_clients'

export type Post = 'ruler' | 'chancellor' | 'general' | 'governor'

export interface CharacterAttributes {
  wu: number
  zheng: number
  jiao: number
  mou: number
  xue: number
  po: number
}

export interface General {
  id: GeneralId
  realmId: RealmId
  name: string
  might: number
  command: number
  loyalty: number
  strategy?: number
  learning?: number
  attrs?: CharacterAttributes
  specialty?: Specialty
  ambition?: Ambition
  faction?: FactionId
  age?: number
  recruitedAtTick?: number
  posts?: readonly Post[]
  loyaltyState?: LoyaltyState
  readonly almaMater?: AcademyId
}

export interface RulerState {
  readonly realmId: RealmId
  readonly generalId: GeneralId
  readonly age: number
  readonly lifespan: number
  readonly health: number
  readonly personality: PersonalityArchetype
  readonly personalityDims: RulerPersonalityProfile
  readonly successionLawId: 'primogeniture'
  readonly inOfficeSinceTick: number
}
