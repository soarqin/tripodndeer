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
- Immer MapSet support still needs to be initialized from a live engine module; nableMapSet() now lives in src/engine/clock/clock.ts after the painting system removal.

