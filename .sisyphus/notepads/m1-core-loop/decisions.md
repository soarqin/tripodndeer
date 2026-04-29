# M1 Core Loop - Architectural Decisions

## Q1: Combat Model
- Defender +30% bonus, larger manpower wins
- Formula: defenderEffective = ceil(defender * 1.3)
- If attacker > defenderEffective → attacker wins
- AttackerLoss = floor(defender * 0.5)
- DefenderLoss = all defender manpower
- On defender win: attackerLoss = floor(attacker * 0.3)

## Q2: March Model
- Based on `MapEdge.travel_cost`
- ticks = travel_cost (M1 speed factor = 1)

## Q3: War Model
- Right-click menu one-button declare war
- World maintains `wars: ReadonlyMap<WarKey, true>`
- warKey() = sorted pair join with ':'

## Q4: Manpower Source
- Fully hardcoded + combat attrition, no reinforcement

## Q5: Map Source
- Algorithmic generation + historical site labels

## Q6: AI Rhythm
- Every 3 ticks (every month), roll dice

## Q7: Testing
- TDD throughout, all tasks with agent QA

## Q8: Player Identity
- Hardcoded = Qin (秦, realm_qin)

## Q9: Combat Duration
- Instantaneous single-tick resolution

## Q10: Data Model
- LSP upgrade Faction → Realm

## Q11: Starting Armies
- Each realm gets 2 armies

## 2026-04-29 T1.1 Realm Expansion
- `Realm` replaces `Faction` as the primary world ownership type, and the committed M0 JSON now stores `realms` rather than `factions`.
- `ArmyTemplate` is kept as a minimal placeholder shape for future army spawning without adding behavior yet.

## Q12: Retreat Behavior
- Return to origin site (3 ticks)

## Q13: Victory Condition
- Player exclusively owns all sites

## Phase Order (STRICT, must not be changed)
1. aiPlan
2. orderApply
3. march
4. combat
5. victoryCheck
## T1.2 schema choices
- Kept `WarKey` as a plain string alias with a minimal non-empty schema, matching the project’s string-opaque pattern.
- Left `src/shared/index.ts` as star-exports because it already exposes all new shared types/schemas through the existing barrel.

## 2026-04-29 T1.4 phase chain constants
- Phase name/order constants live in src/engine/phases/index.ts as static data only; no phase logic belongs there yet.
- createInitialWorld() now initializes with an empty phases array until the real phase chain is wired in later.

## 2026-04-29 T1.7 wars module
- `wars` lives in the engine layer, not shared, because it is runtime game state rather than a generic primitive.
- Added `~/*` path alias support alongside the existing `@/*` mapping so the new engine module can use the documented import style and still typecheck.

## 2026-04-29 T1.3 schema + world factory
- Kept `M0DataSchema` and `M1DataSchema` distinct instead of trying to unify the scenario JSON shapes.
- `createInitialWorld()` now returns the expanded `World` shape with empty runtime collections so legacy tests keep working.
- `createWorldFromM1Data()` uses fixed opening date `260 BC / spring / 1 / shang` and empty initial wars, matching the committed M1 scenario format.


## 2026-04-29 Victory system

- Implemented victory as a standalone engine system under `src/engine/systems/victory/` with re-exports from `index.ts`.
- Emit only `victoryAchieved` events when every site is owned by the player realm.
