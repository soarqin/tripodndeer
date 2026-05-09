import { describe, expect, it } from 'vitest'
import { applyDiplomacyAction } from '../index'
import { baseWorld, makeTreaty, qin, han } from './diplomacy-fixtures'

describe('war_declared unprovoked flag', () => {
  it('marks direct war declaration without treaty as unprovoked', () => {
    const world = baseWorld()

    const result = applyDiplomacyAction(world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })

    expect(result.ok).toBe(true)
    expect(result.world.diplomacyHistory[0]).toMatchObject({
      kind: 'war_declared',
      actorRealmId: qin,
      targetRealmId: han,
      unprovoked: true,
    })
  })

  it('marks war after breaking an alliance as provoked', () => {
    const alliance = makeTreaty({ id: 'alliance_qin_han', kind: 'alliance' })
    const world = baseWorld({ treaties: new Map([[alliance.id, alliance]]) })

    const result = applyDiplomacyAction(world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })

    expect(result.ok).toBe(true)
    expect(result.world.diplomacyHistory[0]).toMatchObject({
      kind: 'war_declared',
      actorRealmId: qin,
      targetRealmId: han,
      unprovoked: false,
    })
  })
})
