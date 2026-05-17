import { describe, expect, it } from 'vitest'
import { createWorldFromM1Data, loadM1Data, createWorldFromTutorialData, loadM9Data, createWorldFromM9Data } from '~/engine/world/factory'
import { generateSummary } from '~/engine/world/save-summary'

describe('generateSummary', () => {
  it('M1 world produces valid summary', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const rulers = new Map(world.rulers)
    rulers.set('realm_qin', {
      realmId: 'realm_qin',
      generalId: 'gen_qin_zhaoxiangwang',
      age: 47,
      lifespan: 60,
      health: 100,
      personality: 'conqueror',
      personalityDims: {} as any,
      successionLawId: 'primogeniture',
      inOfficeSinceTick: 0,
    })
    const worldWithRuler = { ...world, rulers }

    const summary = generateSummary(worldWithRuler, 'm1')
    expect(summary).toContain('秦昭襄王')
    expect(summary).toContain('一')
    expect(summary.length).toBeLessThan(50)
  })

  it('M9 world produces valid summary', async () => {
    const data = await loadM9Data()
    const world = createWorldFromM9Data(data, 42, 'realm_qin')

    const rulers = new Map(world.rulers)
    rulers.set('realm_qin', {
      realmId: 'realm_qin',
      generalId: 'char_qin_zhaoxiangwang',
      age: 47,
      lifespan: 60,
      health: 100,
      personality: 'conqueror',
      personalityDims: {} as any,
      successionLawId: 'primogeniture',
      inOfficeSinceTick: 0,
    })
    const generals = new Map(world.generals)
    generals.set('char_qin_zhaoxiangwang', {
      id: 'char_qin_zhaoxiangwang',
      realmId: 'realm_qin',
      name: '秦昭襄王',
      might: 10,
      command: 10,
      loyalty: 100,
    })

    const worldWithRuler = { ...world, rulers, generals }

    const summary = generateSummary(worldWithRuler, 'm9')
    expect(summary).toContain('秦昭襄王')
    expect(summary).toContain('一')
    expect(summary.length).toBeLessThan(50)
  })

  it('tutorial world produces valid summary', () => {
    const world = createWorldFromTutorialData()
    const summary = generateSummary(world, 'tutorial')
    expect(summary).toContain('公元前')
    expect(summary).toContain('三百一十六')
    expect(summary.length).toBeLessThan(50)
  })

  it('fallback to Zhou king when no ruler', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const worldNoRuler = { ...world, rulers: new Map() }

    const summary = generateSummary(worldNoRuler, 'm1')
    expect(summary).toContain('周赧王')
    expect(summary).toContain('五十五')
  })

  it('includes war event in summary', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const wars = new Map(world.wars)
    wars.set('realm_qin:realm_zhao', {
      casusBelli: null,
      declaredAt: world.date,
      occupiedSites: new Map(),
      peaceProposalId: null,
    })
    const worldWithWar = { ...world, wars }

    const summary = generateSummary(worldWithWar, 'm1')
    expect(summary).toContain('伐赵')
  })
})
