import { describe, expect, it } from 'vitest'

import { characterLifecyclePhase, computeLoyaltyState } from '../character-lifecycle'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  CharacterDefectedEvent,
  GameDate,
  General,
  GeneralId,
  GovernorAssignment,
  GovernorAssignmentRevokedEvent,
  LoyaltyState,
  RealmId,
  SiteId,
  World,
} from '~/shared/types'

const yearStart: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const midYear: GameDate = { yearBC: 260, season: 'summer', month: 2, xun: 'zhong' }
const rng = { seed: 42, counter: 0 }

function makeGeneral(
  id: GeneralId,
  realmId: RealmId,
  loyalty: number,
  loyaltyState: LoyaltyState,
  overrides: Partial<General> = {},
): General {
  return {
    id,
    realmId,
    name: `General ${id}`,
    might: 70,
    command: 70,
    loyalty,
    loyaltyState,
    age: 30,
    ...overrides,
  }
}

function worldWithGenerals(
  generals: readonly General[],
  date: GameDate = midYear,
  governorAssignments: ReadonlyMap<SiteId, GovernorAssignment> = new Map(),
): World {
  return makeEmptyWorld({
    date,
    generals: new Map(generals.map((g) => [g.id, g])),
    governorAssignments,
  })
}

describe('computeLoyaltyState (boundary thresholds)', () => {
  it('loyalty=61 → loyaltyState=loyal', () => {
    expect(computeLoyaltyState(61)).toBe('loyal')
  })

  it('loyalty=60 → loyaltyState=loyal (boundary: state is loyal when loyalty >= SHIRKING_THRESHOLD)', () => {
    expect(computeLoyaltyState(60)).toBe('loyal')
  })

  it('loyalty=59 → loyaltyState=shirking', () => {
    expect(computeLoyaltyState(59)).toBe('shirking')
  })

  it('loyalty=41 → loyaltyState=shirking', () => {
    expect(computeLoyaltyState(41)).toBe('shirking')
  })

  it('loyalty=40 → loyaltyState=shirking (boundary at >= 40)', () => {
    expect(computeLoyaltyState(40)).toBe('shirking')
  })

  it('loyalty=39 → loyaltyState=seeking_departure', () => {
    expect(computeLoyaltyState(39)).toBe('seeking_departure')
  })

  it('loyalty=26 → loyaltyState=seeking_departure', () => {
    expect(computeLoyaltyState(26)).toBe('seeking_departure')
  })

  it('loyalty=25 → loyaltyState=seeking_departure (boundary at >= 25)', () => {
    expect(computeLoyaltyState(25)).toBe('seeking_departure')
  })

  it('loyalty=24 → loyaltyState=secret_contact', () => {
    expect(computeLoyaltyState(24)).toBe('secret_contact')
  })

  it('loyalty=11 → loyaltyState=secret_contact', () => {
    expect(computeLoyaltyState(11)).toBe('secret_contact')
  })

  it('loyalty=10 → loyaltyState=secret_contact (boundary at >= 10)', () => {
    expect(computeLoyaltyState(10)).toBe('secret_contact')
  })

  it('loyalty=9 → loyaltyState=defected', () => {
    expect(computeLoyaltyState(9)).toBe('defected')
  })

  it('loyalty=0 → loyaltyState=defected', () => {
    expect(computeLoyaltyState(0)).toBe('defected')
  })
})

describe('characterLifecyclePhase (loyalty state transitions)', () => {
  it('updates loyaltyState when loyalty crosses shirking threshold', () => {
    const general = makeGeneral('gen_a', 'realm_qin', 50, 'loyal')
    const world = worldWithGenerals([general])

    const result = characterLifecyclePhase(world, rng)

    expect(result.world.generals.get('gen_a')?.loyaltyState).toBe('shirking')
  })

  it('updates loyaltyState when loyalty crosses seeking_departure threshold', () => {
    const general = makeGeneral('gen_a', 'realm_qin', 30, 'shirking')
    const world = worldWithGenerals([general])

    const result = characterLifecyclePhase(world, rng)

    expect(result.world.generals.get('gen_a')?.loyaltyState).toBe('seeking_departure')
  })

  it('updates loyaltyState when loyalty crosses secret_contact threshold', () => {
    const general = makeGeneral('gen_a', 'realm_qin', 15, 'seeking_departure')
    const world = worldWithGenerals([general])

    const result = characterLifecyclePhase(world, rng)

    expect(result.world.generals.get('gen_a')?.loyaltyState).toBe('secret_contact')
  })

  it('keeps loyalty unchanged outside year start', () => {
    const general = makeGeneral('gen_a', 'realm_qin', 80, 'loyal')
    const world = worldWithGenerals([general], midYear)

    const result = characterLifecyclePhase(world, rng)

    expect(result.world.generals.get('gen_a')?.loyalty).toBe(80)
    expect(result.world.generals.get('gen_a')?.age).toBe(30)
  })

  it('decrements loyalty by 1 and increments age by 1 at year start', () => {
    const general = makeGeneral('gen_a', 'realm_qin', 80, 'loyal', { age: 30 })
    const world = worldWithGenerals([general], yearStart)

    const result = characterLifecyclePhase(world, rng)

    expect(result.world.generals.get('gen_a')?.loyalty).toBe(79)
    expect(result.world.generals.get('gen_a')?.age).toBe(31)
  })

  it('skips generals without loyaltyState (legacy/M1 generals are immune even with loyalty=5)', () => {
    const legacy: General = {
      id: 'gen_legacy',
      realmId: 'realm_qin',
      name: 'Legacy',
      might: 70,
      command: 70,
      loyalty: 5,
    }
    const world = worldWithGenerals([legacy])

    const result = characterLifecyclePhase(world, rng)

    expect(result.world.generals.has('gen_legacy')).toBe(true)
    expect(result.events).toEqual([])
  })

  it('removes defected character from world.generals', () => {
    const general = makeGeneral('gen_a', 'realm_qin', 5, 'secret_contact')
    const world = worldWithGenerals([general])

    const result = characterLifecyclePhase(world, rng)

    expect(result.world.generals.has('gen_a')).toBe(false)
  })

  it('emits characterDefected event when loyalty drops to defection level', () => {
    const general = makeGeneral('gen_a', 'realm_qin', 5, 'secret_contact')
    const world = worldWithGenerals([general])

    const result = characterLifecyclePhase(world, rng)

    expect(result.events).toHaveLength(1)
    const ev = result.events[0] as CharacterDefectedEvent
    expect(ev.type).toBe('characterDefected')
    expect(ev.payload.generalId).toBe('gen_a')
    expect(ev.payload.realmId).toBe('realm_qin')
  })

  it('emits governorAssignmentRevoked event when defected character was a governor', () => {
    const general = makeGeneral('gen_a', 'realm_qin', 5, 'secret_contact')
    const governorAssignments = new Map<SiteId, GovernorAssignment>([
      [
        'site_x',
        {
          siteId: 'site_x',
          realmId: 'realm_qin',
          generalId: 'gen_a',
          assignedAtTick: 0,
          modifierKind: 'tax_efficiency',
        },
      ],
    ])
    const world = worldWithGenerals([general], midYear, governorAssignments)

    const result = characterLifecyclePhase(world, rng)

    const revoked = result.events.find((e) => e.type === 'governorAssignmentRevoked') as
      | GovernorAssignmentRevokedEvent
      | undefined
    expect(revoked).toBeDefined()
    expect(revoked?.payload.siteId).toBe('site_x')
    expect(revoked?.payload.generalId).toBe('gen_a')
    expect(result.world.governorAssignments.has('site_x')).toBe(false)
  })

  it('processes generals in dictionary order (RNG determinism contract)', () => {
    const generals = [
      makeGeneral('gen_z', 'realm_a', 5, 'secret_contact'),
      makeGeneral('gen_a', 'realm_b', 5, 'secret_contact'),
      makeGeneral('gen_m', 'realm_c', 5, 'secret_contact'),
    ]
    const world = worldWithGenerals(generals)

    const result = characterLifecyclePhase(world, rng)

    const order = result.events
      .filter((e) => e.type === 'characterDefected')
      .map((e) => (e as CharacterDefectedEvent).payload.generalId)
    expect(order).toEqual(['gen_a', 'gen_m', 'gen_z'])
  })

  it('returns the same RNG state by reference (no random consumed)', () => {
    const general = makeGeneral('gen_a', 'realm_qin', 80, 'loyal')
    const world = worldWithGenerals([general])

    const result = characterLifecyclePhase(world, rng)

    expect(result.nextRng).toBe(rng)
  })

  it('produces deterministic results across repeated runs', () => {
    const generals = [
      makeGeneral('gen_a', 'realm_qin', 5, 'secret_contact'),
      makeGeneral('gen_b', 'realm_zhao', 80, 'loyal'),
    ]
    const world = worldWithGenerals(generals)

    const first = characterLifecyclePhase(world, rng)
    const second = characterLifecyclePhase(world, rng)

    expect(first.events).toEqual(second.events)
    expect([...first.world.generals.entries()]).toEqual([...second.world.generals.entries()])
  })
})
