import { describe, expect, it } from 'vitest'

import {
  AcademySchema,
  AcademyStatusSchema,
  CulturalTagSchema,
  EffectSchema,
  IdeologyLeanSchema,
  IdeologySchema,
  WorldSchema,
  ZhouInvestitureStateSchema,
} from '~/shared/schemas'
import type { Academy } from '~/shared/types'

import { makeEmptyWorld } from './fixtures'

describe('M6 CulturalTagSchema', () => {
  it('accepts every documented Chinese cultural tag', () => {
    const tags = [
      'chinese_qin',
      'chinese_chu',
      'chinese_qi',
      'chinese_zhou_central',
      'chinese_yan',
      'chinese_zhao',
      'chinese_wei',
      'chinese_han',
    ] as const
    for (const tag of tags) {
      expect(CulturalTagSchema.parse(tag)).toBe(tag)
    }
  })

  it('accepts non-Chinese cultural tags yi_dong and di_xirong', () => {
    expect(CulturalTagSchema.parse('yi_dong')).toBe('yi_dong')
    expect(CulturalTagSchema.parse('di_xirong')).toBe('di_xirong')
  })

  it('rejects unknown cultural tags', () => {
    expect(CulturalTagSchema.safeParse('chinese_lu').success).toBe(false)
  })
})

describe('M6 IdeologySchema and IdeologyLeanSchema', () => {
  it('accepts the six canonical ideologies', () => {
    for (const ideology of ['fa', 'ru', 'dao', 'mo', 'zonghen', 'bing'] as const) {
      expect(IdeologySchema.parse(ideology)).toBe(ideology)
    }
  })

  it('rejects unknown ideologies', () => {
    expect(IdeologySchema.safeParse('xian').success).toBe(false)
  })

  it('parses a balanced lean shape', () => {
    const lean = { fa: 30, ru: 20, dao: 10, mo: 5, zonghen: 25, bing: 10 }
    expect(IdeologyLeanSchema.parse(lean)).toEqual(lean)
  })

  it('rejects lean values outside the [0, 100] integer range', () => {
    const negative = { fa: -1, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const overflow = { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 101 }
    const fractional = { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 1.5 }
    expect(IdeologyLeanSchema.safeParse(negative).success).toBe(false)
    expect(IdeologyLeanSchema.safeParse(overflow).success).toBe(false)
    expect(IdeologyLeanSchema.safeParse(fractional).success).toBe(false)
  })

  it('rejects a lean shape missing an ideology', () => {
    const partial = { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0 }
    expect(IdeologyLeanSchema.safeParse(partial).success).toBe(false)
  })
})

describe('M6 AcademySchema', () => {
  it('accepts a fully populated active academy with secondary ideology', () => {
    const academy = {
      id: 'academy_jixia',
      hostRealmId: 'realm_qi',
      hostSiteId: 'site_qi',
      primaryIdeology: 'ru',
      secondaryIdeology: 'dao',
      founded: 318,
      level: 1 as const,
      status: 'active' as const,
    }
    expect(AcademySchema.parse(academy).id).toBe('academy_jixia')
  })

  it('accepts an academy with null secondary ideology', () => {
    const academy = {
      id: 'academy_qin',
      hostRealmId: 'realm_qin',
      hostSiteId: 'site_xianyang',
      primaryIdeology: 'fa',
      secondaryIdeology: null,
      founded: 350,
      level: 1 as const,
      status: 'dormant' as const,
    }
    expect(AcademySchema.parse(academy).secondaryIdeology).toBe(null)
  })

  it('rejects an academy with level !== 1', () => {
    const academy = {
      id: 'academy_jixia',
      hostRealmId: 'realm_qi',
      hostSiteId: 'site_qi',
      primaryIdeology: 'ru',
      secondaryIdeology: null,
      founded: 318,
      level: 2,
      status: 'active',
    }
    expect(AcademySchema.safeParse(academy).success).toBe(false)
  })

  it('exposes the active/dormant alphabet through AcademyStatusSchema', () => {
    expect(AcademyStatusSchema.parse('active')).toBe('active')
    expect(AcademyStatusSchema.parse('dormant')).toBe('dormant')
    expect(AcademyStatusSchema.safeParse('decayed').success).toBe(false)
  })
})

describe('M6 ZhouInvestitureStateSchema (rank + lastTributeTick optional)', () => {
  const baseGrant = {
    realmId: 'realm_qin',
    recognizedTitle: 'Duke of Qin',
    grantedAtTick: 1000,
    expiresAtTick: null,
    source: 'zhou' as const,
  }

  it('accepts a grant without rank or tribute tick', () => {
    expect(ZhouInvestitureStateSchema.safeParse(baseGrant).success).toBe(true)
  })

  it('accepts a grant with rank and lastTributeTick', () => {
    const grant = { ...baseGrant, rank: 'duke' as const, lastTributeTick: 1024 }
    const parsed = ZhouInvestitureStateSchema.parse(grant)
    expect(parsed.rank).toBe('duke')
    expect(parsed.lastTributeTick).toBe(1024)
  })

  it('rejects an invalid rank value', () => {
    const grant = { ...baseGrant, rank: 'emperor' }
    expect(ZhouInvestitureStateSchema.safeParse(grant).success).toBe(false)
  })
})

describe('M6 EffectSchema (8 new whitelisted effects)', () => {
  const valid: ReadonlyArray<{ name: string; effect: unknown }> = [
    {
      name: 'realm.prestige.delta',
      effect: { type: 'realm.prestige.delta', realmId: 'realm_qin', delta: 5 },
    },
    {
      name: 'realm.ideology.delta',
      effect: { type: 'realm.ideology.delta', realmId: 'realm_qin', ideology: 'fa', delta: 3 },
    },
    {
      name: 'realm.relation.delta',
      effect: {
        type: 'realm.relation.delta',
        realmId: 'realm_qin',
        targetRealmId: 'realm_chu',
        delta: -10,
      },
    },
    {
      name: 'site.culturalIdentity.delta',
      effect: { type: 'site.culturalIdentity.delta', siteId: 'site_xianyang', delta: -1 },
    },
    {
      name: 'site.cultural.set',
      effect: { type: 'site.cultural.set', siteId: 'site_xianyang', tag: 'chinese_qin' },
    },
    {
      name: 'academy.create',
      effect: {
        type: 'academy.create',
        academyId: 'academy_jixia',
        hostRealmId: 'realm_qi',
        hostSiteId: 'site_qi',
        primaryIdeology: 'ru',
      },
    },
    {
      name: 'academy.dormant',
      effect: { type: 'academy.dormant', academyId: 'academy_jixia' },
    },
    {
      name: 'zhouInvestiture.grant',
      effect: { type: 'zhouInvestiture.grant', realmId: 'realm_qin', rank: 'duke' },
    },
  ]

  it.each(valid)('accepts $name', ({ effect }) => {
    expect(EffectSchema.safeParse(effect).success).toBe(true)
  })

  it('rejects realm.ideology.delta with an unknown ideology', () => {
    const effect = { type: 'realm.ideology.delta', realmId: 'realm_qin', ideology: 'xian', delta: 1 }
    expect(EffectSchema.safeParse(effect).success).toBe(false)
  })

  it('rejects site.cultural.set with an unknown cultural tag', () => {
    const effect = { type: 'site.cultural.set', siteId: 'site_x', tag: 'chinese_lu' }
    expect(EffectSchema.safeParse(effect).success).toBe(false)
  })

  it('rejects zhouInvestiture.grant with an unknown rank', () => {
    const effect = { type: 'zhouInvestiture.grant', realmId: 'realm_qin', rank: 'emperor' }
    expect(EffectSchema.safeParse(effect).success).toBe(false)
  })

  it('rejects an unknown effect type at the discriminator boundary', () => {
    const effect = { type: 'realm.culture.delta', realmId: 'realm_qin', delta: 1 }
    expect(EffectSchema.safeParse(effect).success).toBe(false)
  })
})

describe('M6 WorldSchema academies field', () => {
  const baseAcademy: Academy = {
    id: 'academy_jixia',
    hostRealmId: 'realm_qi',
    hostSiteId: 'site_qi',
    primaryIdeology: 'ru',
    secondaryIdeology: 'dao',
    founded: 318,
    level: 1,
    status: 'active',
  }

  it('accepts a world whose academies map is empty', () => {
    const world = makeEmptyWorld()
    expect(WorldSchema.safeParse(world).success).toBe(true)
  })

  it('accepts a world with a populated academies map', () => {
    const academies = new Map<string, Academy>([[baseAcademy.id, baseAcademy]])
    const world = makeEmptyWorld({ academies })
    expect(WorldSchema.safeParse(world).success).toBe(true)
  })

  it('rejects a world whose academies field is a plain object instead of a Map', () => {
    const world = makeEmptyWorld()
    const result = WorldSchema.safeParse({
      ...world,
      academies: {} as unknown as ReadonlyMap<string, unknown>,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a world whose academies map contains a malformed entry', () => {
    const malformed = new Map<string, unknown>([['academy_jixia', { id: 'academy_jixia' }]])
    const world = makeEmptyWorld()
    const result = WorldSchema.safeParse({
      ...world,
      academies: malformed as unknown as ReadonlyMap<string, unknown>,
    })
    expect(result.success).toBe(false)
  })
})
