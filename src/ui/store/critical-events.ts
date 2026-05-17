import type { GameEvent, RealmId } from '~/shared/types'

export type CriticalEventType =
  | 'rulerDeath'
  | 'successionCrisis'
  | 'warDeclared'
  | 'majorBattleEnd'
  | 'eventChainTriggered'
  | 'reformStageReached'

export interface CriticalEventDescriptor {
  readonly type: CriticalEventType
  readonly payload: Record<string, unknown>
}

const CRITICAL_BANNER_TEXT: Record<CriticalEventType, string> = {
  rulerDeath: '君主薨逝',
  successionCrisis: '继承危机',
  warDeclared: '宣战',
  majorBattleEnd: '会战告终',
  eventChainTriggered: '历史事件',
  reformStageReached: '变法推进',
}

export function bannerTextForCriticalEvent(eventType: CriticalEventType): string {
  return CRITICAL_BANNER_TEXT[eventType]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function detectCriticalEvent(
  event: GameEvent,
  playerRealmId: RealmId,
): CriticalEventDescriptor | null {
  if (!isRecord(event.payload)) return null
  const payload = event.payload

  switch (event.type) {
    case 'rulerDied': {
      if (payload.realmId !== playerRealmId) return null
      return { type: 'rulerDeath', payload }
    }
    case 'successionCrisis': {
      if (payload.realmId !== playerRealmId) return null
      return { type: 'successionCrisis', payload }
    }
    case 'warDeclared': {
      if (payload.byRealm !== playerRealmId && payload.againstRealm !== playerRealmId) return null
      return { type: 'warDeclared', payload }
    }
    case 'siteConquered': {
      if (payload.byRealm !== playerRealmId && payload.fromRealm !== playerRealmId) return null
      return { type: 'majorBattleEnd', payload }
    }
    case 'eventChainTriggered': {
      return { type: 'eventChainTriggered', payload }
    }
    case 'reformStarted': {
      if (payload.realmId !== playerRealmId) return null
      return { type: 'reformStageReached', payload }
    }
    default:
      return null
  }
}

export type CriticalAutosaveEventType =
  | 'rulerDied'
  | 'warDeclared'
  | 'reformCompleted'
  | 'investitureChanged'

const CRITICAL_AUTOSAVE_NAME: Record<CriticalAutosaveEventType, string> = {
  rulerDied: '君主薨逝自动存档',
  warDeclared: '宣战自动存档',
  reformCompleted: '变法完成自动存档',
  investitureChanged: '册封变更自动存档',
}

export function getCriticalAutosaveName(
  event: GameEvent,
  playerRealmId: RealmId,
): string | null {
  if (!isRecord(event.payload)) return null
  const payload = event.payload

  switch (event.type) {
    case 'rulerDied': {
      if (payload.realmId !== playerRealmId) return null
      return CRITICAL_AUTOSAVE_NAME.rulerDied
    }
    case 'warDeclared': {
      if (payload.byRealm !== playerRealmId && payload.againstRealm !== playerRealmId) return null
      return CRITICAL_AUTOSAVE_NAME.warDeclared
    }
    case 'reformCompleted': {
      if (payload.realmId !== playerRealmId) return null
      return CRITICAL_AUTOSAVE_NAME.reformCompleted
    }
    case 'investitureChanged': {
      if (payload.newHolderId !== playerRealmId) return null
      return CRITICAL_AUTOSAVE_NAME.investitureChanged
    }
    default:
      return null
  }
}
