# M1 Core Loop - Learnings

## Project Conventions

### ID Types
- All ID types are plain `string` aliases (e.g. `export type SiteId = string`)
- NOT opaque/branded types
- Example: `FactionId`, `SiteId`, `EdgeId`

### CSS
- Project uses CSS Modules (NOT styled-components, NOT CSS-in-JS)
- Reference: `src/ui/components/TopBar/TopBar.module.css`

### Engine Architecture
- Engine layer MUST NOT import react/zustand/browser globals
- Guarded by `src/engine/__tests__/architecture-purity.test.ts`

### Schemas
- Zod for all runtime validation
- All schemas in `src/shared/schemas.ts`
- Tests in `src/shared/__tests__/schemas.test.ts`

### Testing
- vitest for unit tests
- Playwright for e2e
- jsdom + testing-library for React component tests

### Map Generation
- Uses d3-delaunay (only in tools/, NOT in src/)
- Lloyd relaxation for Voronoi distribution
- Edge sharing algorithm for boundary construction

### Current State (before M1)
- 5 sites (邑甲-邑戊)
- 2 factions: faction_red, faction_blue
- MapEdge does NOT have travel_cost yet
- World uses `factions: ReadonlyMap<FactionId, Faction>`

## Key Metis Findings
1. `MapEdge.travel_cost` doesn't exist yet - must be added in T0.1
2. painting/ system uses hardcoded 'faction_red'/'faction_blue' - DELETE, don't rename
3. `App.tsx` uses `displayName === '红'` string matching - must rewrite with playerRealmId

## 2026-04-29 T0.1 travel_cost schema
- Added `travel_cost` to `MapEdge` and `MapEdgeSchema`, then regenerated `src/content/m0/sites.json` from anchor distance.
- Content tests should assert invariants on the committed JSON so generator output stays honest.

## 2026-04-29 T1.1 realm rename
- Realm data now carries `fullTitle`, `capital`, `initialSites`, `initialArmies`, and `aiPersonality`; keep the schema and committed JSON aligned.
- `useFactions`/`world.factions` were renamed to `useRealms`/`world.realms` to keep terminology consistent across UI and engine.
## T1.2 Army/order shared types
- Added runtime `ArmyState`, `Army`, `OrderType`, `Order`, and `WarKey` shapes without expanding Army beyond the requested fields.
- Zod schemas mirror the type layer closely; `ArmySchema` keeps `destination`/`source` nullable and `ticksRemaining` nonnegative.
- Shared test file now covers valid/invalid cases for ArmySchema, OrderSchema, and ArmyStateSchema in one pass.

## 2026-04-29 T1.4 painting deletion
- src/engine/systems/painting/ was removed entirely; keep engine phase constants in src/engine/phases/index.ts only.

## 2026-04-29 T1.7 wars module
- `warKey` stays a simple sorted string join, which keeps war lookups symmetric without extra hashing.
- `declareWar` must clone the incoming `ReadonlyMap`; the tests now cover symmetry, idempotence, and immutability.
- Immer MapSet support still needs to be initialized from a live engine module; nableMapSet() now lives in src/engine/clock/clock.ts after the painting system removal.


## T1.5 - M1 map generator (algorithmic, 50 sites, 8 realms)

- M1 generator extends M0 algorithm: same Voronoi+Lloyd relaxation pipeline, but with N_SITES=50, N_REALMS=8, seed 0xc0ffee, travel_cost divisor /80 (vs /100 in M0), and tighter padding (60px vs 100/120 in M0) so the bigger site count fits without clustering at the borders.
- Realm assignment uses pure geographic partition by centroid quadrant: Qin(x<0.35W), Chu(y>0.65H), Yan(y<0.25H), Qi(x>0.65W); central remainder split among Zhou (1-2 sites at canvas centre) + Han/Zhao/Wei by sub-region.
- Rebalance pass guarantees every major realm has >=5 sites and Zhou has >=1 by transferring the geographically nearest site from the largest donor realm. Caps at 50 iterations as a hard safety; with seed 0xc0ffee the partition naturally satisfies all minima on the first pass.
- BFS connectivity verified by walking the shared-edge graph; with Lloyd relaxation it always passes for this seed, but the generator retries with seed+1 up to 32 times as defense in depth.
- Output JSON shape differs from M0: top-level initialArmies and initialWars are EMPTY arrays; armies live on each realm.initialArmies (2 ArmyTemplate per realm with 5000 manpower at capital and second-owned site).
- Sites get placeholder names matching their id (site_001..site_050) — historical names are T1.6's job.
- ESLint max-lines-per-function=50 (warn, but --max-warnings 0 makes it block). Split assignRealms into partitionByQuadrant + distributeCentral helpers, and split the test describe block into 6 smaller describes to stay under limit.

## 2026-04-29 T1.3 schema + factory wiring
- M1 validation stayed intentionally separate from M0: `M1DataSchema` accepts top-level `initialWars`/`initialArmies`, while runtime armies still hydrate from realm-local `initialArmies` templates.
- Shared world-building helpers (`buildRealmMap`, `buildSites`, `buildEdgesMap`) kept M0 and M1 factories aligned without changing the M0 call site.
- `World` now always carries `armies`, `wars`, `playerRealmId`, and `pendingOrders`, even for M0, so the runtime shape is uniform.


## 2026-04-29 T1.6 historical site naming + realm distribution
- Replaced placeholder `site_001..site_050` names with 50 unique historical Chinese names committed in `tools/name-m1-sites.mjs`. The script is idempotent and double-checks (a) every site got a name, (b) no name maps to a non-existent site, (c) no duplicate names.
- Wei (`realm_wei`) capital was relocated from `site_010` to `site_018` so that historic 大梁 (east) sits east of historic 安邑 (west). When you change a capital, also reorder `initialSites` so the capital is first and move `initialArmies[0]` to the new capital + `initialArmies[1]` to the next site.
- Realm `displayName` / `fullTitle` / `color` were already correct from the T1.5 generator; the T1.6 script re-applies them anyway so the JSON is self-healing if someone hand-edits and drifts.
- Distribution report at `.sisyphus/evidence/m1-task-1.6-realm-distribution.md` includes a constraint audit table — useful template for future scenario edits where designers need quick visual confirmation that 秦 is west / 楚 is south / etc.
- `src/content/m1/__tests__/realm-colors.test.ts` locks all 8 hex colors plus capital/site referential integrity. 10 tests pass via `pnpm test src/content/m1`.

## 2026-04-29 Victory system

- Keep victory detection pure: read-only world inspection, no state mutation, no hidden side effects.
- Use `playerRealmId` + full-site ownership as the M1 win condition; avoid adding elimination/capital rules early.
