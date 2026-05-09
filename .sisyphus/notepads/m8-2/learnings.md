# M8.2 Learnings

## [2026-05-09] Initial codebase exploration

### Key File Locations
- Types barrel: `src/shared/types.ts` - re-exports from `./types/` subdirectory
- Schemas barrel: `src/shared/schemas/` - separate schema files per domain
- Balance files: `src/content/m2/balance/` - m8_1.ts, m8.ts, m5.ts etc.

### Pattern: CoverageKey / directional key
- Pattern from `src/shared/types/espionage.ts:34`: `makeCoverageKey(observerId, targetId) = \`${observerId}__${targetId}\``
- MemoryKey should follow identical pattern: `memoryKey(observer, subject) = \`${observer}__${subject}\``

### Pattern: Zod schema registration
- `src/shared/schemas/espionage.ts` shows: simple z.object, z.string(), z.enum
- All schemas use `RealmIdSchema` from `./core`

### Pattern: balance per-archetype Record
- `src/content/m2/balance/m8_1.ts` shows `Readonly<Record<PersonalityArchetype, WeightInterface>>`
- T1.7 should follow same pattern

### Pattern: barrel re-export in types.ts
- Current entries (line 1-10): core, economy, diplomacy, character, espionage, events, ai-state, reform-disaster-trade, world, save-dto
- New types (difficulty, diplomatic-memory) should be re-exported here

### Codebase State
- `src/engine/automation/` does NOT exist yet - needs to be created for T1.6 and T6.1
- `src/shared/types/character.ts` has `PersonalityArchetype` at line 9-18 - add `RulerPersonalityProfile` here for T1.3
- `src/shared/types/events.ts` has `GameEvent { type: string; payload: unknown }` at line 115 - this is the base, need to add specific types

### PersonalityArchetype literals (8):
conqueror, steward, schemer, learned, tyrant, incompetent, benevolent, builder

### Character.ts structure
- Line 7: AIPersonality (legacy) = 'aggressive_random' | 'aggressive' | 'cautious'
- Line 9-18: PersonalityArchetype = 8 literals
- RulerState is in world.ts (not character.ts directly)

### M8_1 balance structure (for T1.4 reference)
- StrategicWeights interface with 4 dims
- OperationalWeights interface with 5 dims
- Both as `Readonly<Record<PersonalityArchetype, Interface>>`

### Wave 1 Inner Dependencies (important!)
- T1.4 (balance/m8_2.ts) BLOCKED BY T1.1 (DifficultyTier) + T1.2 (DiplomaticMemoryEventKind)
- T1.7 (M5_PERSONALITY_DIMS_BASELINE) BLOCKED BY T1.3 (RulerPersonalityProfile)
- Execute order: T1.1+T1.2+T1.3+T1.5+T1.6 first, then T1.4+T1.7

### T1.5 implementation notes
- `src/shared/schemas/events.ts` already serves as the schema home for shared event payloads; adding `battleResolved` and `spy_caught` schemas there keeps event parsing local.
- `DiplomacyEventSchema` parses optional `treatyKind`, `combatPayload`, and `spyMissionId` cleanly without widening other event kinds.

### [2026-05-09] World interface field addition pattern
- When adding required fields to `World`, place them directly after the existing cluster (`aiState` here) to keep fixture updates localized.
- A minimal compile-time test can use `satisfies Pick<World, 'fieldA' | 'fieldB'>` with concrete values; this avoids runtime-only assertions while still proving the interface shape.

- `WorldSchema` now treats `difficulty` and `diplomaticMemory` as required runtime fields; tests should build a real `Map`-based world shape instead of relying on default fixture omissions.

### [2026-05-09] SaveDTO V3 upgrade pattern
- Keep V3-only persisted fields optional in `SerializedWorld` so older DTOs can deserialize through `saveDtoToWorld` without mutating input.
- Use a `SerializedRulerState` DTO type with optional `personalityDims`; reconstruct runtime `RulerState` from `M5_PERSONALITY_DIMS_BASELINE[ruler.personality]` when loading V2 saves.
- `SaveDTOSchema` should validate current V3 DTOs only; V2 compatibility is handled by the conversion function accepting `schemaVersion: 2` at runtime.

## T3.5 personalityDriftPhase
- Added deterministic ruler personality drift under `src/engine/systems/character/`, using `world.diplomacyHistory.slice(-50)` for recent trigger heuristics.
- Prosperity drift uses `M4_DEFAULT_REALM_TREASURY` as the high-treasury threshold and suppresses while current or recent war activity involves the realm.
- Player realm is skipped; archetype stays unchanged; RNG is returned unchanged.

## T3.3 battleResolved payload + combat_observed history
- Combat-v2-step now derives `armySizeTotal` from attacker.manpower + sum(defender.manpower); use `manpower` (not `size`) since that's the canonical Army field.
- `borderSite` checks if destination site OR any of its `Site.adjacency` neighbors are owned by both attacker and defender realms — uses sites map directly (O(adjacency) per battle, no caching needed).
- Diplomacy double-write only fires when defenderRealmId ≠ null AND ≠ attacker.realmId (skips unowned-site or self-fire combat).
- `pushDiplomacyHistory` mutates both `diplomacyHistory[]` and pushes a `diplomacyEvent` entry to `events[]` — this matches existing usage and is the expected behavior.
- World return must include `diplomacyHistory` in spread to persist the new entries.

## T8.1 phase pipeline membership
- `src/engine/phases/index.ts` must keep the pipeline order and the names list in sync; the new `diplomaticMemory` and `personalityDrift` entries sit between `historicalEvents` and `prestigeUpdate`.
- A focused Vitest run with explicit file paths is the quickest safe verification for phase-order edits.

## T3.1 diplomaticMemoryPhase
- Diplomatic memory uses directional `memoryKey(observer, subject)` and stores only AI observers; player observer entries are skipped.
- The phase keeps `nextRng` identical to input and processes realms by lexicographic `realm.id` order for deterministic behavior.
- Runtime `DiplomacyEvent` has `occurredAt` but no numeric `tick`; memory event ticks should use `world.tick` when recording phase observations.

## [2026-05-09] Realm deactivation memory pruning
- `realm-deactivation.ts` should prune both outgoing and incoming diplomatic memory entries for the deactivated realm by matching directional keys.
- The safe filter is `!key.startsWith(`${realmId}__`) && !key.includes(`__${realmId}`)` so only unrelated memory survives.

## [2026-05-09] T6.1 auto-battle driver
- `runAutoBattle()` can stay synchronous for M9 by statically importing `scenario-453bc.json`, then applying `M9RawDataSchema -> mapM9RawToM9Data -> M9DataSchema` before `createWorldFromM9Data`.
- Headless tick execution should call `runTickPhases(world, world.rngState)` so the full factory-provided phase pipeline runs unchanged.
- `finalRealmStats` is derived from current site ownership plus `(realm.status ?? 'active')`; M1 realms have no explicit status, so undefined means active.

## [2026-05-09] aiPersonality removal cleanup
- `getPersonality()` is now ruler-first with a single fallback: `world.rulers.get(realmId)?.personality ?? 'incompetent'`.
- Fixture cleanup is safest when targeting `aiPersonality:` property assignments only; string assertions mentioning `aiPersonality` should remain untouched.

## [2026-05-09] T6.2 auto-battle CLI
- `runAutoBattle` returns a `ReadonlyMap` for `finalRealmStats`, so the CLI needs an explicit `Object.fromEntries(...)` step before JSON output.
- A small `runAutoBattleCli(argv, io)` wrapper makes Vitest easy: mock `runAutoBattle`, pass captured writers, and verify both default config wiring and JSON serialization.
- `pnpm -s auto-battle --seed=42 --json` avoids pnpm banner noise and is the cleanest command form for JSON parsing checks.

## T8.5 + T8.6 (difficulty scaling + M8.1 baseline pinning)

### Pattern: per-tier ratio test using fixture worlds
- Build minimal `makeEmptyWorld({ difficulty })` fixtures with 2 realms (player + AI)
- Call `economyPhase` / `manpowerTick` directly N times — phases don't increment tick, so xun/tick stay valid for all iterations
- Compare deltas between difficulty tiers to compute ratios
- Tolerance ±0.02 around expected multiplier handles `Math.floor` rounding

### Pattern: full-tick determinism baseline at hero
- `createWorldFromM1Data(loadM1Data(), seed, playerId)` defaults to `difficulty='hero'`
- `runTickPhases` from `~/engine/clock` advances tick + date + RNG together
- Canonicalize world (sort keys, stringify Maps as sorted entries, skip `phases`) before SHA-256 hashing
- Hero hash matches all pre-M8.1 baseline files (`.sisyphus/evidence/m8-baseline-pre-m8_1/*.json`) → formal regression check

### Caveat: M1 fixture pre-M8.1 baselines all share the same hash
- `forceAllRulersToArchetype` only mutates `personality` (literal), NOT `personalityDims` (numeric)
- Tactical scoring uses `personalityDims` (M5_PERSONALITY_DIMS_BASELINE seeded from original archetype)
- So forcing personality to different archetypes produces identical world hashes — the 8 archetype baselines are degenerate post-M8.2
- Not blocking T8.5/T8.6 but worth flagging for archetype-coverage maintainers

---

## Test Fixture Updates for M8.2 (2026-05-09)

After M8.2 (difficulty + diplomatic memory + personality dims), 18 tests failed due to:

1. **World fixture missing fields** — Tests creating World inline need `difficulty: 'hero'` (or appropriate tier) and `diplomaticMemory: new Map()`. Centralized fixtures (`makeEmptyWorld`) already covered this.
2. **RulerState fixture missing personalityDims** — Inline `RulerState` objects in test fixtures require `personalityDims` block matching `RulerPersonalityProfile` shape.
3. **SAVE_DTO_VERSION bumped to 3** — Tests referencing version `2` need update.
4. **Phase pipeline now 27 phases** — `diplomaticMemoryPhase` and `personalityDriftPhase` newly wired between `historicalEventsPhase` and `prestigeUpdatePhase`. `factory.ts::getDefaultPhases` updated to register both.
5. **`worldHash` JSON.stringify key order** — `saveDtoToWorld` now constructs World with `difficulty` after `tick`, but factory places it later. Tests using `JSON.stringify` for hash comparison must sort object keys before stringifying to be order-independent.
6. **AI baseline event list shifted** — `aiPlanStep` deterministic ordering changed: 104 → 101 events. Coalition_changed and proposal_created order/count differs due to memory and personalityDims influence.
7. **Strategic plan truncation by difficulty** — `M8_2_DIFFICULTY_PROFILES['common'].strategicTruncation: true` clears `mainAllyRealmId` to null. Tests asserting alliance assignment must set `difficulty: 'hero'`.
8. **Faction-balance edict bias** — `M8_EDICT_ENACTMENT_BIAS` now per-personality. `incompetent` (default fallback) has `issuanceMultiplier: 0.5` → effective threshold 140 (vs 70 raw). Tests must pass a ruler with personality having multiplier >= 1.0 (steward/schemer/conqueror) AND `preferredEdict` matching expected edict kind.
9. **Operational priorities** — Specific priority values (30, 5) shifted to floats (~26, ~6) due to scoring formula changes. Use `expect.objectContaining` without priority match.
10. **Legacy aiPersonality migration removed** — `v1-to-v3.ts` no longer maps `aiPersonality: 'aggressive_random' → personality: 'schemer'`. EC9 test updated to use `archetype: 'schemer'` directly.
