import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import { setCombatVarianceEnabled } from '~/engine/random'
import { resolveCombat } from '~/engine/systems/combat-v2'
import type { BattleContext } from '~/engine/systems/combat-v2'

const makeArmy = (
  manpower: number,
  comp?: { infantry: number; chariot: number; cavalry: number; crossbow: number },
) => ({
  id: 'army_test',
  realmId: 'realm_qin',
  manpower,
  location: 'site_001',
  state: 'idle' as const,
  destination: null,
  ticksRemaining: 0,
  source: null,
  generalId: undefined,
  composition: comp,
})

const gameDate = { yearBC: 260, season: 'spring' as const, month: 1 as const, xun: 'shang' as const }

const ctx = (
  attacker: ReturnType<typeof makeArmy>,
  defenderManpower: number,
  aComp: any,
  dComp: any,
): BattleContext => ({
  attackerArmy: attacker,
  defenderArmies: [makeArmy(defenderManpower, dComp)],
  attackerGeneral: null,
  defenderGeneral: null,
  terrain: 'plains',
  battleType: 'field',
  passDefenseBonus: 0,
  siegeBonus: 0,
  attackerComposition: aComp,
  defenderComposition: dComp,
  date: gameDate,
})

describe('unit type counter matrix', () => {
  beforeEach(() => setCombatVarianceEnabled(false))
  afterEach(() => setCombatVarianceEnabled(false))

  it('crossbow beats chariot (asymmetric counter)', () => {
    const crossbowCtx = ctx(
      makeArmy(1000),
      1000,
      { infantry: 0, chariot: 0, cavalry: 0, crossbow: 1000 },
      { infantry: 0, chariot: 1000, cavalry: 0, crossbow: 0 },
    )
    const result = resolveCombat(crossbowCtx)
    expect(result.winner).toBe('attacker')
  })

  it('chariot vs crossbow: chariot is disadvantaged', () => {
    const chariotCtx = ctx(
      makeArmy(1000),
      1000,
      { infantry: 0, chariot: 1000, cavalry: 0, crossbow: 0 },
      { infantry: 0, chariot: 0, cavalry: 0, crossbow: 1000 },
    )
    const result = resolveCombat(chariotCtx)
    expect(result.winner).toBe('defender')
  })
})
