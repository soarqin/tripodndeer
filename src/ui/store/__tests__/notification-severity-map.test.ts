import { describe, expect, it } from 'vitest'
import type { GameEvent, RealmId } from '~/shared/types'
import { detectCriticalEvent } from '../critical-events'
import { getSeverity } from '../notification-severity-map'

const PLAYER: RealmId = 'realm_qin'
const OTHER: RealmId = 'realm_chu'

function event(type: string, payload: Record<string, unknown> = {}): GameEvent {
  return { type, payload }
}

describe('getSeverity — L1 invariant', () => {
  it('returns L1 whenever detectCriticalEvent returns non-null', () => {
    const e = event('rulerDied', { realmId: PLAYER, generalId: 'g1', cause: 'natural' })
    expect(detectCriticalEvent(e, PLAYER)).not.toBeNull()
    expect(getSeverity(e, PLAYER)).toBe('L1')
  })

  it('warDeclared with player involved → L1', () => {
    const e = event('warDeclared', { byRealm: PLAYER, againstRealm: OTHER })
    expect(getSeverity(e, PLAYER)).toBe('L1')
  })

  it('warDeclared against player → L1', () => {
    const e = event('warDeclared', { byRealm: OTHER, againstRealm: PLAYER })
    expect(getSeverity(e, PLAYER)).toBe('L1')
  })

  it('all 6 CriticalEventType-triggering events → L1', () => {
    const cases: GameEvent[] = [
      event('rulerDied', { realmId: PLAYER, generalId: 'g1', cause: 'natural' }),
      event('successionCrisis', { realmId: PLAYER }),
      event('warDeclared', { byRealm: PLAYER, againstRealm: OTHER }),
      event('siteConquered', { siteId: 's1', byRealm: PLAYER, fromRealm: OTHER, reason: 'breach' }),
      event('eventChainTriggered', { chainId: 'chain_1' }),
      event('reformStarted', { realmId: PLAYER, reformId: 'shang_yang' }),
    ]
    for (const e of cases) {
      expect(getSeverity(e, PLAYER), `event type: ${e.type}`).toBe('L1')
    }
  })
})

describe('getSeverity — warDeclared between other realms', () => {
  it('warDeclared between two AI realms → not L1 (L4 fallback)', () => {
    const e = event('warDeclared', { byRealm: OTHER, againstRealm: 'realm_zhao' })
    const severity = getSeverity(e, PLAYER)
    expect(severity).not.toBe('L1')
  })
})

describe('getSeverity — L2', () => {
  it('peaceProposed → L2', () => {
    expect(getSeverity(event('peaceProposed'), PLAYER)).toBe('L2')
  })

  it('characterDefected → L2', () => {
    expect(getSeverity(event('characterDefected', { generalId: 'g1', realmId: PLAYER }), PLAYER)).toBe('L2')
  })

  it('spyExposedHighRisk → L2', () => {
    expect(getSeverity(event('spyExposedHighRisk'), PLAYER)).toBe('L2')
  })

  it('factionImbalance → L2', () => {
    expect(getSeverity(event('factionImbalance'), PLAYER)).toBe('L2')
  })

  it('reformCompleted → L2', () => {
    expect(getSeverity(event('reformCompleted'), PLAYER)).toBe('L2')
  })

  it('disasterTriggered for player realm → L2', () => {
    expect(getSeverity(event('disasterTriggered', { realmId: PLAYER }), PLAYER)).toBe('L2')
  })

  it('disasterTriggered for other realm → L4', () => {
    expect(getSeverity(event('disasterTriggered', { realmId: OTHER }), PLAYER)).toBe('L4')
  })
})

describe('getSeverity — L3', () => {
  it('battleResolved → L3', () => {
    expect(getSeverity(event('battleResolved'), PLAYER)).toBe('L3')
  })

  it('siegeStarvation → L3', () => {
    expect(getSeverity(event('siegeStarvation'), PLAYER)).toBe('L3')
  })

  it('economySettlement → L3', () => {
    expect(getSeverity(event('economySettlement'), PLAYER)).toBe('L3')
  })

  it('culturalTagFlipped → L3', () => {
    expect(getSeverity(event('culturalTagFlipped'), PLAYER)).toBe('L3')
  })

  it('ideologyShifted → L3', () => {
    expect(getSeverity(event('ideologyShifted'), PLAYER)).toBe('L3')
  })

  it('prestigeUpdated → L3', () => {
    expect(getSeverity(event('prestigeUpdated'), PLAYER)).toBe('L3')
  })

  it('victoryAchieved → L3', () => {
    expect(getSeverity(event('victoryAchieved'), PLAYER)).toBe('L3')
  })

  it('realmDeactivated → L3', () => {
    expect(getSeverity(event('realmDeactivated'), PLAYER)).toBe('L3')
  })
})

describe('getSeverity — L4', () => {
  it('orderApplied → L4', () => {
    expect(getSeverity(event('orderApplied'), PLAYER)).toBe('L4')
  })

  it('orderRejected → L4', () => {
    expect(getSeverity(event('orderRejected'), PLAYER)).toBe('L4')
  })

  it('characterDied → L4', () => {
    expect(getSeverity(event('characterDied', { generalId: 'g1', realmId: OTHER }), PLAYER)).toBe('L4')
  })

  it('successionResolved → L4', () => {
    expect(getSeverity(event('successionResolved', { realmId: OTHER }), PLAYER)).toBe('L4')
  })

  it('realmSplit → L4', () => {
    expect(getSeverity(event('realmSplit'), PLAYER)).toBe('L4')
  })

  it('spyMissionResolved → L4', () => {
    expect(getSeverity(event('spyMissionResolved'), PLAYER)).toBe('L4')
  })

  it('unknownEventType → L4 (fallback)', () => {
    expect(getSeverity(event('unknownEventType'), PLAYER)).toBe('L4')
  })
})

describe('getSeverity — hidden', () => {
  it('realm.treasury (dot-notation) → hidden', () => {
    expect(getSeverity(event('realm.treasury'), PLAYER)).toBe('hidden')
  })

  it('character.create → hidden', () => {
    expect(getSeverity(event('character.create'), PLAYER)).toBe('hidden')
  })

  it('site.population.delta → hidden', () => {
    expect(getSeverity(event('site.population.delta'), PLAYER)).toBe('hidden')
  })

  it('realm.faction.delta → hidden', () => {
    expect(getSeverity(event('realm.faction.delta'), PLAYER)).toBe('hidden')
  })
})
