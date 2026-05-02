import { beforeEach, describe, expect, it } from 'vitest'
import type { GameEvent, RealmId } from '~/shared/types'
import { useGameStore } from '../game-store'
import { detectCriticalEvent } from '../critical-events'

beforeEach(() => {
  useGameStore.getState().reset()
  useGameStore.getState().clearBanner()
})

describe('pauseOnCriticalEvent action', () => {
  it('pauses the clock and saves previousClockSpeed', () => {
    useGameStore.getState().setSpeed('2x')
    useGameStore.getState().pauseOnCriticalEvent('rulerDeath')

    const state = useGameStore.getState()
    expect(state.clockState.speed).toBe('pause')
    expect(state.previousClockSpeed).toBe('2x')
  })

  it('exposes a transient banner describing the critical event', () => {
    useGameStore.getState().setSpeed('2x')
    useGameStore.getState().pauseOnCriticalEvent('rulerDeath')

    const state = useGameStore.getState()
    expect(state.transientBanner).not.toBeNull()
    expect(state.transientBanner?.text).toContain('君主薨逝')
  })

  it('preserves previousClockSpeed when triggered again while already paused (idempotent)', () => {
    useGameStore.getState().setSpeed('5x')
    useGameStore.getState().pauseOnCriticalEvent('rulerDeath')
    expect(useGameStore.getState().previousClockSpeed).toBe('5x')

    useGameStore.getState().pauseOnCriticalEvent('warDeclared')

    const state = useGameStore.getState()
    expect(state.previousClockSpeed).toBe('5x')
    expect(state.clockState.speed).toBe('pause')
  })

  it('does not overwrite previousClockSpeed with pause when invoked twice from running speed', () => {
    useGameStore.getState().setSpeed('3x')
    useGameStore.getState().pauseOnCriticalEvent('warDeclared')
    useGameStore.getState().pauseOnCriticalEvent('warDeclared')

    expect(useGameStore.getState().previousClockSpeed).toBe('3x')
  })

  it('updates the transient banner when a new critical event arrives even if already paused', () => {
    useGameStore.getState().setSpeed('2x')
    useGameStore.getState().pauseOnCriticalEvent('rulerDeath')
    useGameStore.getState().pauseOnCriticalEvent('warDeclared')

    expect(useGameStore.getState().transientBanner?.text).toContain('宣战')
  })

  it('accepts an optional payload without crashing', () => {
    useGameStore.getState().setSpeed('2x')
    useGameStore.getState().pauseOnCriticalEvent('rulerDeath', { realmId: 'realm_qin' })

    expect(useGameStore.getState().clockState.speed).toBe('pause')
  })

  it('supports every CriticalEventType value', () => {
    const eventTypes = [
      'rulerDeath',
      'successionCrisis',
      'warDeclared',
      'majorBattleEnd',
      'eventChainTriggered',
      'reformStageReached',
    ] as const

    for (const eventType of eventTypes) {
      useGameStore.getState().reset()
      useGameStore.getState().setSpeed('2x')
      useGameStore.getState().pauseOnCriticalEvent(eventType)

      expect(useGameStore.getState().clockState.speed).toBe('pause')
      expect(useGameStore.getState().transientBanner).not.toBeNull()
    }
  })
})

describe('detectCriticalEvent (phase event watcher mapping)', () => {
  const playerRealmId: RealmId = 'realm_qin'

  it('maps rulerDied of player realm to rulerDeath', () => {
    const event: GameEvent = {
      type: 'rulerDied',
      payload: { realmId: playerRealmId, generalId: 'g1', cause: 'natural' },
    }
    const result = detectCriticalEvent(event, playerRealmId)
    expect(result?.type).toBe('rulerDeath')
  })

  it('returns null for rulerDied of an AI realm (filter by playerRealmId)', () => {
    const event: GameEvent = {
      type: 'rulerDied',
      payload: { realmId: 'realm_chu', generalId: 'g1', cause: 'natural' },
    }
    expect(detectCriticalEvent(event, playerRealmId)).toBeNull()
  })

  it('maps successionCrisis of player realm to successionCrisis', () => {
    const event: GameEvent = {
      type: 'successionCrisis',
      payload: { realmId: playerRealmId },
    }
    expect(detectCriticalEvent(event, playerRealmId)?.type).toBe('successionCrisis')
  })

  it('returns null for successionCrisis of an AI realm', () => {
    const event: GameEvent = {
      type: 'successionCrisis',
      payload: { realmId: 'realm_chu' },
    }
    expect(detectCriticalEvent(event, playerRealmId)).toBeNull()
  })

  it('maps warDeclared by player to warDeclared', () => {
    const event: GameEvent = {
      type: 'warDeclared',
      payload: { byRealm: playerRealmId, againstRealm: 'realm_chu' },
    }
    expect(detectCriticalEvent(event, playerRealmId)?.type).toBe('warDeclared')
  })

  it('maps warDeclared against player to warDeclared', () => {
    const event: GameEvent = {
      type: 'warDeclared',
      payload: { byRealm: 'realm_chu', againstRealm: playerRealmId },
    }
    expect(detectCriticalEvent(event, playerRealmId)?.type).toBe('warDeclared')
  })

  it('returns null for warDeclared between two AI realms', () => {
    const event: GameEvent = {
      type: 'warDeclared',
      payload: { byRealm: 'realm_chu', againstRealm: 'realm_zhao' },
    }
    expect(detectCriticalEvent(event, playerRealmId)).toBeNull()
  })

  it('maps eventChainTriggered to eventChainTriggered (always significant)', () => {
    const event: GameEvent = {
      type: 'eventChainTriggered',
      payload: { chainId: 'event_lin_xiangru_bi' },
    }
    expect(detectCriticalEvent(event, playerRealmId)?.type).toBe('eventChainTriggered')
  })

  it('maps reformStarted of player realm to reformStageReached', () => {
    const event: GameEvent = {
      type: 'reformStarted',
      payload: { realmId: playerRealmId, reformId: 'shang_yang' },
    }
    expect(detectCriticalEvent(event, playerRealmId)?.type).toBe('reformStageReached')
  })

  it('returns null for reformStarted of an AI realm', () => {
    const event: GameEvent = {
      type: 'reformStarted',
      payload: { realmId: 'realm_chu', reformId: 'shang_yang' },
    }
    expect(detectCriticalEvent(event, playerRealmId)).toBeNull()
  })

  it('maps siteConquered involving player (lost) to majorBattleEnd', () => {
    const event: GameEvent = {
      type: 'siteConquered',
      payload: { siteId: 'site_xianyang', byRealm: 'realm_chu', fromRealm: playerRealmId, reason: 'breach' },
    }
    expect(detectCriticalEvent(event, playerRealmId)?.type).toBe('majorBattleEnd')
  })

  it('maps siteConquered captured by player to majorBattleEnd', () => {
    const event: GameEvent = {
      type: 'siteConquered',
      payload: { siteId: 'site_handan', byRealm: playerRealmId, fromRealm: 'realm_chu', reason: 'breach' },
    }
    expect(detectCriticalEvent(event, playerRealmId)?.type).toBe('majorBattleEnd')
  })

  it('returns null for siteConquered between two AI realms', () => {
    const event: GameEvent = {
      type: 'siteConquered',
      payload: { siteId: 'site_x', byRealm: 'realm_chu', fromRealm: 'realm_zhao', reason: 'breach' },
    }
    expect(detectCriticalEvent(event, playerRealmId)).toBeNull()
  })

  it('returns null for non-critical event types (orderApplied, economySettlement, etc.)', () => {
    expect(detectCriticalEvent({ type: 'orderApplied', payload: {} }, playerRealmId)).toBeNull()
    expect(detectCriticalEvent({ type: 'economySettlement', payload: {} }, playerRealmId)).toBeNull()
    expect(detectCriticalEvent({ type: 'tacticUsed', payload: {} }, playerRealmId)).toBeNull()
  })

  it('returns null for malformed events with missing payload fields', () => {
    expect(detectCriticalEvent({ type: 'rulerDied', payload: null }, playerRealmId)).toBeNull()
    expect(detectCriticalEvent({ type: 'rulerDied', payload: {} }, playerRealmId)).toBeNull()
    expect(detectCriticalEvent({ type: 'warDeclared', payload: { byRealm: null } }, playerRealmId)).toBeNull()
  })
})

describe('integration: AI realm rulerDied does NOT pause via watcher path', () => {
  it('does not change the speed when an AI realm ruler dies', () => {
    useGameStore.getState().setSpeed('2x')

    const aiRealmId: RealmId = 'realm_chu'
    const event: GameEvent = {
      type: 'rulerDied',
      payload: { realmId: aiRealmId, generalId: 'g1', cause: 'natural' },
    }
    const detected = detectCriticalEvent(event, useGameStore.getState().playerRealmId)
    if (detected !== null) {
      useGameStore.getState().pauseOnCriticalEvent(detected.type, detected.payload)
    }

    expect(detected).toBeNull()
    expect(useGameStore.getState().clockState.speed).toBe('2x')
  })

  it('does pause the clock when the player ruler dies through the watcher path', () => {
    useGameStore.getState().setSpeed('2x')
    const playerRealmId = useGameStore.getState().playerRealmId

    const event: GameEvent = {
      type: 'rulerDied',
      payload: { realmId: playerRealmId, generalId: 'g1', cause: 'natural' },
    }
    const detected = detectCriticalEvent(event, playerRealmId)
    if (detected !== null) {
      useGameStore.getState().pauseOnCriticalEvent(detected.type, detected.payload)
    }

    const state = useGameStore.getState()
    expect(detected?.type).toBe('rulerDeath')
    expect(state.clockState.speed).toBe('pause')
    expect(state.previousClockSpeed).toBe('2x')
  })
})
