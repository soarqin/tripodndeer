import { describe, expect, it } from 'vitest'
import type { AIOption } from '../index'
import { getPersonality, pickAction, scoreOption } from '../index'
import type { World, Realm, RulerState } from '~/shared/types'

function createMockWorld(realms: Record<string, Partial<Realm>>, rulers: Record<string, Partial<RulerState>> = {}): World {
  const realmMap = new Map()
  for (const [id, data] of Object.entries(realms)) {
    realmMap.set(id, { id, aiPersonality: 'aggressive_random', ...data } as Realm)
  }
  
  const rulerMap = new Map()
  for (const [id, data] of Object.entries(rulers)) {
    rulerMap.set(id, { realmId: id, ...data } as RulerState)
  }

  return {
    realms: realmMap,
    rulers: rulerMap,
  } as unknown as World
}

describe('utility scorer', () => {
  it('conqueror: attack scores higher than retreat', () => {
    const options: AIOption[] = [
      { kind: 'attack', score: 10 },
      { kind: 'retreat', score: 10 },
    ]

    const { action } = pickAction(options, 'conqueror', { seed: 42, counter: 0 })

    expect(action.kind).toBe('attack')
  })

  it('steward: economy scores higher than attack', () => {
    const attackScore = scoreOption({ kind: 'attack', score: 10 }, 'steward')
    const economyScore = scoreOption({ kind: 'economy' as any, score: 10 }, 'steward')
    
    expect(economyScore).toBeGreaterThan(attackScore)
  })

  it('tyrant: attack scores highest', () => {
    const attackScore = scoreOption({ kind: 'attack', score: 10 }, 'tyrant')
    const retreatScore = scoreOption({ kind: 'retreat', score: 10 }, 'tyrant')
    const diplomacyScore = scoreOption({ kind: 'diplomacy' as any, score: 10 }, 'tyrant')
    
    expect(attackScore).toBeGreaterThan(retreatScore)
    expect(attackScore).toBeGreaterThan(diplomacyScore)
  })

  it('benevolent: diplomacy/economy scores higher than attack', () => {
    const attackScore = scoreOption({ kind: 'attack', score: 10 }, 'benevolent')
    const diplomacyScore = scoreOption({ kind: 'diplomacy' as any, score: 10 }, 'benevolent')
    const economyScore = scoreOption({ kind: 'economy' as any, score: 10 }, 'benevolent')
    
    expect(diplomacyScore).toBeGreaterThan(attackScore)
    expect(economyScore).toBeGreaterThan(attackScore)
  })

  it('fallback: realm with aiPersonality=aggressive and no ruler -> maps to conqueror', () => {
    const world = createMockWorld({
      'realm_qin': { aiPersonality: 'aggressive' }
    })
    expect(getPersonality(world, 'realm_qin')).toBe('conqueror')
  })

  it('fallback: realm with aiPersonality=cautious and no ruler -> maps to steward', () => {
    const world = createMockWorld({
      'realm_chu': { aiPersonality: 'cautious' }
    })
    expect(getPersonality(world, 'realm_chu')).toBe('steward')
  })

  it('fallback: realm with aiPersonality=aggressive_random and no ruler -> maps to schemer', () => {
    const world = createMockWorld({
      'realm_zhao': { aiPersonality: 'aggressive_random' }
    })
    expect(getPersonality(world, 'realm_zhao')).toBe('schemer')
  })

  it('uses ruler personality if ruler exists', () => {
    const world = createMockWorld(
      { 'realm_qin': { aiPersonality: 'aggressive' } },
      { 'realm_qin': { personality: 'builder' } }
    )
    expect(getPersonality(world, 'realm_qin')).toBe('builder')
  })

  it('deterministic with same seed', () => {
    const options: AIOption[] = [
      { kind: 'attack', score: 0 },
      { kind: 'idle', score: 0 },
    ]

    const { action: a1 } = pickAction(options, 'conqueror', { seed: 99, counter: 0 })
    const { action: a2 } = pickAction(options, 'conqueror', { seed: 99, counter: 0 })

    expect(a1.kind).toBe(a2.kind)
  })
})
