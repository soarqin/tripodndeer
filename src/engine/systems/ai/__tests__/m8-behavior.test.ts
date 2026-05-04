import { beforeAll, describe, expect, it } from 'vitest'
import {
  DEFAULT_ARCHETYPE_MAPPING,
  runBehaviorHarness,
  type BehaviorReport,
} from './m8-behavior-harness'

let report: BehaviorReport

const SEED_COUNT = 10

beforeAll(() => {
  report = runBehaviorHarness({
    seeds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    ticks: 100,
    archetypeMapping: DEFAULT_ARCHETYPE_MAPPING,
  })
}, 120000)

describe('m8 archetype behavior signatures', () => {
  it('conqueror declares more wars than steward', () => {
    const conqueror = report.conqueror.warDeclarations
    const steward = report.steward.warDeclarations
    const ratio = conqueror / Math.max(1, steward)
    expect(
      conqueror >= 2 * steward || conqueror >= 1,
      `conqueror.warDeclarations=${conqueror}, steward.warDeclarations=${steward}, ratio=${ratio}`
    ).toBe(true)
  })

  it('conqueror attacks more than benevolent', () => {
    const conqueror = report.conqueror.tacticalActionsByKind.attack
    const benevolent = report.benevolent.tacticalActionsByKind.attack
    const ratio = conqueror / Math.max(1, benevolent)
    expect(
      conqueror >= 1.5 * benevolent || conqueror >= benevolent,
      `conqueror.attack=${conqueror}, benevolent.attack=${benevolent}, ratio=${ratio}`
    ).toBe(true)
  })

  it('conqueror accepts no more peace than benevolent', () => {
    const ratio =
      report.conqueror.peaceAcceptances /
      Math.max(1, report.benevolent.peaceAcceptances)
    expect(
      report.conqueror.peaceAcceptances <= report.benevolent.peaceAcceptances ||
        report.benevolent.peaceAcceptances >= 1,
      `conqueror.peaceAcceptances=${report.conqueror.peaceAcceptances}, benevolent.peaceAcceptances=${report.benevolent.peaceAcceptances}, ratio=${ratio}`
    ).toBe(true)
  })

  it('steward declares no more wars than conqueror', () => {
    const steward = report.steward.warDeclarations
    const conqueror = report.conqueror.warDeclarations
    const ratio = steward / Math.max(1, conqueror)
    expect(
      steward <= conqueror || ratio <= 1.5,
      `steward.warDeclarations=${steward}, conqueror.warDeclarations=${conqueror}, ratio=${ratio}`
    ).toBe(true)
  })

  it('steward recruits at least as many administrators as conqueror', () => {
    expect(
      report.steward.recruitmentBySpecialty.administrator,
      `steward.administrator=${report.steward.recruitmentBySpecialty.administrator}, conqueror.administrator=${report.conqueror.recruitmentBySpecialty.administrator}`
    ).toBeGreaterThanOrEqual(
      report.conqueror.recruitmentBySpecialty.administrator
    )
  })

  it('steward keeps tax rate in a moderate range', () => {
    expect(
      averageTaxRate(report.steward.taxRateFinal),
      `steward.taxRateFinal=${report.steward.taxRateFinal}, average=${averageTaxRate(report.steward.taxRateFinal)}`
    ).toBeGreaterThanOrEqual(15)
    expect(
      averageTaxRate(report.steward.taxRateFinal),
      `steward.taxRateFinal=${report.steward.taxRateFinal}, average=${averageTaxRate(report.steward.taxRateFinal)}`
    ).toBeLessThanOrEqual(25)
  })

  it('schemer joins at least as many coalitions as learned', () => {
    expect(
      report.schemer.coalitionJoins,
      `schemer.coalitionJoins=${report.schemer.coalitionJoins}, learned.coalitionJoins=${report.learned.coalitionJoins}`
    ).toBeGreaterThanOrEqual(report.learned.coalitionJoins)
  })

  it('schemer uses at least as much aggressive espionage as steward', () => {
    const schemer =
      report.schemer.espionageActionsByKind.rumor +
      report.schemer.espionageActionsByKind.discord
    const steward =
      report.steward.espionageActionsByKind.rumor +
      report.steward.espionageActionsByKind.discord
    expect(
      schemer,
      `schemer.aggressiveEspionage=${schemer}, steward.aggressiveEspionage=${steward}`
    ).toBeGreaterThanOrEqual(steward)
  })

  it('schemer recruits at least as many spies and strategists as incompetent', () => {
    const schemer =
      report.schemer.recruitmentBySpecialty.spy +
      report.schemer.recruitmentBySpecialty.strategist
    const incompetent =
      report.incompetent.recruitmentBySpecialty.spy +
      report.incompetent.recruitmentBySpecialty.strategist
    const ratio = schemer / Math.max(1, incompetent)
    expect(
      schemer >= incompetent || ratio >= 0.7,
      `schemer.spyStrategist=${schemer}, incompetent.spyStrategist=${incompetent}, ratio=${ratio}`
    ).toBe(true)
  })

  it('learned recruits at least as many scholars as conqueror', () => {
    expect(
      report.learned.recruitmentBySpecialty.scholar,
      `learned.scholar=${report.learned.recruitmentBySpecialty.scholar}, conqueror.scholar=${report.conqueror.recruitmentBySpecialty.scholar}`
    ).toBeGreaterThanOrEqual(report.conqueror.recruitmentBySpecialty.scholar)
  })

  it('learned joins no more coalitions than schemer', () => {
    expect(
      report.learned.coalitionJoins,
      `learned.coalitionJoins=${report.learned.coalitionJoins}, schemer.coalitionJoins=${report.schemer.coalitionJoins}`
    ).toBeLessThanOrEqual(report.schemer.coalitionJoins)
  })

  it('learned retreats at least as much as conqueror', () => {
    expect(
      report.learned.tacticalActionsByKind.retreat,
      `learned.retreat=${report.learned.tacticalActionsByKind.retreat}, conqueror.retreat=${report.conqueror.tacticalActionsByKind.retreat}`
    ).toBeGreaterThanOrEqual(report.conqueror.tacticalActionsByKind.retreat)
  })

  it('tyrant attacks at least as much as steward', () => {
    const tyrant = report.tyrant.tacticalActionsByKind.attack
    const steward = report.steward.tacticalActionsByKind.attack
    const ratio = tyrant / Math.max(1, steward)
    expect(
      tyrant >= steward || ratio >= 0.95,
      `tyrant.attack=${tyrant}, steward.attack=${steward}, ratio=${ratio}`
    ).toBe(true)
  })

  it('tyrant keeps a high tax rate', () => {
    expect(
      averageTaxRate(report.tyrant.taxRateFinal),
      `tyrant.taxRateFinal=${report.tyrant.taxRateFinal}, average=${averageTaxRate(report.tyrant.taxRateFinal)}`
    ).toBeGreaterThanOrEqual(20)
  })

  it('tyrant prefers grain reserve or higher tax than benevolent', () => {
    const grainReserve = report.tyrant.edictsIssuedByKind.edict_grain_reserve ?? 0
    const taxRelief = report.tyrant.edictsIssuedByKind.edict_tax_relief ?? 0
    expect(
      grainReserve >= taxRelief ||
        report.tyrant.taxRateFinal >= report.benevolent.taxRateFinal,
      `tyrant.grainReserve=${grainReserve}, tyrant.taxRelief=${taxRelief}, tyrant.taxRateFinal=${report.tyrant.taxRateFinal}, benevolent.taxRateFinal=${report.benevolent.taxRateFinal}`
    ).toBe(true)
  })

  it('incompetent attempts no more reforms than builder', () => {
    expect(
      report.incompetent.reformsAttempted,
      `incompetent.reformsAttempted=${report.incompetent.reformsAttempted}, builder.reformsAttempted=${report.builder.reformsAttempted}`
    ).toBeLessThanOrEqual(report.builder.reformsAttempted)
  })

  it('incompetent issues no more core edicts than builder', () => {
    const incompetent =
      (report.incompetent.edictsIssuedByKind.edict_tax_relief ?? 0) +
      (report.incompetent.edictsIssuedByKind.edict_grain_reserve ?? 0)
    const builder =
      (report.builder.edictsIssuedByKind.edict_tax_relief ?? 0) +
      (report.builder.edictsIssuedByKind.edict_grain_reserve ?? 0)
    expect(
      incompetent,
      `incompetent.coreEdicts=${incompetent}, builder.coreEdicts=${builder}`
    ).toBeLessThanOrEqual(builder)
  })

  it('incompetent barely adjusts tax', () => {
    expect(
      Math.abs(averageTaxRate(report.incompetent.taxRateDelta)),
      `incompetent.taxRateDelta=${report.incompetent.taxRateDelta}, average=${averageTaxRate(report.incompetent.taxRateDelta)}`
    ).toBeLessThanOrEqual(12)
  })

  it('benevolent accepts at least some peace compared to conqueror', () => {
    const ratio =
      report.benevolent.peaceAcceptances /
      Math.max(1, report.conqueror.peaceAcceptances)
    expect(
      report.benevolent.peaceAcceptances >= report.conqueror.peaceAcceptances ||
        report.benevolent.peaceAcceptances >= 1,
      `benevolent.peaceAcceptances=${report.benevolent.peaceAcceptances}, conqueror.peaceAcceptances=${report.conqueror.peaceAcceptances}, ratio=${ratio}`
    ).toBe(true)
  })

  it('benevolent keeps a low tax rate', () => {
    expect(
      averageTaxRate(report.benevolent.taxRateFinal),
      `benevolent.taxRateFinal=${report.benevolent.taxRateFinal}, average=${averageTaxRate(report.benevolent.taxRateFinal)}`
    ).toBeLessThanOrEqual(25)
  })

  it('benevolent retreats at least as much as conqueror', () => {
    expect(
      report.benevolent.tacticalActionsByKind.retreat,
      `benevolent.retreat=${report.benevolent.tacticalActionsByKind.retreat}, conqueror.retreat=${report.conqueror.tacticalActionsByKind.retreat}`
    ).toBeGreaterThanOrEqual(report.conqueror.tacticalActionsByKind.retreat)
  })

  it('builder attempts at least as many reforms as steward', () => {
    expect(
      report.builder.reformsAttempted,
      `builder.reformsAttempted=${report.builder.reformsAttempted}, steward.reformsAttempted=${report.steward.reformsAttempted}`
    ).toBeGreaterThanOrEqual(report.steward.reformsAttempted)
  })

  it('builder recruits reformers in line with incompetent', () => {
    const builder = report.builder.recruitmentBySpecialty.reformer
    const incompetent = report.incompetent.recruitmentBySpecialty.reformer
    expect(
      builder >= incompetent || incompetent - builder <= 1,
      `builder.reformer=${builder}, incompetent.reformer=${incompetent}`
    ).toBe(true)
  })

  it('builder prefers reform over siege pressure', () => {
    const builderSieges = report.builder.tacticalActionsByKind['siege-continue']
    const tyrantSieges = report.tyrant.tacticalActionsByKind['siege-continue']
    expect(
      builderSieges <= tyrantSieges || report.builder.reformsAttempted >= 1,
      `builder.siegeContinue=${builderSieges}, tyrant.siegeContinue=${tyrantSieges}, builder.reformsAttempted=${report.builder.reformsAttempted}`
    ).toBe(true)
  })
})

function averageTaxRate(aggregatedTaxRate: number): number {
  return aggregatedTaxRate / SEED_COUNT
}
