import { describe, expect, it } from 'vitest'
import { personalityDriftPhase } from '../personality-drift-phase'
import { makeEmptyWorld, TEST_WORLD_DATE } from '~/shared/__tests__/fixtures'
import {
  M8_2_DRIFT_CLAMP_MAX,
  M8_2_DRIFT_CLAMP_MIN,
  M8_PERSONALITY_ARCHETYPE_LIST,
} from '~/content/m2/balance'
import type {
  DiplomacyEvent,
  PersonalityArchetype,
  Realm,
  RealmId,
  RulerPersonalityProfile,
  RulerState,
  World,
} from '~/shared/types'

const NUMERIC_DIMENSIONS: ReadonlyArray<keyof Omit<RulerPersonalityProfile, 'preferredStrategy'>> = [
  'expansionDrive',
  'diplomaticTrust',
  'caution',
  'honor',
  'vindictiveness',
  'reformInclination',
  'patience',
]

const baseDims: RulerPersonalityProfile = {
  expansionDrive: 0.5,
  diplomaticTrust: 0.5,
  caution: 0.5,
  honor: 0.5,
  vindictiveness: 0.5,
  reformInclination: 0.5,
  patience: 0.5,
  preferredStrategy: 'diplomatic',
}

function makeRealm(id: RealmId, treasury = 1000): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury, foodStores: 1000, taxRate: 0.1 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
  }
}

function makeRuler(realmId: RealmId, personality: PersonalityArchetype): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}`,
    age: 40,
    lifespan: 70,
    health: 100,
    personality,
    personalityDims: baseDims,
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function buildWorldWithExtremeTriggers(archetype: PersonalityArchetype): World {
  const player: RealmId = 'realm_player'
  const ai: RealmId = 'realm_ai'
  const opponent: RealmId = 'realm_opp'

  const history: DiplomacyEvent[] = [
    {
      id: 'evt_loss',
      kind: 'combat_observed',
      occurredAt: TEST_WORLD_DATE,
      actorRealmId: ai,
      targetRealmId: opponent,
      combatPayload: { armySizeTotal: 5000, borderSite: false, victorRealmId: opponent },
    },
    {
      id: 'evt_betrayal',
      kind: 'betrayal',
      occurredAt: TEST_WORLD_DATE,
      actorRealmId: ai,
      targetRealmId: opponent,
      treatyKind: 'alliance',
    },
  ]

  return makeEmptyWorld({
    realms: new Map([
      [player, makeRealm(player)],
      [ai, makeRealm(ai)],
      [opponent, makeRealm(opponent)],
    ]),
    rulers: new Map([[ai, makeRuler(ai, archetype)]]),
    diplomacyHistory: history,
    playerRealmId: player,
  })
}

function runDrift(initial: World, ticks: number): World {
  let current = initial
  for (let i = 0; i < ticks; i++) {
    const result = personalityDriftPhase(current, current.rngState)
    current = { ...result.world, tick: current.tick + 1, rngState: result.nextRng }
  }
  return current
}

describe('personalityDriftPhase clamp + 8 archetype coverage', () => {
  it.each(M8_PERSONALITY_ARCHETYPE_LIST)(
    'archetype "%s": all dims clamped to [0,1] and archetype unchanged after 1000 extreme drift events',
    (archetype) => {
      const initial = buildWorldWithExtremeTriggers(archetype)
      const final = runDrift(initial, 1000)
      const ruler = final.rulers.get('realm_ai')

      expect(ruler).toBeDefined()
      for (const dim of NUMERIC_DIMENSIONS) {
        const value = ruler!.personalityDims[dim]
        expect(value).toBeGreaterThanOrEqual(M8_2_DRIFT_CLAMP_MIN)
        expect(value).toBeLessThanOrEqual(M8_2_DRIFT_CLAMP_MAX)
      }
      expect(ruler!.personalityDims.preferredStrategy).toBe('diplomatic')
      expect(ruler!.personality).toBe(archetype)
    },
  )

  it('covers all 8 archetypes from M8_PERSONALITY_ARCHETYPE_LIST', () => {
    expect(M8_PERSONALITY_ARCHETYPE_LIST).toHaveLength(8)
  })
})
