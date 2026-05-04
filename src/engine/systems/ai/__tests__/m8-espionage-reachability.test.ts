import { describe, expect, it } from 'vitest'

import { M7_ESPIONAGE_WEIGHTS } from '~/content/m2/balance'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import {
  ESPIONAGE_ACTION_KINDS,
  type EspionageActionKind,
  type PersonalityArchetype,
  type RealmId,
} from '~/shared/types'

import { getPersonality } from '../utility-scorer'

const QIN: RealmId = 'realm_qin'
const SAMPLE_SIZE = 50
const ACTIVE_ACTION_KINDS = ESPIONAGE_ACTION_KINDS.filter(
  (kind) => kind !== 'counter_intel',
)
type EmptyWorldOverrides = NonNullable<Parameters<typeof makeEmptyWorld>[0]>
type EmptyWorldRealm = EmptyWorldOverrides['realms'] extends ReadonlyMap<
  RealmId,
  infer T
>
  ? T
  : never

function computeActionShares(
  archetype: PersonalityArchetype,
): Record<EspionageActionKind, number> {
  const weights = M7_ESPIONAGE_WEIGHTS[archetype]
  const totalWeight = ACTIVE_ACTION_KINDS.reduce(
    (sum, kind) => sum + (weights[kind] ?? 0),
    0,
  )

  const simulatedCounts = Object.fromEntries(
    ESPIONAGE_ACTION_KINDS.map((kind) => [
      kind,
      ACTIVE_ACTION_KINDS.includes(kind)
        ? totalWeight > 0
          ? ((weights[kind] ?? 0) / totalWeight) * SAMPLE_SIZE
          : 0
        : 0,
    ]),
  ) as Record<EspionageActionKind, number>

  const totalActions = Math.max(
    1,
    Object.values(simulatedCounts).reduce((sum, count) => sum + count, 0),
  )

  const shares = Object.fromEntries(
    ESPIONAGE_ACTION_KINDS.map((kind) => [kind, simulatedCounts[kind] / totalActions]),
  ) as Record<EspionageActionKind, number>

  return shares
}

function makeRulerlessWorld() {
  const realms: NonNullable<EmptyWorldOverrides['realms']> = new Map<
    RealmId,
    EmptyWorldRealm
  >([[QIN, { id: QIN } as EmptyWorldRealm]])

  return makeEmptyWorld({
    realms,
    playerRealmId: 'realm_test_player',
  })
}

describe('M8 espionage reachability signatures', () => {
  it('keeps ESPIONAGE_ACTION_KINDS at 4 entries', () => {
    expect(ESPIONAGE_ACTION_KINDS).toHaveLength(4)
  })

  it('schemer favors rumor + discord over the rest', () => {
    const shares = computeActionShares('schemer')
    expect(shares.rumor + shares.discord).toBeGreaterThanOrEqual(0.5)
  })

  it('tyrant keeps discord as the dominant destructive share', () => {
    const shares = computeActionShares('tyrant')
    expect(shares.discord).toBeGreaterThanOrEqual(0.35)
  })

  it('benevolent strongly prefers reconnaissance', () => {
    const shares = computeActionShares('benevolent')
    expect(shares.reconnaissance).toBeGreaterThanOrEqual(0.55)
  })

  it('learned strongly prefers reconnaissance', () => {
    const shares = computeActionShares('learned')
    expect(shares.reconnaissance).toBeGreaterThanOrEqual(0.5)
  })

  it('steward is more reconnaissance-oriented than schemer', () => {
    const shares = computeActionShares('steward')
    const schemerShares = computeActionShares('schemer')
    expect(shares.reconnaissance).toBeGreaterThanOrEqual(schemerShares.reconnaissance)
  })

  it('builder is more reconnaissance-oriented than schemer', () => {
    const shares = computeActionShares('builder')
    const schemerShares = computeActionShares('schemer')
    expect(shares.reconnaissance).toBeGreaterThanOrEqual(schemerShares.reconnaissance)
  })

  it('conqueror keeps offensive pressure at least as high as reconnaissance', () => {
    const shares = computeActionShares('conqueror')
    expect(shares.rumor + shares.discord).toBeGreaterThanOrEqual(shares.reconnaissance)
  })

  it('incompetent has no dominant espionage action', () => {
    const shares = computeActionShares('incompetent')
    expect(Math.max(shares.rumor, shares.discord, shares.reconnaissance)).toBeLessThan(0.5)
  })

  it('rulerless realms fall back to incompetent espionage distribution', () => {
    const world = makeRulerlessWorld()
    const personality = getPersonality(world, QIN)

    expect(personality).toBe('incompetent')
    expect(computeActionShares(personality)).toEqual(computeActionShares('incompetent'))
  })
})
