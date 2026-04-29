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
