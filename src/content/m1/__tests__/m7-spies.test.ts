import { describe, it, expect } from 'vitest'
import scenarioJson from '../scenario.json'

interface GeneralAttrs {
  wu: number
  zheng: number
  jiao: number
  mou: number
  xue: number
  po: number
}

interface GeneralShape {
  id: string
  realmId: string
  name: string
  might: number
  command: number
  loyalty: number
  attrs?: GeneralAttrs
  specialty?: string
  ambition?: string
  age?: number
  posts?: readonly string[]
  loyaltyState?: string
}

interface SiteShape {
  id: string
}

describe('M7 spies in scenario', () => {
  const generals = scenarioJson.generals as GeneralShape[]
  const sites = scenarioJson.sites as SiteShape[]
  const spies = generals.filter((g) => g.specialty === 'spy')

  it('scenario has at least 6 generals with specialty=spy', () => {
    expect(spies.length).toBeGreaterThanOrEqual(6)
  })

  it('苏代 (Su Dai) exists with id=gen_su_dai, realmId=realm_yan, age=50, specialty=spy', () => {
    const suDai = generals.find((g) => g.id === 'gen_su_dai')
    expect(suDai, 'gen_su_dai should exist').toBeDefined()
    expect(suDai!.realmId).toBe('realm_yan')
    expect(suDai!.age).toBe(50)
    expect(suDai!.specialty).toBe('spy')
    expect(suDai!.name).toBe('苏代')
    expect(suDai!.attrs?.mou).toBe(18)
    expect(suDai!.attrs?.jiao).toBe(16)
  })

  it('5 placeholder spies exist (one per realm: qi/chu/zhao/wei/qin)', () => {
    const expectedPlaceholders: ReadonlyArray<{ id: string; realmId: string }> = [
      { id: 'gen_qi_spy_a', realmId: 'realm_qi' },
      { id: 'gen_chu_spy_b', realmId: 'realm_chu' },
      { id: 'gen_zhao_spy_c', realmId: 'realm_zhao' },
      { id: 'gen_wei_spy_d', realmId: 'realm_wei' },
      { id: 'gen_qin_spy_e', realmId: 'realm_qin' },
    ]
    for (const expected of expectedPlaceholders) {
      const spy = generals.find((g) => g.id === expected.id)
      expect(spy, `${expected.id} should exist`).toBeDefined()
      expect(spy!.realmId, `${expected.id} should belong to ${expected.realmId}`).toBe(expected.realmId)
      expect(spy!.specialty, `${expected.id} should have specialty=spy`).toBe('spy')
      expect(spy!.ambition, `${expected.id} should have low ambition`).toBe('low')
    }
  })

  it('era-validation: 苏代 age=50 is reasonable for ~260 BC (active ~280-260 BC)', () => {
    const suDai = generals.find((g) => g.id === 'gen_su_dai')
    expect(suDai).toBeDefined()
    expect(suDai!.age).toBeGreaterThanOrEqual(40)
    expect(suDai!.age).toBeLessThanOrEqual(70)
  })

  it('50-site invariant: no new sites added by M7 spy content', () => {
    expect(sites.length).toBe(50)
  })

  it('all 6 spies have valid attrs and complete schema fields', () => {
    expect(spies.length).toBeGreaterThanOrEqual(6)
    for (const spy of spies) {
      expect(spy.attrs, `${spy.id} should have attrs`).toBeDefined()
      expect(spy.attrs!.mou, `${spy.id} mou should be in range`).toBeGreaterThanOrEqual(10)
      expect(spy.attrs!.mou).toBeLessThanOrEqual(20)
      expect(spy.attrs!.jiao).toBeGreaterThanOrEqual(10)
      expect(spy.loyalty).toBeGreaterThanOrEqual(70)
      expect(spy.loyalty).toBeLessThanOrEqual(100)
      expect(spy.posts).toEqual([])
      expect(spy.loyaltyState).toBe('loyal')
    }
  })
})
