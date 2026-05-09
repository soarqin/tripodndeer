# M8.2 Decisions

## [2026-05-09] Architecture decisions from plan

### Wave execution order
- Wave 1 Group A (parallel): T1.1, T1.2, T1.3, T1.5, T1.6
- Wave 1 Group B (parallel, after Group A): T1.4, T1.7
- Wave 2 sequential: T2.1 → T2.5 (but T2.3 and T2.4 can be parallel)
- Wave 5 can run parallel with Wave 6

### DifficultyTier
- 5 literals: 'weak' | 'common' | 'hero' | 'hegemon' | 'sage'
- English literals (not Chinese)
- Default is 'hero'

### MemoryKey format
- Directional: `${observerRealmId}__${subjectRealmId}` (double underscore)
- NOT symmetric

### RulerPersonalityProfile
- 8 numeric dims [0,1]: expansionDrive, diplomaticTrust, caution, honor, vindictiveness, reformInclination, patience + preferredStrategy
- Add to character.ts, NOT a new file
- RulerState gets new `personalityDims: RulerPersonalityProfile` field (archetype stays)

### balance/m8_2.ts placement
- In `src/content/m2/balance/m8_2.ts` (single file, no subdirectory)
- Import DifficultyTier from ~/shared/types
- Import DiplomaticMemoryEventKind from ~/shared/types

### automation/ directory
- New directory: `src/engine/automation/`
- Files: sentinels.ts, auto-battle.ts, __tests__/

### T6.2 CLI behavior
- Default CLI stop condition is `unification` so the headless battle can end early when a single realm owns every site.
- JSON output serializes `finalRealmStats` as a plain object keyed by realm id to keep stdout parseable.

### Phase pipeline
- 25 → 27 phases (add diplomaticMemory + personalityDrift)
- Insert: historicalEvents → diplomaticMemory → personalityDrift → prestigeUpdate

### T1.5 schema shape
- Extend existing shared event types in place instead of introducing new event files.
- Keep `DiplomaticTreatyKind` on `truce`; do not introduce `peace`.

- Kept `WorldSchema` strict for M8.2 fields and left migration/default handling outside the schema, matching the existing no-default contract.

### SaveDTO V3 defaults
- SaveDTO version is bumped only from 2 to 3; supported load versions now include 1, 2, and 3.
- Missing V3 fields from V2 saves default to `difficulty: 'hero'`, empty `diplomaticMemory`, and archetype baseline `personalityDims`.

### Realm deactivation cleanup
- When a realm is deactivated, prune its diplomatic memory entries immediately in the same cleanup pass as wars, peace proposals, and sieges.

### T8.1 phase pipeline registration
- Added `PHASE_IMPLEMENTATIONS` for the two new phases so their imports are exercised from `src/engine/phases/index.ts` without changing runtime behavior.
- Updated the existing phase-chain test and added a dedicated membership test to lock the 27-phase contract.

## [2026-05-09] aiPersonality removal scope
- Production code no longer references `aiPersonality`; legacy compatibility branches were removed instead of retained.
- Invariant tests now scan non-test `src/**/*.ts` files directly so regressions fail fast.
