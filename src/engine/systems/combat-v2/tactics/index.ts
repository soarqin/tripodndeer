import type { TacticEffect } from '~/content/m2/balance'
import { TACTIC_EFFECTS } from '~/content/m2/balance'
import type { BattleContext } from '../combat-v2'

type TacticFn = (ctx: BattleContext) => TacticEffect | null

function defenderManpowerOf(ctx: BattleContext): number {
  return ctx.defenderArmies.reduce((sum, army) => sum + army.manpower, 0)
}

function qiZheng(ctx: BattleContext): TacticEffect | null {
  const defenderManpower = defenderManpowerOf(ctx)
  const ratio = ctx.attackerArmy.manpower / Math.max(1, defenderManpower)
  if (ratio < 0.8 || ratio > 1.2) return null
  return TACTIC_EFFECTS['qi-zheng']
}

function shengDong(ctx: BattleContext): TacticEffect | null {
  if (!ctx.attackerGeneral || ctx.battleType !== 'field') return null
  return TACTIC_EFFECTS['sheng-dong']
}

function youDi(ctx: BattleContext): TacticEffect | null {
  const defenderManpower = defenderManpowerOf(ctx)
  if (ctx.attackerArmy.manpower >= defenderManpower * 0.6) return null
  return TACTIC_EFFECTS['you-di']
}

function beiShui(ctx: BattleContext): TacticEffect | null {
  if (!ctx.attackerGeneral || ctx.attackerGeneral.might < 15) return null
  const defenderManpower = defenderManpowerOf(ctx)
  if (ctx.attackerArmy.manpower >= defenderManpower * 0.6) return null
  return TACTIC_EFFECTS['bei-shui']
}

function weiShi(ctx: BattleContext): TacticEffect | null {
  if (ctx.battleType !== 'siege-assault') return null
  return TACTIC_EFFECTS['wei-shi']
}

function yiZhan(ctx: BattleContext): TacticEffect | null {
  const defenderManpower = defenderManpowerOf(ctx)
  if (ctx.attackerArmy.manpower < defenderManpower * 1.5) return null
  return TACTIC_EFFECTS['yi-zhan']
}

function piDi(ctx: BattleContext): TacticEffect | null {
  if (ctx.battleType !== 'pass-assault') return null
  return TACTIC_EFFECTS['pi-di']
}

const TACTICS: readonly TacticFn[] = [beiShui, weiShi, qiZheng, youDi, piDi, shengDong, yiZhan]

export function pickTactic(ctx: BattleContext): TacticEffect | null {
  for (const tactic of TACTICS) {
    const effect = tactic(ctx)
    if (effect !== null) return effect
  }
  return null
}
