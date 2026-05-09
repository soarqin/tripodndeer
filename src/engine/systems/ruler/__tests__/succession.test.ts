import { describe, expect, it } from 'vitest'

import { selectHeir } from '../succession'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { General, GeneralId, RealmId, RulerState, World } from '~/shared/types'

function makeGeneral(id: GeneralId, realmId: RealmId, overrides: Partial<General> = {}): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty: 80,
    attrs: { wu: 50, zheng: 50, jiao: 50, mou: 50, xue: 50, po: 50 },
    ...overrides,
  }
}

function makeRuler(realmId: RealmId, generalId: GeneralId): RulerState {
  return {
    realmId,
    generalId,
    age: 40,
    lifespan: 65,
    health: 80,
    personality: 'steward',
    personalityDims: {
      expansionDrive: 0.5,
      diplomaticTrust: 0.5,
      caution: 0.5,
      honor: 0.5,
      vindictiveness: 0.5,
      reformInclination: 0.5,
      patience: 0.5,
      preferredStrategy: 'diplomatic',
    },
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function worldWith(generals: readonly General[], rulers: readonly RulerState[] = []): World {
  return makeEmptyWorld({
    generals: new Map(generals.map((g) => [g.id, g])),
    rulers: new Map(rulers.map((r) => [r.realmId, r])),
  })
}

describe('selectHeir', () => {
  it('returns null when no eligible candidates exist in the realm', () => {
    const world = worldWith([makeGeneral('g_other_1', 'realm_zhao')])

    const heir = selectHeir(world, 'realm_qin')

    expect(heir).toBeNull()
  })

  it('returns highest loyalty candidate when multiple eligible candidates exist', () => {
    const world = worldWith([
      makeGeneral('g_a', 'realm_qin', { loyalty: 70 }),
      makeGeneral('g_b', 'realm_qin', { loyalty: 95 }),
      makeGeneral('g_c', 'realm_qin', { loyalty: 60 }),
    ])

    const heir = selectHeir(world, 'realm_qin')

    expect(heir).toBe('g_b')
  })

  it('breaks loyalty ties by attrs.zheng + attrs.jiao (higher wins)', () => {
    const world = worldWith([
      makeGeneral('g_a', 'realm_qin', {
        loyalty: 80,
        attrs: { wu: 0, zheng: 30, jiao: 30, mou: 0, xue: 0, po: 50 },
      }),
      makeGeneral('g_b', 'realm_qin', {
        loyalty: 80,
        attrs: { wu: 0, zheng: 70, jiao: 70, mou: 0, xue: 0, po: 50 },
      }),
      makeGeneral('g_c', 'realm_qin', {
        loyalty: 80,
        attrs: { wu: 0, zheng: 50, jiao: 50, mou: 0, xue: 0, po: 50 },
      }),
    ])

    const heir = selectHeir(world, 'realm_qin')

    expect(heir).toBe('g_b')
  })

  it('breaks final ties by GeneralId in ascending dictionary order', () => {
    const world = worldWith([
      makeGeneral('g_zeta', 'realm_qin', {
        loyalty: 80,
        attrs: { wu: 0, zheng: 50, jiao: 50, mou: 0, xue: 0, po: 50 },
      }),
      makeGeneral('g_alpha', 'realm_qin', {
        loyalty: 80,
        attrs: { wu: 0, zheng: 50, jiao: 50, mou: 0, xue: 0, po: 50 },
      }),
      makeGeneral('g_mu', 'realm_qin', {
        loyalty: 80,
        attrs: { wu: 0, zheng: 50, jiao: 50, mou: 0, xue: 0, po: 50 },
      }),
    ])

    const heir = selectHeir(world, 'realm_qin')

    expect(heir).toBe('g_alpha')
  })

  it('excludes the current ruler from candidates', () => {
    const world = worldWith(
      [
        makeGeneral('g_ruler', 'realm_qin', { loyalty: 100 }),
        makeGeneral('g_heir', 'realm_qin', { loyalty: 50 }),
      ],
      [makeRuler('realm_qin', 'g_ruler')],
    )

    const heir = selectHeir(world, 'realm_qin')

    expect(heir).toBe('g_heir')
  })

  it("excludes generals with loyaltyState='defected'", () => {
    const world = worldWith([
      makeGeneral('g_defector', 'realm_qin', { loyalty: 100, loyaltyState: 'defected' }),
      makeGeneral('g_loyal', 'realm_qin', { loyalty: 50, loyaltyState: 'loyal' }),
    ])

    const heir = selectHeir(world, 'realm_qin')

    expect(heir).toBe('g_loyal')
  })

  it('excludes generals with attrs.po < 10', () => {
    const world = worldWith([
      makeGeneral('g_weak_po', 'realm_qin', {
        loyalty: 100,
        attrs: { wu: 50, zheng: 50, jiao: 50, mou: 50, xue: 50, po: 5 },
      }),
      makeGeneral('g_ok_po', 'realm_qin', {
        loyalty: 50,
        attrs: { wu: 50, zheng: 50, jiao: 50, mou: 50, xue: 50, po: 10 },
      }),
    ])

    const heir = selectHeir(world, 'realm_qin')

    expect(heir).toBe('g_ok_po')
  })

  it('excludes generals from a different realm', () => {
    const world = worldWith([
      makeGeneral('g_foreign', 'realm_zhao', { loyalty: 100 }),
      makeGeneral('g_local', 'realm_qin', { loyalty: 50 }),
    ])

    const heir = selectHeir(world, 'realm_qin')

    expect(heir).toBe('g_local')
  })

  it('excludes generals with disqualifying specialty (e.g. spy)', () => {
    const world = worldWith([
      makeGeneral('g_spy', 'realm_qin', { loyalty: 100, specialty: 'spy' }),
      makeGeneral('g_admin', 'realm_qin', { loyalty: 50, specialty: 'administrator' }),
    ])

    const heir = selectHeir(world, 'realm_qin')

    expect(heir).toBe('g_admin')
  })

  it('produces deterministic results on repeated invocation', () => {
    const world = worldWith([
      makeGeneral('g_a', 'realm_qin', { loyalty: 80 }),
      makeGeneral('g_b', 'realm_qin', { loyalty: 80 }),
    ])

    const heir1 = selectHeir(world, 'realm_qin')
    const heir2 = selectHeir(world, 'realm_qin')

    expect(heir1).toBe(heir2)
    expect(heir1).toBe('g_a')
  })
})
