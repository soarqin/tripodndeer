## Wave 0 Baseline Metrics — refactor-cleanup

BASELINE_SHA=8b2ec2e10fb867f19cb8f346eaab0da7548ac1e4
LOC: 55316
Files: 396
Tests: 227
ASSERTIONS: 4026
build_size_bytes: 526487
typecheck_time_seconds: 18.553
god_file_types_ts_loc: 963
god_file_schemas_ts_loc: 920
god_file_balance_ts_loc: 778
god_file_ai_ts_loc: 701
god_file_game_store_ts_loc: 743
makeEmptyWorld_usage: 56
LEGACY_WINNER: attacker

## Phase Pipeline (from factory.ts line 503)

```
phases: [
  aiPlanStep,
  orderApplyStep,
  marchStep,
  siegeStep,
  combatV2Step,
  culturalIdentityPhase,
  manpowerTick,
  espionagePhase,
  rulerLifecyclePhase,
  characterLifecyclePhase,
  characterSpawnPhase,
  recruitmentPhase,
  ideologyDriftPhase,
  reformPhase,
  victoryCheckStep,
  diplomacyLifecycleStep,
  economyPhase,
  disasterPhase,
  tradePhase,
  factionPhase,
  historicalEventsPhase,
  prestigeUpdatePhase,
  realmDeactivationPhase,
]
```

## God Files LOC (at baseline)

- src/shared/types.ts: 963
- src/shared/schemas.ts: 920
- src/content/m2/balance.ts: 778
- src/engine/systems/ai/ai.ts: 701
- src/ui/store/game-store.ts: 743
- Total: 4105

## Pre-existing test failures (known before refactor)

The following tests are FAILING at baseline (pre-refactor). These are NOT caused by
refactor work. Barrel re-exports CANNOT change behavior. These tests will fail
identically post-refactor. The refactor's "0 behavior changes" contract is maintained.

### Behavior tests (m8-behavior.test.ts)
Marginal archetype behavior ratio tests affected by M9 content changes:

1. `schemer uses at least as much aggressive espionage as steward`
   - schemer.aggressiveEspionage=89, steward.aggressiveEspionage=90
   - Off by 1 (89 vs 90)

2. `tyrant attacks at least as much as steward`
   - tyrant.attack=65, steward.attack=72, ratio=0.9027
   - Requires ratio >= 0.95, got 0.9027

### E2E tests (control.spec.ts)
1. `pause freezes the tick counter` — 30s timeout
   - The test tries to pause the game and verify tick counter stays constant
   - Times out after 30s (Playwright default test timeout)

## Notes

- boulder.json archived to `.sisyphus/run-continuation/m9-final-20260505.json`
- All other tests (typecheck, lint, unit, perf, e2e) are PASSING at baseline
- Refactor proceeds with documented pre-existing behavior test failures
