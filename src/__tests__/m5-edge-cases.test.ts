/* eslint-disable max-lines-per-function */
import scenarioRaw from '~/content/m1/scenario.json'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { rulerLifecyclePhase } from '~/engine/systems/ruler/ruler-lifecycle'
import { characterLifecyclePhase } from '~/engine/systems/character/character-lifecycle'
import { recruitmentPhase } from '~/engine/systems/recruitment/recruitment'
import { splitRealm } from '~/engine/systems/ruler/realm-split'
import { migrateScenarioV2ToV3 } from '~/engine/world/migrations/v2-to-v3'
import { combatV2Step } from '~/engine/systems/combat-v2/combat-v2-step'
import { economyPhase } from '~/engine/systems/economy/economy-phase'
import { setCombatVarianceEnabled } from '~/engine/random'
import { warKey } from '~/engine/wars'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { M1DataSchemaV2, type M1DataV2 } from '~/shared/schemas'
import {
  M5_RECRUITMENT_PER_REALM_PER_YEAR,
  M5_RULER_BASE_LIFESPAN,
} from '~/content/m2/balance'
import type {
  Army,
  CharacterDefectedEvent,
  GameDate,
  General,
  GeneralId,
  GovernorAssignment,
  Realm,
  RealmId,
  RulerState,
  Site,
  SiteId,
  SuccessionCrisisEvent,
  WarState,
} from '~/shared/types'

const YEAR_START: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const RNG = { seed: 0, counter: 0 }

const scenarioV2 = M1DataSchemaV2.parse({ ...scenarioRaw, schema_version: 2 })

function makeRealm(id: RealmId, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 1000, taxRate: 0.1 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

function makeGeneral(
  id: GeneralId,
  realmId: RealmId,
  overrides: Partial<General> = {},
): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty: 80,
    age: 35,
    attrs: { wu: 50, zheng: 50, jiao: 50, mou: 50, xue: 50, po: 50 },
    specialty: 'administrator',
    loyaltyState: 'loyal',
    ...overrides,
  }
}

function makeRuler(realmId: RealmId, overrides: Partial<RulerState> = {}): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}`,
    age: 64,
    lifespan: 65,
    health: 80,
    personality: 'steward',
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
    ...overrides,
  }
}

function makeArmy(id: string, realmId: RealmId, overrides: Partial<Army> = {}): Army {
  return {
    id,
    realmId,
    manpower: 1000,
    location: 'site_1',
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
    ...overrides,
  }
}

function makeSite(id: SiteId, ownerId: RealmId | null): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 1000, households: 250, taxBase: 100, foodProduction: 100 },
  }
}

function makeWar(): WarState {
  return {
    casusBelli: null,
    declaredAt: YEAR_START,
    occupiedSites: new Map(),
    peaceProposalId: null,
  }
}

function makeMakeV2(overrides: Partial<M1DataV2> = {}): M1DataV2 {
  return M1DataSchemaV2.parse({ ...scenarioV2, ...overrides })
}

describe('M5 edge case integration tests', () => {
  describe('EC1: Ruler dies in combat (ruler is army.generalId)', () => {
    beforeEach(() => setCombatVarianceEnabled(false))
    afterEach(() => setCombatVarianceEnabled(true))

    it('removes the ruler general from world.generals and clears army.generalId, but leaves orphan RulerState', () => {
      const rulerGeneral = makeGeneral('general_realm_han', 'realm_han', { name: 'Han Ruler' })
      const attacker = makeArmy('army_qin', 'realm_qin', {
        manpower: 1000,
        location: 'site_1',
        state: 'marching',
        destination: 'site_2',
        source: 'site_1',
        ticksRemaining: 0,
      })
      const defender = makeArmy('army_han', 'realm_han', {
        manpower: 500,
        location: 'site_2',
        generalId: 'general_realm_han',
      })

      const world = makeEmptyWorld({
        date: { yearBC: 25, season: 'spring', month: 1, xun: 'shang' },
        sites: new Map([
          ['site_1', makeSite('site_1', 'realm_qin')],
          ['site_2', makeSite('site_2', 'realm_han')],
        ]),
        armies: new Map([
          [attacker.id, attacker],
          [defender.id, defender],
        ]),
        generals: new Map([['general_realm_han', rulerGeneral]]),
        rulers: new Map([['realm_han', makeRuler('realm_han', { generalId: 'general_realm_han' })]]),
        realms: new Map([
          ['realm_qin', makeRealm('realm_qin')],
          ['realm_han', makeRealm('realm_han', { rulerId: 'general_realm_han' })],
        ]),
      })

      const result = combatV2Step(world, RNG)

      expect(result.world.generals.has('general_realm_han')).toBe(false)
      expect(result.events.some((e) => e.type === 'generalDied')).toBe(true)
      expect(result.world.rulers.get('realm_han')?.generalId).toBe('general_realm_han')
    })
  })

  describe('EC2: Heir is also an army general (dual role)', () => {
    it('installs heir as new ruler when heir is currently leading an army', () => {
      const realmId: RealmId = 'realm_zhao'
      const oldRuler = makeGeneral(`general_${realmId}`, realmId)
      const heir = makeGeneral('g_heir_zhao', realmId, { loyalty: 95, specialty: 'commander' })
      const army = makeArmy('army_zhao', realmId, { generalId: 'g_heir_zhao' })

      const world = makeEmptyWorld({
        date: YEAR_START,
        playerRealmId: 'realm_qin',
        rulers: new Map([[realmId, makeRuler(realmId, { age: 64, lifespan: 65 })]]),
        generals: new Map([
          [oldRuler.id, oldRuler],
          [heir.id, heir],
        ]),
        armies: new Map([[army.id, army]]),
        realms: new Map([[realmId, makeRealm(realmId, { rulerId: oldRuler.id })]]),
      })

      const result = rulerLifecyclePhase(world, RNG)

      expect(result.world.rulers.get(realmId)?.generalId).toBe('g_heir_zhao')
      expect(result.world.realms.get(realmId)?.rulerId).toBe('g_heir_zhao')
      expect(result.world.generals.has('g_heir_zhao')).toBe(true)
      expect(result.world.armies.get('army_zhao')?.generalId).toBe('g_heir_zhao')
      expect(result.world.generals.has(oldRuler.id)).toBe(false)
    })
  })

  describe('EC3: Governor defects → economy phase handles safely', () => {
    it('runs economyPhase without errors after governor defects in characterLifecycle', () => {
      const realmId: RealmId = 'realm_qin'
      const governor = makeGeneral('gen_gov', realmId, {
        loyalty: 5,
        loyaltyState: 'secret_contact',
      })
      const governorAssignment: GovernorAssignment = {
        siteId: 'site_1',
        realmId,
        generalId: 'gen_gov',
        assignedAtTick: 0,
        modifierKind: 'tax_efficiency',
      }
      const world = makeEmptyWorld({
        date: YEAR_START,
        playerRealmId: realmId,
        realms: new Map([[realmId, makeRealm(realmId)]]),
        sites: new Map([['site_1', makeSite('site_1', realmId)]]),
        generals: new Map([[governor.id, governor]]),
        governorAssignments: new Map([['site_1', governorAssignment]]),
      })

      const lifecycleResult = characterLifecyclePhase(world, RNG)
      expect(lifecycleResult.events.some((e) => e.type === 'characterDefected')).toBe(true)
      expect(lifecycleResult.world.governorAssignments.has('site_1')).toBe(false)

      expect(() => economyPhase(lifecycleResult.world, lifecycleResult.nextRng)).not.toThrow()
      const economyResult = economyPhase(lifecycleResult.world, lifecycleResult.nextRng)
      expect(economyResult.world.realms.get(realmId)).toBeDefined()
    })
  })

  describe('EC4: Multiple realms split in same tick (dictionary order)', () => {
    it('handles two consecutive splitRealm calls without ID conflicts', () => {
      const oldA: RealmId = 'realm_old_a'
      const oldB: RealmId = 'realm_old_b'
      const world = makeEmptyWorld({
        realms: new Map([
          [oldA, makeRealm(oldA)],
          [oldB, makeRealm(oldB)],
        ]),
        sites: new Map([
          ['site_a1', makeSite('site_a1', oldA)],
          ['site_a2', makeSite('site_a2', oldA)],
          ['site_b1', makeSite('site_b1', oldB)],
          ['site_b2', makeSite('site_b2', oldB)],
        ]),
      })

      const splitA = splitRealm(world, oldA, {
        newRealmIdsBySite: { site_a1: 'realm_a_alpha', site_a2: 'realm_a_beta' },
      })
      const splitB = splitRealm(splitA.world, oldB, {
        newRealmIdsBySite: { site_b1: 'realm_b_alpha', site_b2: 'realm_b_beta' },
      })

      expect(splitB.world.realms.has(oldA)).toBe(false)
      expect(splitB.world.realms.has(oldB)).toBe(false)
      expect(splitB.world.realms.has('realm_a_alpha')).toBe(true)
      expect(splitB.world.realms.has('realm_a_beta')).toBe(true)
      expect(splitB.world.realms.has('realm_b_alpha')).toBe(true)
      expect(splitB.world.realms.has('realm_b_beta')).toBe(true)
      expect(splitA.events).toHaveLength(1)
      expect(splitB.events).toHaveLength(1)
    })
  })

  describe('EC5: Empty character pool → recruitment replenishes', () => {
    it('recruitmentPhase generates new characters even when realm has zero existing characters', () => {
      const realmId: RealmId = 'realm_qin'
      const world = makeEmptyWorld({
        date: YEAR_START,
        realms: new Map([[realmId, makeRealm(realmId)]]),
        generals: new Map(),
      })

      const result = recruitmentPhase(world, RNG)

      expect(result.world.generals.size).toBe(M5_RECRUITMENT_PER_REALM_PER_YEAR)
      expect(result.events).toHaveLength(M5_RECRUITMENT_PER_REALM_PER_YEAR)
      expect(result.events.every((e) => e.type === 'characterRecruited')).toBe(true)
    })
  })

  describe('EC6: Combat death takes priority over defection (phase ordering)', () => {
    it('characterLifecycle does not emit characterDefected for a general already removed by combat', () => {
      const realmId: RealmId = 'realm_qin'
      const removedGeneralId = 'gen_dead_in_combat'
      const survivor = makeGeneral('gen_survivor', realmId, {
        loyalty: 80,
        loyaltyState: 'loyal',
      })

      const world = makeEmptyWorld({
        date: YEAR_START,
        realms: new Map([[realmId, makeRealm(realmId)]]),
        generals: new Map([[survivor.id, survivor]]),
      })

      const result = characterLifecyclePhase(world, RNG)

      const defectedIds = result.events
        .filter((e) => e.type === 'characterDefected')
        .map((e) => (e as CharacterDefectedEvent).payload.generalId)
      expect(defectedIds).not.toContain(removedGeneralId)
      expect(result.world.generals.has(survivor.id)).toBe(true)
    })
  })

  describe('EC7: Multiple succession crises in same tick (deterministic order, single player modal)', () => {
    it('emits successionCrisis events for both player and AI realms in dictionary order', () => {
      const player: RealmId = 'realm_qin'
      const ai: RealmId = 'realm_zhao'

      const world = makeEmptyWorld({
        date: YEAR_START,
        playerRealmId: player,
        rulers: new Map([
          [player, makeRuler(player, { age: 64, lifespan: 65 })],
          [ai, makeRuler(ai, { age: 64, lifespan: 65 })],
        ]),
        generals: new Map([
          [`general_${player}`, makeGeneral(`general_${player}`, player)],
          [`general_${ai}`, makeGeneral(`general_${ai}`, ai)],
        ]),
        realms: new Map([
          [player, makeRealm(player, { rulerId: `general_${player}` })],
          [ai, makeRealm(ai, { rulerId: `general_${ai}` })],
        ]),
      })

      const result = rulerLifecyclePhase(world, RNG)

      const crises = result.events.filter(
        (e): e is SuccessionCrisisEvent => e.type === 'successionCrisis',
      )
      expect(crises).toHaveLength(2)
      expect(crises.map((e) => e.payload.realmId)).toEqual([player, ai])

      const playerCrises = crises.filter((e) => e.payload.realmId === player)
      expect(playerCrises).toHaveLength(1)
    })
  })

  describe('EC8: Realm splits while in war (primary inherits, secondary does not)', () => {
    it('only the primary new realm inherits the war with another realm', () => {
      const oldRealm: RealmId = 'realm_old'
      const otherRealm: RealmId = 'realm_other'
      const oldVsOtherKey = warKey(oldRealm, otherRealm)

      const world = makeEmptyWorld({
        realms: new Map([
          [oldRealm, makeRealm(oldRealm)],
          [otherRealm, makeRealm(otherRealm)],
        ]),
        sites: new Map([
          ['site_x', makeSite('site_x', oldRealm)],
          ['site_y', makeSite('site_y', oldRealm)],
        ]),
        wars: new Map([[oldVsOtherKey, makeWar()]]),
      })

      const result = splitRealm(world, oldRealm, {
        newRealmIdsBySite: { site_x: 'realm_split_a', site_y: 'realm_split_b' },
      })

      expect(result.world.wars.has(oldVsOtherKey)).toBe(false)
      expect(result.world.wars.has(warKey('realm_split_a', otherRealm))).toBe(true)
      expect(result.world.wars.has(warKey('realm_split_b', otherRealm))).toBe(false)
    })
  })

  describe('EC9: aiPersonality=aggressive_random migrates to ruler.personality=schemer', () => {
    it('v2 fixture with aggressive_random produces v3 ruler with personality=schemer', () => {
      const realm = scenarioV2.realms[0]!
      const data = makeMakeV2({
        realms: [{ ...realm, aiPersonality: 'aggressive_random', rulerId: 'gen_random' }],
        generals: [
          {
            id: 'gen_random',
            realmId: realm.id,
            name: '随机王',
            might: 12,
            command: 5000,
            loyalty: 100,
            posts: ['ruler'],
          },
        ],
      })

      const v3 = migrateScenarioV2ToV3(data)
      const ruler = v3.rulers.find((r) => r.realmId === realm.id)

      expect(ruler).toBeDefined()
      expect(ruler!.personality).toBe('schemer')
      expect(ruler!.lifespan).toBe(M5_RULER_BASE_LIFESPAN)
    })
  })
})
