## [Wave 0 - 2026-05-05] Task: T0.1 Baseline Capture

### Baseline Metrics
- BASELINE_SHA: 8b2ec2e10fb867f19cb8f346eaab0da7548ac1e4
- LOC: 55316, Files: 396, Tests: 227, ASSERTIONS: 4026
- makeEmptyWorld_usage: 56 files (target: ≥90 post-W8)
- God files: types=963, schemas=920, balance=778, ai=701, game-store=743

### Pre-existing behavior test failures (KNOWN, NOT CAUSED BY REFACTOR)
- `m8-behavior.test.ts` has 2 failing tests about archetype behavior ratios
- These were caused by M9 content changes (250 sites, 90 char templates, event chains)
- Barrel re-exports CANNOT change behavior → these tests will fail identically after refactor
- Decision: Document failures, proceed. All other tests (typecheck, lint, unit, perf, e2e) GREEN.

### Key architectural notes
- `src/engine/systems/combat-v2/__tests__/combat-v2.test.ts` line 96-100 uses `resolveLegacyCombat` from `../../combat/combat`
- `legacy.winner` = 'attacker' (attacker=1000 vs defender=500)
- `architecture-purity.test.ts` lines 96, 105 HARDCODE `engine/systems/ai/ai.ts` path — ai.ts MUST be kept!
- All 91 balance.ts importers must have git diff = 0 after W3 (barrel pattern)
- All 203 types.ts importers must have git diff = 0 after W4 (barrel pattern)
- All 42 schemas.ts importers must have git diff = 0 after W5 (barrel pattern)

### Phase pipeline (factory.ts line 503)
aiPlanStep → orderApplyStep → marchStep → siegeStep → combatV2Step →
culturalIdentityPhase → manpowerTick → espionagePhase → rulerLifecyclePhase →
characterLifecyclePhase → characterSpawnPhase → recruitmentPhase →
ideologyDriftPhase → reformPhase → victoryCheckStep → diplomacyLifecycleStep →
economyPhase → disasterPhase → tradePhase → factionPhase →
historicalEventsPhase → prestigeUpdatePhase → realmDeactivationPhase

### Key conventions for barrel files
- Use `export * from './submodule'` pattern (NOT named re-exports)
- All cross-sub-module type references use `import type`
- Sub-module files stay in same directory as the god-file (e.g., balance/ subdirectory next to balance.ts)
- Do NOT rename any exports

## [Wave 0 - 2026-05-08] Task: T1.2 AiPhaseState rename

### Learnings
- Mechanical type renames in AI internals should update the backing file path and all helper names together to avoid stale import paths.
- `grep -rE "AiPhaseState|phase-state" src/` was clean after renaming to `AiTickContext` / `tick-context`.
- `pnpm typecheck` and `pnpm test src/engine/systems/ai/` both passed without behavior changes.
