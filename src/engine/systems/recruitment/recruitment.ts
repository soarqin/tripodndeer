import type {
  Ambition,
  CharacterRecruitedEvent,
  GameEvent,
  General,
  GeneralId,
  RNGState,
  Specialty,
  World,
} from '~/shared/types'
import { nextRng } from '~/engine/random'
import {
  M5_RECRUITMENT_PER_REALM_PER_YEAR,
  M5_SPECIALTY_WEIGHTS_RECRUITMENT,
} from '~/content/m2/balance'

const NAME_POOL: readonly string[] = [
  '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸',
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉',
  '戌', '亥', '仁', '义', '礼', '智', '信', '忠', '孝', '廉',
  '耻', '勇', '文', '武', '德', '才', '贤', '良', '善', '美',
  '正', '直', '刚', '毅', '明', '达', '通', '博', '雅', '清',
  '洁', '纯', '朴', '诚', '实', '厚', '重', '慎', '谦', '和',
]

function isYearStart(world: World): boolean {
  return world.date.season === 'spring' && world.date.month === 1 && world.date.xun === 'shang'
}

function pickSpecialty(rng: RNGState): { specialty: Specialty; nextRng: RNGState } {
  const roll = nextRng(rng)
  const entries = Object.entries(M5_SPECIALTY_WEIGHTS_RECRUITMENT)
  let cumulative = 0
  for (const [specialty, weight] of entries) {
    cumulative += weight
    if (roll.value < cumulative) {
      return { specialty: specialty as Specialty, nextRng: roll.nextState }
    }
  }
  return { specialty: entries[entries.length - 1]![0] as Specialty, nextRng: roll.nextState }
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
    for (let i = 0; i < M5_RECRUITMENT_PER_REALM_PER_YEAR; i++) {
      const wu = rollAttr(currentRng); currentRng = wu.nextRng
      const zheng = rollAttr(currentRng); currentRng = zheng.nextRng
      const jiao = rollAttr(currentRng); currentRng = jiao.nextRng
      const mou = rollAttr(currentRng); currentRng = mou.nextRng
      const xue = rollAttr(currentRng); currentRng = xue.nextRng
      const po = rollAttr(currentRng); currentRng = po.nextRng

      const specialtyRoll = pickSpecialty(currentRng); currentRng = specialtyRoll.nextRng
      const ambitionRoll = rollAmbition(currentRng); currentRng = ambitionRoll.nextRng

      const nameRoll = pickName(currentRng, existingNames); currentRng = nameRoll.nextRng
      existingNames.add(nameRoll.name)

      const generalId: GeneralId = `gen_wild_${realmId}_${world.tick}_${i}`

      const newGeneral: General = {
        id: generalId,
        realmId,
        name: nameRoll.name,
        might: wu.value,
        command: wu.value,
        loyalty: 80,
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
        age: 25,
        posts: [],
        loyaltyState: 'loyal',
      }

      generals.set(generalId, newGeneral)
      events.push({
        type: 'characterRecruited',
        payload: { generalId, realmId, name: nameRoll.name },
      })
    }
  }

  return {
    world: { ...world, generals },
    nextRng: currentRng,
    events,
  }
}
