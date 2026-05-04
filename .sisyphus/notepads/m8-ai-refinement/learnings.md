# M8 AI Refinement — Learnings

## [2026-05-04] Session Start

### Project Architecture
- Engine: `src/engine/` — pure functions, zero React
- Types: `src/shared/types.ts` — single source of truth
- Balance: `src/content/m2/balance.ts` — all numeric constants
- Tests: vitest + jsdom

### Key Types
- `PersonalityArchetype` = 'conqueror' | 'steward' | 'schemer' | 'learned' | 'tyrant' | 'incompetent' | 'benevolent' | 'builder'
- `Specialty` (not CharacterSpecialty) — 9 types
- `EdictKind` = 'edict_tax_relief' | 'edict_grain_reserve' (only 2!)

### Key Files
- `src/engine/systems/ai/utility-scorer.ts` — getPersonality, pickAction, scoreOption
- `src/engine/systems/ai/ai.ts` — planDiplomacyAction, planEspionageAction
- `src/engine/systems/diplomacy/diplomacy-core.ts` — scoreDiplomacyAcceptance
- `src/engine/systems/diplomacy/lifecycle.ts` — ACCEPTANCE_THRESHOLD = 0 (hardcoded)
- `src/engine/systems/diplomacy/coalitions.ts` — updateCoalitionMembership
- `src/engine/systems/recruitment/recruitment.ts` — pickSpecialty, recruitmentPhase
- `src/engine/systems/economy/economy-phase.ts` — economy phase (NOT economy.ts)
- `src/engine/systems/ai/faction-balancing.ts` — evaluateFactionBalanceAction
- `src/engine/systems/faction/faction-phase.ts` — factionPhase (evaluateFactionBalanceAction NOT wired!)
- `src/content/m2/balance.ts` — M5_PERSONALITY_WEIGHTS (L193-L201), M41_AI_PERSONALITY_REFORM_PROPENSITY (L262-L271), M7_ block (L355-L406)

### Critical Invariants
- AI iteration order: ID localeCompare sorted (MUST NOT change)
- No archetype-gated nextRng() calls (determinism)
- schema_version stays V7
- No new World fields
- No Opportunist/Zealot literals in code
- EdictKind only 2 kinds (edict_tax_relief | edict_grain_reserve)

### M8 Balance Notes
- Type-safe personality tables should use `Record<PersonalityArchetype, ...>` so archetype coverage stays exhaustive at compile time.
- `Specialty` and `EdictKind` come from `src/shared/types.ts`; reuse them instead of widening to string maps.

### Wave Execution Plan
- Wave 1 (parallel): T1, T2, T3, T4, T5, T6, T7
- Wave 2 (parallel, after Wave 1): T8, T9, T10, T11, T12, T13, T14
- Wave 3 (parallel, after Wave 2): T15, T16, T17, T18
- Final (parallel, after Wave 3): F1, F2, F3, F4

### 2026-05-05 Session Note
- `getPersonality()` fallback is now treated as `incompetent` for rulerless realms with no legacy AI personality.
- `planEspionageAction` should read personality through `getPersonality(world, realm.id)` so legacy and ruler-based paths stay aligned.
- Tests now cover rulerless fallback, legacy mappings, and ruler override behavior.

### Session Notes — 2026-05-05
- Added the M8 personality differentiation block at the end of `src/content/m2/balance.ts` and kept all tables exhaustively keyed by `PersonalityArchetype`.
- Verified `PersonalityArchetype`, `Specialty`, and `EdictKind` imports are type-safe; no `Record<string, ...>` was introduced for the new M8 constants.
