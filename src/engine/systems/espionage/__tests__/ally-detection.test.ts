import { describe, expect, it } from 'vitest'

import type { Treaty, TreatyId } from '~/shared/types'
import { getActiveAllies } from '../ally-detection'

function makeTreaty(overrides: Partial<Treaty>): Treaty {
  return {
    id: 'treaty_1' as TreatyId,
    kind: 'alliance',
    realmAId: 'realm_a',
    realmBId: 'realm_b',
    status: 'active',
    signedAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    signedAtTick: 0,
    expiresAt: null,
    expiresAtTick: null,
    endedAt: null,
    endedAtTick: null,
    sourceProposalId: null,
    ...overrides,
  }
}

describe('getActiveAllies', () => {
  it('returns empty set when no treaties exist', () => {
    const treaties = new Map<TreatyId, Treaty>()
    const allies = getActiveAllies(treaties, 'realm_a')
    expect(allies.size).toBe(0)
  })

  it('returns realmBId when realmId is realmAId in active alliance', () => {
    const treaty = makeTreaty({
      id: 'treaty_1' as TreatyId,
      realmAId: 'realm_a',
      realmBId: 'realm_b',
      kind: 'alliance',
      status: 'active',
    })
    const treaties = new Map<TreatyId, Treaty>([['treaty_1' as TreatyId, treaty]])
    const allies = getActiveAllies(treaties, 'realm_a')
    expect(allies).toEqual(new Set(['realm_b']))
  })

  it('returns realmAId when realmId is realmBId in active alliance', () => {
    const treaty = makeTreaty({
      id: 'treaty_1' as TreatyId,
      realmAId: 'realm_a',
      realmBId: 'realm_b',
      kind: 'alliance',
      status: 'active',
    })
    const treaties = new Map<TreatyId, Treaty>([['treaty_1' as TreatyId, treaty]])
    const allies = getActiveAllies(treaties, 'realm_b')
    expect(allies).toEqual(new Set(['realm_a']))
  })

  it('returns all allies from multiple active alliances', () => {
    const treaty1 = makeTreaty({
      id: 'treaty_1' as TreatyId,
      realmAId: 'realm_a',
      realmBId: 'realm_b',
      kind: 'alliance',
      status: 'active',
    })
    const treaty2 = makeTreaty({
      id: 'treaty_2' as TreatyId,
      realmAId: 'realm_a',
      realmBId: 'realm_c',
      kind: 'alliance',
      status: 'active',
    })
    const treaty3 = makeTreaty({
      id: 'treaty_3' as TreatyId,
      realmAId: 'realm_d',
      realmBId: 'realm_a',
      kind: 'alliance',
      status: 'active',
    })
    const treaties = new Map<TreatyId, Treaty>([
      ['treaty_1' as TreatyId, treaty1],
      ['treaty_2' as TreatyId, treaty2],
      ['treaty_3' as TreatyId, treaty3],
    ])
    const allies = getActiveAllies(treaties, 'realm_a')
    expect(allies).toEqual(new Set(['realm_b', 'realm_c', 'realm_d']))
  })

  it('does not count non_aggression treaty as ally', () => {
    const treaty = makeTreaty({
      id: 'treaty_1' as TreatyId,
      realmAId: 'realm_a',
      realmBId: 'realm_b',
      kind: 'non_aggression',
      status: 'active',
    })
    const treaties = new Map<TreatyId, Treaty>([['treaty_1' as TreatyId, treaty]])
    const allies = getActiveAllies(treaties, 'realm_a')
    expect(allies.size).toBe(0)
  })

  it('does not count expired alliance as ally', () => {
    const treaty = makeTreaty({
      id: 'treaty_1' as TreatyId,
      realmAId: 'realm_a',
      realmBId: 'realm_b',
      kind: 'alliance',
      status: 'expired',
    })
    const treaties = new Map<TreatyId, Treaty>([['treaty_1' as TreatyId, treaty]])
    const allies = getActiveAllies(treaties, 'realm_a')
    expect(allies.size).toBe(0)
  })

  it('does not count broken alliance as ally', () => {
    const treaty = makeTreaty({
      id: 'treaty_1' as TreatyId,
      realmAId: 'realm_a',
      realmBId: 'realm_b',
      kind: 'alliance',
      status: 'broken',
    })
    const treaties = new Map<TreatyId, Treaty>([['treaty_1' as TreatyId, treaty]])
    const allies = getActiveAllies(treaties, 'realm_a')
    expect(allies.size).toBe(0)
  })

  it('does not count alliance where realmId is neither party', () => {
    const treaty = makeTreaty({
      id: 'treaty_1' as TreatyId,
      realmAId: 'realm_a',
      realmBId: 'realm_b',
      kind: 'alliance',
      status: 'active',
    })
    const treaties = new Map<TreatyId, Treaty>([['treaty_1' as TreatyId, treaty]])
    const allies = getActiveAllies(treaties, 'realm_c')
    expect(allies.size).toBe(0)
  })
})
