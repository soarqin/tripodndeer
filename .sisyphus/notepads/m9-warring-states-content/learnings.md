# M9 Warring States Content - Learnings

## [2026-05-05] Session Start
- Plan: 27 implementation tasks (T1-T27) + 4 Final Verification (F1-F4)
- No previous session notepad found - fresh start

## Architecture Patterns Found

### Key Files
- `src/content/m2/balance.ts` - All balance constants (M5/M6/M7/M8 prefix pattern)
- `src/shared/types.ts` - World interface and all shared types
- `src/shared/schemas.ts` - Zod schemas parallel to types.ts
- `src/engine/world/factory.ts` - World creation + phases array (lines 491-513)
- `src/engine/phases/index.ts` - PHASE_ORDER array (currently 21 elements)
- `src/engine/world/migrations/` - Migration chain files (v5→v6→v7, etc.)

### Existing Content
- Current schema_version: 5 in m1/scenario.json (migration chain handles v5→v8)
- Existing 41 generals: all -260 era (廉颇/蔺相如/白起 etc.)
- Current test count: 2174+ tests
- Current event chains: 10 (M5×3 + M6×3 + M7×4)
- Current name pool: 60 entries
- Current passes: 5

### Critical Conventions
- Balance constants: ALWAYS M9_ prefix, in `src/content/m2/balance.ts`
- Pure functions returning new Maps (never mutate)
- RNG: nextRng(state) → { value, nextState }
- Phase pipeline: 21 phases in PHASE_ORDER; M9 adds 2 (characterSpawn + realmDeactivation) = 23
- AI iteration: sorted by ID lexicographic order
- No JSDoc, no memoization, no console.log in prod

### Phase Ordering (after M9)
- characterSpawnPhase: AFTER characterLifecyclePhase, BEFORE recruitmentPhase
- realmDeactivationPhase: AT END (after prestigeUpdatePhase)
- Total phases: 21 → 23

### Year BC Semantics (CRITICAL)
- World.date.yearBC = positive number for BC (e.g., 453 = 453 BC)
- "Later in time" = smaller yearBC number (350 BC is later than 400 BC)
- Character spawn formula: world.date.yearBC <= template.birthYearBC - M9_ESTIMATED_AGE_AT_APPEARANCE
- "Dead" condition: world.date.yearBC >= template.deathYearBC (yearBC smaller = more recent)

### M9 Content Scope
- 12 realms: 8 playable (七雄+周) + 4 AI-only (越/宋/鲁/中山)
- 250 sites (exact, locked)
- 30-40 provinces
- 9 regions (九州 per 《禹贡》)
- 18-20 passes
- 90 character templates
- 26 new event chains (13 §5.3 + 1 合纵连横 + 12 atmosphere)
- 400 name pool entries

## [2026-05-05] T2: Schema v8 types — DONE

### What I added
- types.ts:
  - 5 new ID/string aliases: `ProvinceId`, `RegionId`, `CharId`, `LocaleString`, `RealmStatus`
  - `CharacterAttributes` interface (extracted from inline General.attrs)
  - `Province`, `Region`, `CharacterTemplate` interfaces
  - `realm.deactivate` Effect variant (added to Effect union)
  - `Realm.status?: RealmStatus` and `Realm.rulingHouse?: string` (both optional)
  - 4 World fields: `provinces`, `regions`, `characterTemplates`, `localization`
- schemas.ts:
  - `RealmStatusSchema`, `CharacterAttributesSchema` (alias of `GeneralAttrsSchema`)
  - `ProvinceIdSchema`, `RegionIdSchema`, `CharIdSchema`
  - `ProvinceSchema`, `RegionSchema`, `CharacterTemplateSchema`
  - `realm.deactivate` added to `EffectSchema` discriminatedUnion
  - `RealmSchema.status`, `RealmSchema.rulingHouse` (both `.optional()`)
  - 4 World fields added to `WorldSchema` as `z.instanceof(Map)` (matches existing M5/M6/M7 pattern)

### Test fixtures updated (5 files)
- `src/shared/__tests__/fixtures.ts` (makeEmptyWorld)
- `src/shared/__tests__/schemas.test.ts` (runtimeWorldShape)
- `src/engine/systems/diplomacy/__tests__/diplomacy-fixtures.ts`
- `src/engine/systems/diplomacy/__tests__/zhou-investiture.test.ts`
- `src/engine/world/factory.ts` (createInitialWorld + createWorldFromM1Data)

### Patterns observed
- `General.attrs` was inline anonymous object — extracted to `CharacterAttributes` interface so `CharacterTemplate.attributes` can reuse it
- `CharacterAttributesSchema = GeneralAttrsSchema` pattern keeps Zod aliases in sync without duplication
- `WorldSchema` uses `z.instanceof(Map)` for Map fields, matches M7 pattern (espionage)
- M9 chose NOT to add `birthYear`/`deathYear` to `General` — kept as separate `CharacterTemplate` per design constraint

### Pitfalls / gotchas
- Realm.status was made `optional` (not required) to avoid breaking existing fixtures; defaults handled at factory/runtime layer
- `Realm.rulingHouse` is optional string (used for 田齐 transition AR4 per task spec)
- Section divider comment `// ─── M9 Warring States Content: ───` matches existing M7 convention in the file

## [2026-05-05] T3: M9 balance scaffolding — DONE

### What I added
- Appended the full `M9_` constant block to `src/content/m2/balance.ts`
- Included 8 playable realms, 4 AI-only realms, and 7 forbidden anachronism strings
- Added evidence files under `.sisyphus/evidence/m9/` for the export count and forbidden string block

### Verification notes
- `pnpm typecheck` passed
- `grep -c "^export const M9_" src/content/m2/balance.ts` returned 21
- `.sisyphus` is gitignored, so evidence files required `git add -f`

## [2026-05-05] T6: Year-gate retrofit for event chains — DONE

### What I changed
- Added top-level `between` year gates to `zhou-investiture-chain.json` and `usurpation-chain.json`
- Extended `EventChain` / `EventChainSchema` to accept optional top-level year-gate metadata
- Added `checkEventChainYearGate(world, chain)` and wired it into historical event triggering

### Verification notes
- Year gate tests cover 403 BC / 344 BC thresholds plus the existing `lin_xiangru` date trigger regression
- Existing M5/M6 chain suites stayed green
- `pnpm typecheck` passed

### Gotcha
- JSON imports need explicit `as EventChain` / `as EventChainTrigger` casts in tests because Vitest/TS widens imported JSON literal fields

## [2026-05-05] T9: M9 invariants + AGENTS guardrails — DONE

### What I added
- `src/content/m2/__tests__/balance-m9.test.ts` with 15 invariant checks for M9 constants and M8 archetype regression
- Root `AGENTS.md` rows for M9 invariants, M9 subsystem reference, `M9+ Deferred Items`, and `world.characterTemplates` note

### Verification notes
- `pnpm test src/content/m2/__tests__/balance-m9.test.ts` passed (15 tests)
- `pnpm lint` passed
- `pnpm build` passed

### Gotcha
- The evidence artifact lives under `.sisyphus/`, so it must be added with `git add -f` because the directory is gitignored

## [2026-05-05] T7: i18n core infrastructure — DONE

### What I added
- Zero-dependency `src/shared/i18n.ts` with `loadLocale` validation and `t` interpolation/missing-key behavior
- Empty initial `src/content/locales/zh-CN.json`
- `scripts/gen-locale-types.ts` and `pnpm gen:locale-types`, generating `src/shared/locale-keys.ts`
- `src/shared/__tests__/i18n.test.ts` covering known keys, missing keys, params, invalid input, and map output

### Verification notes
- `pnpm gen:locale-types` generated `LocaleKey = never` for the empty locale file
- `pnpm test src/shared/__tests__/i18n.test.ts` passed (5 tests)
- `pnpm test src/__tests__/banned-deps.test.ts` passed, confirming no i18next/react-i18next dependency
- `pnpm typecheck` passed

## [2026-05-05] T5: Realm deactivation phase — DONE

### What I added
- `realmDeactivationPhase` lives under `src/engine/wars/realm-deactivation.ts` and only marks realms `status: 'deactivated'`; it does not delete realm records or ownership.
- The shared `deactivateRealm` helper is also used by the `realm.deactivate` event effect handler so conquest and scripted deactivation share cleanup.
- Cleanup covers generals loyalty=0, wars by canonical war key participants, peace proposals by `proposingRealmId`/`targetRealmId`, and sieges by attacker army realm or defender site owner.

### Verification notes
- Targeted realm-deactivation suite passed (6 tests), with evidence captured under `.sisyphus/evidence/m9/task-5-deactivate-conquest.txt`.
- Full `pnpm test`, `pnpm typecheck`, and `pnpm build` passed after updating phase-order assertions for the current M9 23-phase pipeline.
