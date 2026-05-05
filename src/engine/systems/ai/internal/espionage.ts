import type {
  AIEspionageOption,
  EspionageActionKind,
  GameEvent,
  GeneralId,
  Realm,
  RealmId,
  RNGState,
  SpyMission,
  World,
} from '~/shared/types'
import { ESPIONAGE_ACTION_KINDS } from '~/shared/types'
import { scoreEspionageOption } from '~/engine/systems/espionage/score-espionage'
import {
  M7_DISCORD_DURATION_TICKS,
  M7_ENABLED,
  M7_RECON_DURATION_TICKS,
  M7_RUMOR_DURATION_TICKS,
} from '~/content/m2/balance'
import { getPersonality } from '../utility-scorer'

function computeEspionageBaseScore(
  _world: World,
  _realm: Realm,
  _targetRealm: Realm,
  _action: EspionageActionKind
): number {
  return 50
}

function getMissionDuration(action: EspionageActionKind): number {
  switch (action) {
    case 'reconnaissance':
      return M7_RECON_DURATION_TICKS
    case 'rumor':
      return M7_RUMOR_DURATION_TICKS
    case 'discord':
      return M7_DISCORD_DURATION_TICKS
    case 'counter_intel':
      return M7_RECON_DURATION_TICKS
  }
}

function pickDiscordTarget(world: World, targetRealmId: RealmId): GeneralId | null {
  const candidates = [...world.generals.values()]
    .filter((g) => g.realmId === targetRealmId && g.specialty !== 'spy')
    .sort((a, b) => a.id.localeCompare(b.id))
  return candidates[0]?.id ?? null
}

export function planEspionageAction(
  world: World,
  realm: Realm,
  rng: RNGState
): { ok: boolean; world: World; events: GameEvent[]; nextRng: RNGState } {
  if (!M7_ENABLED) return { ok: false, world, events: [], nextRng: rng }

  const spyGeneral = [...world.generals.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((g) => g.realmId === realm.id && g.specialty === 'spy')
  if (!spyGeneral) return { ok: false, world, events: [], nextRng: rng }

  const hasActiveMission = [...world.spyMissions.values()].some(
    (m) => m.spyRealmId === realm.id && m.status === 'in_progress'
  )
  if (hasActiveMission) return { ok: false, world, events: [], nextRng: rng }

  const personality = getPersonality(world, realm.id)

  const candidates: AIEspionageOption[] = []
  const sortedRealms = [...world.realms.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )
  for (const targetRealm of sortedRealms) {
    if (targetRealm.id === realm.id) continue
    for (const action of ESPIONAGE_ACTION_KINDS) {
      if (action === 'counter_intel') continue
      const baseScore = computeEspionageBaseScore(
        world,
        realm,
        targetRealm,
        action
      )
      candidates.push({
        kind: action,
        spyRealmId: realm.id,
        targetRealmId: targetRealm.id,
        score: baseScore,
      })
    }
  }

  if (candidates.length === 0)
    return { ok: false, world, events: [], nextRng: rng }

  const scored: AIEspionageOption[] = candidates.map((c) => ({
    ...c,
    score: scoreEspionageOption(c, personality),
  }))

  scored.sort((a, b) => {
    const sa = a.score ?? 0
    const sb = b.score ?? 0
    if (sb !== sa) return sb - sa
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
    return a.targetRealmId.localeCompare(b.targetRealmId)
  })

  const best = scored[0]!
  if ((best.score ?? 0) <= 0)
    return { ok: false, world, events: [], nextRng: rng }

  const duration = getMissionDuration(best.kind)
  const missionId = `mission_${realm.id}_${world.tick}`
  const mission: SpyMission = {
    id: missionId,
    spyGeneralId: spyGeneral.id,
    spyRealmId: realm.id,
    targetRealmId: best.targetRealmId,
    action: best.kind,
    startTick: world.tick,
    resolveTick: world.tick + duration,
    status: 'in_progress',
    targetGeneralId:
      best.kind === 'discord' ? pickDiscordTarget(world, best.targetRealmId) : null,
  }

  const newMissions = new Map(world.spyMissions)
  newMissions.set(missionId, mission)

  return {
    ok: true,
    world: { ...world, spyMissions: newMissions },
    events: [],
    nextRng: rng,
  }
}
