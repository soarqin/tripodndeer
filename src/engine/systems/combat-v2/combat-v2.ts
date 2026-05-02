import {
  GENERAL_LOSER_DEATH_RATE,
  GENERAL_MIGHT_SCALING,
  GENERAL_WINNER_DEATH_RATE,
  M4_BASIS_POINTS_DIVISOR,
  M5_ARMY_CAP_BONUS_PER_WU,
  RNG_VARIANCE_PERCENT,
  TERRAIN_DEFENSE,
  UNIT_BASE_POWER,
  UNIT_COUNTER_MATRIX,
} from '~/content/m2/balance'
import type { TerrainType, UnitType } from '~/content/m2/balance'
import { getTraitModifiers } from '~/content/m4_1/trait-effects'
import { nextRng, pickWithVariance } from '~/engine/random'
import type { Army, GameDate, General, GeneralId, Realm } from '~/shared/types'
import { pickTactic } from './tactics'

export interface Composition {
  infantry: number
  chariot: number
  cavalry: number
  crossbow: number
}

export type BattleType = 'field' | 'pass-assault' | 'siege-assault'

export interface BattleContext {
  attackerArmy: Army
  defenderArmies: readonly Army[]
  attackerGeneral: General | null
  defenderGeneral: General | null
  terrain: TerrainType
  battleType: BattleType
  passDefenseBonus: number
  siegeBonus: number
  attackerComposition: Composition
  defenderComposition: Composition
  date: GameDate
  attackerRealm?: Realm | null
  defenderRealm?: Realm | null
}

export interface ModifierStep {
  name: string
  attackerMultiplier: number
  defenderMultiplier: number
}

export interface BattleResolution {
  winner: 'attacker' | 'defender'
  attackerLoss: number
  defenderLoss: number
  deadGenerals: GeneralId[]
  steps: readonly ModifierStep[]
}

const UNIT_TYPES: readonly UnitType[] = ['infantry', 'chariot', 'cavalry', 'crossbow']

function compositionTotal(composition: Composition): number {
  return composition.infantry + composition.chariot + composition.cavalry + composition.crossbow
}

function compositionShare(composition: Composition, unitType: UnitType): number {
  const total = compositionTotal(composition)
  if (total === 0) return unitType === 'infantry' ? 1 : 0
  return composition[unitType] / total
}

function computeBasePower(manpower: number, composition: Composition): number {
  const total = compositionTotal(composition)
  if (total === 0) return manpower * UNIT_BASE_POWER.infantry

  return (
    composition.infantry * UNIT_BASE_POWER.infantry +
    composition.chariot * UNIT_BASE_POWER.chariot +
    composition.cavalry * UNIT_BASE_POWER.cavalry +
    composition.crossbow * UNIT_BASE_POWER.crossbow
  ) * manpower / total
}

function computeCounterModifier(
  attackerComposition: Composition,
  defenderComposition: Composition,
  attackerManpower: number,
  defenderManpower: number,
): number {
  if (attackerManpower <= 0 || defenderManpower <= 0) return 1

  let modifier = 0
  for (const attackerType of UNIT_TYPES) {
    const attackerShare = compositionShare(attackerComposition, attackerType)
    for (const defenderType of UNIT_TYPES) {
      const defenderShare = compositionShare(defenderComposition, defenderType)
      modifier += attackerShare * defenderShare * UNIT_COUNTER_MATRIX[attackerType][defenderType]
    }
  }
  return modifier
}

function rolledDeath(seed: number, counter: number, threshold: number): boolean {
  const { value } = nextRng({ seed, counter })
  return value < threshold
}

export function resolveCombat(ctx: BattleContext): BattleResolution {
  const defenderManpower = ctx.defenderArmies.reduce((sum, army) => sum + army.manpower, 0)

  if (defenderManpower === 0) {
    return { winner: 'attacker', attackerLoss: 0, defenderLoss: 0, deadGenerals: [], steps: [] }
  }

  const wuBonus = ctx.attackerGeneral?.attrs ? ctx.attackerGeneral.attrs.wu * M5_ARMY_CAP_BONUS_PER_WU : 0
  const commandCap = ctx.attackerGeneral ? ctx.attackerGeneral.command + wuBonus : Infinity
  const committedAttacker = Math.min(ctx.attackerArmy.manpower, commandCap)

  let attackerPower = computeBasePower(committedAttacker, ctx.attackerComposition)
  let defenderPower = computeBasePower(defenderManpower, ctx.defenderComposition)
  const steps: ModifierStep[] = []
  steps.push({ name: 'base-power', attackerMultiplier: 1, defenderMultiplier: 1 })

  const counterMod = computeCounterModifier(
    ctx.attackerComposition,
    ctx.defenderComposition,
    committedAttacker,
    defenderManpower,
  )
  attackerPower *= counterMod
  steps.push({ name: 'counter', attackerMultiplier: counterMod, defenderMultiplier: 1 })

  const terrainBonus = TERRAIN_DEFENSE[ctx.terrain] ?? 0
  defenderPower *= 1 + terrainBonus
  steps.push({ name: 'terrain', attackerMultiplier: 1, defenderMultiplier: 1 + terrainBonus })

  if (ctx.battleType === 'pass-assault' && ctx.passDefenseBonus > 0) {
    defenderPower *= 1 + ctx.passDefenseBonus
    steps.push({ name: 'pass-defense', attackerMultiplier: 1, defenderMultiplier: 1 + ctx.passDefenseBonus })
  } else if (ctx.battleType === 'siege-assault' && ctx.siegeBonus > 0) {
    defenderPower *= 1 + ctx.siegeBonus
    steps.push({ name: 'siege-defense', attackerMultiplier: 1, defenderMultiplier: 1 + ctx.siegeBonus })
  }

  const mightBonus = ctx.attackerGeneral ? ctx.attackerGeneral.might * GENERAL_MIGHT_SCALING : 0
  if (mightBonus > 0) {
    attackerPower *= 1 + mightBonus
    steps.push({ name: 'might', attackerMultiplier: 1 + mightBonus, defenderMultiplier: 1 })
  }

  if (ctx.attackerRealm || ctx.defenderRealm) {
    const attackerTraitMod = ctx.attackerRealm ? getTraitModifiers(ctx.attackerRealm) : null
    const defenderTraitMod = ctx.defenderRealm ? getTraitModifiers(ctx.defenderRealm) : null
    const attackerMultiplier = attackerTraitMod
      ? (M4_BASIS_POINTS_DIVISOR + attackerTraitMod.combatPowerMultiplierBp) / M4_BASIS_POINTS_DIVISOR
      : 1
    const defenderMultiplier = defenderTraitMod
      ? (M4_BASIS_POINTS_DIVISOR + defenderTraitMod.combatPowerMultiplierBp) / M4_BASIS_POINTS_DIVISOR
      : 1
    if (attackerMultiplier !== 1 || defenderMultiplier !== 1) {
      attackerPower *= attackerMultiplier
      defenderPower *= defenderMultiplier
      steps.push({ name: 'trait-multiplier', attackerMultiplier, defenderMultiplier })
    }
  }

  const tacticEffect = pickTactic(ctx)
  if (tacticEffect) {
    if (tacticEffect.attackMultiplier) {
      attackerPower *= tacticEffect.attackMultiplier
      steps.push({ name: 'tactic', attackerMultiplier: tacticEffect.attackMultiplier, defenderMultiplier: 1 })
    }
    if (tacticEffect.defenseMultiplier) {
      defenderPower *= tacticEffect.defenseMultiplier
      steps.push({ name: 'tactic', attackerMultiplier: 1, defenderMultiplier: tacticEffect.defenseMultiplier })
    }
  }

  const beforeVariance = attackerPower
  const varianceRng = { seed: ctx.date.yearBC * 1000 + ctx.date.month, counter: ctx.attackerArmy.manpower }
  const varianceResult = pickWithVariance(varianceRng, attackerPower, RNG_VARIANCE_PERCENT)
  attackerPower = varianceResult.result
  steps.push({
    name: 'variance',
    attackerMultiplier: beforeVariance === 0 ? 1 : varianceResult.result / beforeVariance,
    defenderMultiplier: 1,
  })

  const attackerWins = attackerPower > defenderPower
  const attackerLoss = attackerWins
    ? Math.floor(defenderManpower * 0.5)
    : Math.floor(ctx.attackerArmy.manpower * 0.3)
  const defenderLoss = attackerWins ? defenderManpower : 0

  const loserGeneral = attackerWins ? ctx.defenderGeneral : ctx.attackerGeneral
  const winnerGeneral = attackerWins ? ctx.attackerGeneral : ctx.defenderGeneral
  const deadGenerals: GeneralId[] = []

  if (loserGeneral && rolledDeath(ctx.date.yearBC, ctx.attackerArmy.manpower + 1, GENERAL_LOSER_DEATH_RATE)) {
    deadGenerals.push(loserGeneral.id)
  }
  if (winnerGeneral && rolledDeath(ctx.date.yearBC, ctx.attackerArmy.manpower + 2, GENERAL_WINNER_DEATH_RATE)) {
    deadGenerals.push(winnerGeneral.id)
  }

  return {
    winner: attackerWins ? 'attacker' : 'defender',
    attackerLoss,
    defenderLoss,
    deadGenerals,
    steps,
  }
}
