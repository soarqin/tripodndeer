import { describe, expect, it } from 'vitest'
import { BattleResolvedEventSchema, SpyCaughtEventSchema } from '~/shared/schemas/events'
import { DiplomacyEventSchema, DiplomaticTreatyKindSchema } from '~/shared/schemas/diplomacy'

describe('M8.2 event schemas', () => {
  it('parses spy_caught events', () => {
    const result = SpyCaughtEventSchema.parse({
      type: 'spy_caught',
      payload: {
        observerRealmId: 'realm_qin',
        subjectRealmId: 'realm_wei',
        missionId: 'mission_001',
      },
    })

    expect(result.type).toBe('spy_caught')
    expect(result.payload.missionId).toBe('mission_001')
  })

  it('parses battleResolved payload extensions', () => {
    const result = BattleResolvedEventSchema.parse({
      type: 'battleResolved',
      payload: {
        battleResolution: { winner: 'attacker' },
        attackerRealmId: 'realm_qin',
        defenderRealmId: 'realm_wei',
        siteId: 'site_001',
        armySizeTotal: 4200,
        borderSite: true,
      },
    })

    expect(result.payload.armySizeTotal).toBe(4200)
    expect(result.payload.borderSite).toBe(true)
  })

  it('parses diplomacy combat_observed events', () => {
    const result = DiplomacyEventSchema.parse({
      id: 'dip_evt_001',
      kind: 'combat_observed',
      occurredAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
      actorRealmId: 'realm_qin',
      targetRealmId: 'realm_wei',
      combatPayload: {
        armySizeTotal: 4200,
        borderSite: false,
        victorRealmId: 'realm_qin',
      },
    })

    expect(result.kind).toBe('combat_observed')
    expect((result as { combatPayload?: { victorRealmId: string } }).combatPayload?.victorRealmId).toBe('realm_qin')
  })

  it('parses diplomacy spy_caught events', () => {
    const result = DiplomacyEventSchema.parse({
      id: 'dip_evt_002',
      kind: 'spy_caught',
      occurredAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
      actorRealmId: 'realm_wei',
      targetRealmId: 'realm_qin',
      spyMissionId: 'mission_001',
    })

    expect(result.kind).toBe('spy_caught')
    expect((result as { spyMissionId?: string }).spyMissionId).toBe('mission_001')
  })

  it('parses treaty_ended with treatyKind', () => {
    const result = DiplomacyEventSchema.parse({
      id: 'dip_evt_003',
      kind: 'treaty_ended',
      occurredAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
      actorRealmId: 'realm_qin',
      targetRealmId: 'realm_wei',
      treatyId: 'treaty_001',
      treatyKind: 'truce',
    })

    expect((result as { treatyKind?: string }).treatyKind).toBe('truce')
  })

  it('keeps DiplomaticTreatyKind on truce and excludes peace', () => {
    expect(DiplomaticTreatyKindSchema.options).toContain('truce')
    expect(DiplomaticTreatyKindSchema.options).not.toContain('peace')
    expect(() => DiplomaticTreatyKindSchema.parse('peace')).toThrow()
  })
})
