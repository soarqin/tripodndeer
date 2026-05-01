import { describe, expect, it } from 'vitest'
import { DIPLOMACY_BETRAYAL_TRUST_DELTA, DIPLOMACY_TRUCE_DURATION_TICKS } from '~/content/m2/balance'
import { warKey } from '~/engine/wars'
import { applyDiplomacyAction, diplomacyLifecycleStep, relationKey, validateDiplomacyAction } from '../index'
import { DATE, baseWorld, han, makeProposal, makeRealm, makeRelation, makeTreaty, makeWarState, qin, wei } from './diplomacy-fixtures'

describe('diplomacy war declaration integration', () => {
  it('declares war through existing war state and cancels only belligerent incompatible treaties', () => {
    const alliance = makeTreaty({ id: 'alliance_qin_han', kind: 'alliance' })
    const nap = makeTreaty({ id: 'nap_qin_han', kind: 'non_aggression' })
    const marriage = makeTreaty({ id: 'marriage_qin_han', kind: 'marriage' })
    const tribute = makeTreaty({ id: 'tribute_qin_han', kind: 'tribute' })
    const thirdPartyAlliance = makeTreaty({ id: 'alliance_qin_wei', kind: 'alliance', realmBId: wei })
    const thirdPartyNap = makeTreaty({ id: 'nap_han_wei', kind: 'non_aggression', realmAId: han, realmBId: wei })
    const world = baseWorld({
      treaties: new Map([
        [alliance.id, alliance],
        [nap.id, nap],
        [marriage.id, marriage],
        [tribute.id, tribute],
        [thirdPartyAlliance.id, thirdPartyAlliance],
        [thirdPartyNap.id, thirdPartyNap],
      ]),
    })

    const result = applyDiplomacyAction(world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })

    expect(result.ok).toBe(true)
    expect(result.world.wars.has(warKey(qin, han))).toBe(true)
    expect(result.world.wars.get(warKey(qin, han))?.declaredAt).toEqual(DATE)
    expect(world.wars.size).toBe(0)
    expect(['alliance_qin_han', 'nap_qin_han', 'marriage_qin_han', 'tribute_qin_han'].map(id => result.world.treaties.get(id)?.status))
      .toEqual(['cancelled', 'cancelled', 'cancelled', 'cancelled'])
    expect(result.world.treaties.get('alliance_qin_wei')).toMatchObject({ status: 'active', endedAtTick: null })
    expect(result.world.treaties.get('nap_han_wei')).toMatchObject({ status: 'active', endedAtTick: null })
    expect(result.world.diplomacyHistory.map(event => event.kind)).toEqual([
      'war_declared',
      'treaty_ended',
      'treaty_ended',
      'treaty_ended',
      'treaty_ended',
      'betrayal',
      'relation_changed',
      'relation_changed',
      'relation_changed',
    ])
    expect(warKey(qin, han)).toBe('realm_han:realm_qin')
    expect(relationKey(qin, han)).toBe('realm_han__realm_qin')
  })

  it('records betrayal reason and clamps trust when declaring war through a positive treaty', () => {
    const alliance = makeTreaty({ id: 'alliance_qin_han', kind: 'alliance' })
    const world = baseWorld({
      relations: new Map([[relationKey(qin, han), makeRelation({ trust: 20 })]]),
      treaties: new Map([[alliance.id, alliance]]),
    })

    const result = applyDiplomacyAction(world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })

    expect(result.ok).toBe(true)
    expect(result.world.treaties.get(alliance.id)).toMatchObject({ status: 'cancelled', endedAtTick: 10 })
    expect(result.world.relations.get(relationKey(qin, han))).toMatchObject({
      trust: Math.max(0, 20 + DIPLOMACY_BETRAYAL_TRUST_DELTA),
      updatedAt: DATE,
    })
    expect(result.world.diplomacyHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'betrayal',
        reason: 'war_declaration_against_treaty',
        actorRealmId: qin,
        targetRealmId: han,
        treatyId: alliance.id,
        relationKey: relationKey(qin, han),
      }),
    ]))
  })

  it('keeps active truce as truce_active without betrayal or treaty cancellation', () => {
    const truce = makeTreaty({ id: 'truce_qin_han', kind: 'truce', expiresAtTick: 20 })
    const world = baseWorld({ treaties: new Map([[truce.id, truce]]) })

    const result = applyDiplomacyAction(world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })

    expect(result).toEqual({ ok: false, world, reason: 'truce_active', events: [] })
    expect(result.world.treaties.get(truce.id)).toEqual(truce)
    expect(result.world.diplomacyHistory).toEqual([])
  })
})

describe('diplomacy peace integration', () => {
  it('accepted peace ends the war, creates an active truce, and blocks redeclaration', () => {
    const proposal = makeProposal()
    const world = baseWorld({
      wars: new Map([[warKey(qin, han), makeWarState()]]),
      diplomaticProposals: new Map([[proposal.id, proposal]]),
    })

    const result = diplomacyLifecycleStep(world, world.rngState)

    expect(result.world.wars.has(warKey(qin, han))).toBe(false)
    const truce = [...result.world.treaties.values()][0]
    expect(truce).toMatchObject({
      kind: 'truce',
      status: 'active',
      realmAId: qin,
      realmBId: han,
      signedAtTick: 10,
      expiresAtTick: 10 + DIPLOMACY_TRUCE_DURATION_TICKS,
      sourceProposalId: proposal.id,
    })
    expect(validateDiplomacyAction(result.world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han }))
      .toEqual({ ok: false, reason: 'truce_active' })
    expect(result.world.diplomacyHistory.map(event => event.kind)).toEqual(['proposal_resolved', 'treaty_created'])
  })

  it('accepted peace refreshes an existing active truce expiry instead of adding a duplicate', () => {
    const proposal = makeProposal({ id: 'proposal_peace_refresh' })
    const staleTruce = makeTreaty({
      id: 'truce_existing',
      kind: 'truce',
      signedAtTick: 1,
      expiresAtTick: 12,
    })
    const world = baseWorld({
      realms: new Map([
        [qin, makeRealm(qin, 1_000_000)],
        [han, makeRealm(han, 0)],
        [wei, makeRealm(wei)],
      ]),
      wars: new Map([[warKey(qin, han), makeWarState()]]),
      diplomaticProposals: new Map([[proposal.id, proposal]]),
      treaties: new Map([[staleTruce.id, staleTruce]]),
    })

    const result = diplomacyLifecycleStep(world, world.rngState)

    expect(result.world.wars.has(warKey(qin, han))).toBe(false)
    expect(result.world.treaties.size).toBe(1)
    expect(result.world.treaties.get('truce_existing')).toMatchObject({
      status: 'active',
      signedAtTick: 10,
      expiresAtTick: 10 + DIPLOMACY_TRUCE_DURATION_TICKS,
      endedAtTick: null,
      sourceProposalId: proposal.id,
    })
  })
})
