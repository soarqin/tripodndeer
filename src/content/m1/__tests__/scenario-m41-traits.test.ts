import { describe, it, expect } from 'vitest'
import scenarioJson from '../scenario.json'
import {
  M41_PRE_APPLIED_TRAITS,
  M41_PRE_APPLIED_POLITICAL_SYSTEMS,
} from '~/content/m2/balance'

interface RealmShape {
  id: string
  traits?: readonly string[]
  politicalSystem?: string
}

describe('scenario M4.1 pre-applied reform traits and political systems', () => {
  const realms = scenarioJson.realms as RealmShape[]
  const findRealm = (id: string) => realms.find((r) => r.id === id)

  it('realm_qin has shang_yang_reform_done trait and legalist_centralized politicalSystem', () => {
    const qin = findRealm('realm_qin')
    expect(qin).toBeDefined()
    expect(qin!.traits).toEqual(['shang_yang_reform_done'])
    expect(qin!.politicalSystem).toBe('legalist_centralized')
  })

  it('realm_zhao has hu_fu_qi_she_done trait and commandery politicalSystem', () => {
    const zhao = findRealm('realm_zhao')
    expect(zhao).toBeDefined()
    expect(zhao!.traits).toEqual(['hu_fu_qi_she_done'])
    expect(zhao!.politicalSystem).toBe('commandery')
  })

  it('realm_chu has wu_qi_failed_legacy trait and enfeoffment politicalSystem', () => {
    const chu = findRealm('realm_chu')
    expect(chu).toBeDefined()
    expect(chu!.traits).toEqual(['wu_qi_failed_legacy'])
    expect(chu!.politicalSystem).toBe('enfeoffment')
  })

  it('realm_wei has li_kui_reform_done trait and commandery politicalSystem', () => {
    const wei = findRealm('realm_wei')
    expect(wei).toBeDefined()
    expect(wei!.traits).toEqual(['li_kui_reform_done'])
    expect(wei!.politicalSystem).toBe('commandery')
  })

  it('realm_han has empty traits (not pre-applied per D4 decision)', () => {
    const han = findRealm('realm_han')
    expect(han).toBeDefined()
    expect(han!.traits).toEqual([])
    expect(han!.politicalSystem).toBe('enfeoffment')
  })

  it('realm_qi, realm_yan, realm_zhou all have empty traits and enfeoffment', () => {
    for (const id of ['realm_qi', 'realm_yan', 'realm_zhou']) {
      const realm = findRealm(id)
      expect(realm, `${id} should exist`).toBeDefined()
      expect(realm!.traits, `${id} should have empty traits`).toEqual([])
      expect(realm!.politicalSystem, `${id} should be enfeoffment`).toBe('enfeoffment')
    }
  })

  it('all 4 pre-applied realms match M41_PRE_APPLIED_TRAITS constants', () => {
    for (const realmId of Object.keys(M41_PRE_APPLIED_TRAITS)) {
      const realm = findRealm(realmId)
      expect(realm, `${realmId} should exist`).toBeDefined()
      expect(realm!.traits).toEqual(M41_PRE_APPLIED_TRAITS[realmId])
    }
  })

  it('all 4 pre-applied realms match M41_PRE_APPLIED_POLITICAL_SYSTEMS constants', () => {
    for (const realmId of Object.keys(M41_PRE_APPLIED_POLITICAL_SYSTEMS)) {
      const realm = findRealm(realmId)
      expect(realm, `${realmId} should exist`).toBeDefined()
      expect(realm!.politicalSystem).toBe(M41_PRE_APPLIED_POLITICAL_SYSTEMS[realmId])
    }
  })

  it('all 8 realms have explicit traits and politicalSystem fields in scenario.json', () => {
    expect(realms.length).toBe(8)
    for (const realm of realms) {
      expect(realm.traits, `${realm.id} should have explicit traits`).toBeDefined()
      expect(Array.isArray(realm.traits)).toBe(true)
      expect(realm.politicalSystem, `${realm.id} should have explicit politicalSystem`).toBeDefined()
      expect(typeof realm.politicalSystem).toBe('string')
    }
  })
})
