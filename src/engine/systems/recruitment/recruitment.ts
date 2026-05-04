import type {
  Academy,
  Ambition,
  CharacterRecruitedEvent,
  GameEvent,
  General,
  GeneralId,
  Ideology,
  IdeologyLean,
  PersonalityArchetype,
  RealmId,
  RNGState,
  Specialty,
  World,
} from '~/shared/types'
import { nextRng } from '~/engine/random'
import { isYearStart } from '~/engine/calendar'
import { getPersonality } from '~/engine/systems/ai/utility-scorer'
import {
  M5_RECRUITMENT_PER_REALM_PER_YEAR,
  M5_SPECIALTY_WEIGHTS_RECRUITMENT,
  M6_ACADEMY_HOST_RATIO,
  M6_ACADEMY_NEAR_RATIO,
  M6_ENABLED,
  M8_RECRUITMENT_SPECIALTY_PREFERENCE,
} from '~/content/m2/balance'

const NAME_POOL: readonly string[] = [
  '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸',
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉',
  '戌', '亥', '仁', '义', '礼', '智', '信', '忠', '孝', '廉',
  '耻', '勇', '文', '武', '德', '才', '贤', '良', '善', '美',
  '正', '直', '刚', '毅', '明', '达', '通', '博', '雅', '清',
  '洁', '纯', '朴', '诚', '实', '厚', '重', '慎', '谦', '和',
]

const ALL_IDEOLOGIES: readonly Ideology[] = ['fa', 'ru', 'dao', 'mo', 'zonghen', 'bing']
const ALL_SPECIALTIES = Object.keys(M8_RECRUITMENT_SPECIALTY_PREFERENCE.incompetent) as Specialty[]
const ZERO_LEAN: IdeologyLean = { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }

function weightedSpecialtyEntries(
  baseWeights: Readonly<Record<string, number>>,
  personality: PersonalityArchetype,
): readonly (readonly [Specialty, number])[] {
  const rawEntries = ALL_SPECIALTIES.map((specialty) => [
    specialty,
    (baseWeights[specialty] ?? 0) * M8_RECRUITMENT_SPECIALTY_PREFERENCE[personality][specialty],
  ] as const)
  const totalWeight = rawEntries.reduce((sum, [, weight]) => sum + weight, 0)

  return rawEntries.map(([specialty, weight]) => [specialty, weight / totalWeight] as const)
}

function pickSpecialtyFromRoll(
  roll: number,
  baseWeights: Readonly<Record<string, number>>,
  personality: PersonalityArchetype,
): Specialty {
  const entries = weightedSpecialtyEntries(baseWeights, personality)
  let cumulative = 0
  for (const [specialty, weight] of entries) {
    cumulative += weight
    if (roll < cumulative) {
      return specialty
    }
  }
  return entries[entries.length - 1]![0]
}

export function pickSpecialty(
  rng: RNGState,
  baseWeights: Readonly<Record<string, number>> = M5_SPECIALTY_WEIGHTS_RECRUITMENT,
  personality: PersonalityArchetype = 'incompetent',
): Specialty {
  const roll = nextRng(rng)
  return pickSpecialtyFromRoll(roll.value, baseWeights, personality)
}

function rollSpecialty(
  rng: RNGState,
  personality: PersonalityArchetype,
): { specialty: Specialty; nextRng: RNGState } {
  const roll = nextRng(rng)
  return {
    specialty: pickSpecialtyFromRoll(roll.value, M5_SPECIALTY_WEIGHTS_RECRUITMENT, personality),
    nextRng: roll.nextState,
  }
}

function pickName(rng: RNGState, existingNames: Set<string>): { name: string; nextRng: RNGState } {
  const roll = nextRng(rng)
  const idx = Math.floor(roll.value * NAME_POOL.length)
  const baseName = NAME_POOL[Math.min(idx, NAME_POOL.length - 1)]!

  let name = baseName
  let suffix = 2
  while (existingNames.has(name)) {
    name = `${baseName}_${suffix}`
    suffix++
  }

  return { name, nextRng: roll.nextState }
}

function rollAttr(rng: RNGState): { value: number; nextRng: RNGState } {
  const roll = nextRng(rng)
  return { value: Math.floor(roll.value * 20) + 1, nextRng: roll.nextState }
}

function rollAmbition(rng: RNGState): { ambition: Ambition; nextRng: RNGState } {
  const roll = nextRng(rng)
  const ambition: Ambition = roll.value < 0.4 ? 'low' : roll.value < 0.8 ? 'mid' : 'high'
  return { ambition, nextRng: roll.nextState }
}

function cosineSimilarity(a: IdeologyLean, b: IdeologyLean): number {
  let dot = 0
  let magA = 0
  let magB = 0
  for (const k of ALL_IDEOLOGIES) {
    dot += a[k] * b[k]
    magA += a[k] ** 2
    magB += b[k] ** 2
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

function rankRealmsByIdeology(world: World, hostRealmId: RealmId): readonly RealmId[] {
  const host = world.realms.get(hostRealmId)
  if (!host) return []
  const hostLean = host.ideologyLean ?? ZERO_LEAN
  return [...world.realms.values()]
    .filter((r) => r.id !== hostRealmId)
    .map((r) => ({ id: r.id, sim: cosineSimilarity(hostLean, r.ideologyLean ?? ZERO_LEAN) }))
    .sort((a, b) => {
      if (b.sim !== a.sim) return b.sim - a.sim
      return a.id.localeCompare(b.id)
    })
    .map((x) => x.id)
}

function pickAcademyTarget(world: World, hostRealmId: RealmId, roll: number): RealmId {
  if (roll < M6_ACADEMY_HOST_RATIO) return hostRealmId

  const ranked = rankRealmsByIdeology(world, hostRealmId)
  if (ranked.length === 0) return hostRealmId

  if (roll < M6_ACADEMY_HOST_RATIO + M6_ACADEMY_NEAR_RATIO) {
    return ranked[0]!
  }
  return ranked[1] ?? ranked[0] ?? hostRealmId
}

interface RolledTalent {
  readonly attrs: General['attrs']
  readonly specialty: Specialty
  readonly ambition: Ambition
  readonly name: string
  readonly nextRng: RNGState
}

function rollTalent(
  rng: RNGState,
  existingNames: Set<string>,
  personality: PersonalityArchetype,
): RolledTalent {
  let currentRng = rng
  const wu = rollAttr(currentRng); currentRng = wu.nextRng
  const zheng = rollAttr(currentRng); currentRng = zheng.nextRng
  const jiao = rollAttr(currentRng); currentRng = jiao.nextRng
  const mou = rollAttr(currentRng); currentRng = mou.nextRng
  const xue = rollAttr(currentRng); currentRng = xue.nextRng
  const po = rollAttr(currentRng); currentRng = po.nextRng

  const specialtyRoll = rollSpecialty(currentRng, personality); currentRng = specialtyRoll.nextRng
  const ambitionRoll = rollAmbition(currentRng); currentRng = ambitionRoll.nextRng
  const nameRoll = pickName(currentRng, existingNames); currentRng = nameRoll.nextRng

  return {
    attrs: {
      wu: wu.value,
      zheng: zheng.value,
      jiao: jiao.value,
      mou: mou.value,
      xue: xue.value,
      po: po.value,
    },
    specialty: specialtyRoll.specialty,
    ambition: ambitionRoll.ambition,
    name: nameRoll.name,
    nextRng: currentRng,
  }
}

function makeAcademyGeneralId(academy: Academy, tick: number, slot: number): GeneralId {
  return `gen_academy_${academy.id}_${tick}_${slot}`
}

export function recruitmentPhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (!isYearStart(world)) {
    return { world, nextRng: rng, events: [] }
  }

  const events: CharacterRecruitedEvent[] = []
  const generals = new Map(world.generals)
  const existingNames = new Set([...generals.values()].map((g) => g.name))
  let currentRng = rng

  const sortedRealmIds = [...world.realms.keys()].sort((a, b) => a.localeCompare(b))

  for (const realmId of sortedRealmIds) {
    const personality = getPersonality(world, realmId)

    if (M6_ENABLED) {
      const realmAcademies = [...world.academies.values()]
        .filter((a) => a.hostRealmId === realmId && a.status === 'active')
        .sort((a, b) => a.id.localeCompare(b.id))

      let academySlot = 0
      for (const academy of realmAcademies) {
        const targetRoll = nextRng(currentRng); currentRng = targetRoll.nextState
        const targetRealmId = pickAcademyTarget(world, realmId, targetRoll.value)

        const talent = rollTalent(currentRng, existingNames, personality); currentRng = talent.nextRng
        existingNames.add(talent.name)

        const generalId = makeAcademyGeneralId(academy, world.tick, academySlot)
        academySlot += 1

        const newGeneral: General = {
          id: generalId,
          realmId: targetRealmId,
          name: talent.name,
          might: talent.attrs!.wu,
          command: talent.attrs!.wu,
          loyalty: 80,
          attrs: talent.attrs,
          specialty: talent.specialty,
          ambition: talent.ambition,
          age: 25,
          recruitedAtTick: world.tick,
          posts: [],
          loyaltyState: 'loyal',
          almaMater: academy.id,
        }

        generals.set(generalId, newGeneral)
        events.push({
          type: 'characterRecruited',
          payload: { generalId, realmId: targetRealmId, name: talent.name },
        })
      }
    }

    for (let i = 0; i < M5_RECRUITMENT_PER_REALM_PER_YEAR; i++) {
      const talent = rollTalent(currentRng, existingNames, personality); currentRng = talent.nextRng
      existingNames.add(talent.name)

      const generalId: GeneralId = `gen_wild_${realmId}_${world.tick}_${i}`

      const newGeneral: General = {
        id: generalId,
        realmId,
        name: talent.name,
        might: talent.attrs!.wu,
        command: talent.attrs!.wu,
        loyalty: 80,
        attrs: talent.attrs,
        specialty: talent.specialty,
        ambition: talent.ambition,
        age: 25,
        recruitedAtTick: world.tick,
        posts: [],
        loyaltyState: 'loyal',
      }

      generals.set(generalId, newGeneral)
      events.push({
        type: 'characterRecruited',
        payload: { generalId, realmId, name: talent.name },
      })
    }
  }

  return {
    world: { ...world, generals },
    nextRng: currentRng,
    events,
  }
}
