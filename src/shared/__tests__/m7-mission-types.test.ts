import { describe, expect, it } from 'vitest'
import type { SpyMission, SpyMissionStatus } from '../types'
import { makeCoverageKey } from '../types'

describe('M7 SpyMission types', () => {
  it('SpyMission has exactly 9 fields', () => {
    const mission: SpyMission = {
      id: 'mission_1',
      spyGeneralId: 'general_1',
      spyRealmId: 'realm_qin',
      targetRealmId: 'realm_chu',
      action: 'reconnaissance',
      startTick: 100,
      resolveTick: 150,
      status: 'in_progress',
      targetGeneralId: null,
    }
    const keys = Object.keys(mission)
    expect(keys).toHaveLength(9)
    expect(keys).toEqual([
      'id',
      'spyGeneralId',
      'spyRealmId',
      'targetRealmId',
      'action',
      'startTick',
      'resolveTick',
      'status',
      'targetGeneralId',
    ])
  })

  it('SpyMissionStatus has exactly 5 values', () => {
    const statuses: SpyMissionStatus[] = ['in_progress', 'success', 'failed', 'exposed', 'cancelled']
    expect(statuses).toHaveLength(5)
  })

  it('makeCoverageKey is directional: qin→chu ≠ chu→qin', () => {
    const qinToChu = makeCoverageKey('realm_qin', 'realm_chu')
    const chuToQin = makeCoverageKey('realm_chu', 'realm_qin')
    expect(qinToChu).not.toBe(chuToQin)
  })

  it('makeCoverageKey format is ${observerId}__${targetId}', () => {
    const key = makeCoverageKey('realm_qin', 'realm_chu')
    expect(key).toBe('realm_qin__realm_chu')
    expect(key).toMatch(/^realm_qin__realm_chu$/)
  })
})
