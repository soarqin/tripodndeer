# M0 Engine Prototype - Learnings

## 2026-04-29 Task: Initial Setup

### Project Structure
- Only `docs/` and `.sisyphus/` exist at start - clean project
- Design docs at `docs/design/` (14 files)
- Target: Vite + React + TypeScript strict project

### Architecture Conventions
- **3-layer architecture**: Engine / Rendering / UI
- **Engine layer**: Pure functions only. NO React/Zustand/DOM APIs
- **Rendering layer**: Canvas only (no PixiJS/WebGL)
- **UI layer**: Zustand store + React components

### Key Architecture Decisions (from Metis review)
1. `FactionId` = opaque string (`'faction_red'`, `'faction_blue'`) NOT color literals
2. `RNGState` in WorldState (not module-level closure!) - for save system compatibility
3. `phases: Array<(world,rng) => world>` array shape even with 1 phase in M0
4. Tick returns `{world, events: []}` - events array placeholder for M1
5. `MAX_DELTA_MS = 100` cap in DRIVER (T9/RAF), NOT in engine `advanceClock`
6. Game date arithmetic is pure module (BC dates, no zero year)
7. Engine layer: zero UI dependencies (ESLint + Vitest enforcement)
8. Zod schema validation at load time (mandatory, no silent pass)

### Technology Stack (locked from 10-tech.md §1.1)
- Runtime: React 18.3, ReactDOM 18.3, Zustand 4.5, Immer 10, Zod 3.23
- Dev: TypeScript 5.4, Vite 5, @vitejs/plugin-react, ESLint, Prettier, Vitest, @playwright/test
- Tools only (NOT src/): d3-delaunay (devDep), tsx (devDep)
- BANNED: date-fns, dayjs, moment, lodash, immutable, rxjs, react-i18next, i18next

### Speed Tiers (from 01-core-loop.md §2.2)
- pause: Infinity ms/tick
- 1x: 5000ms/tick (1 tick = 1 xun = 10 days)
- 2x: 2500ms/tick
- 3x: 1500ms/tick
- 4x: 800ms/tick
- 5x: 400ms/tick

### Constants
- MAX_DELTA_MS: 100 (driver cap)
- PAINT_INTERVAL_TICKS: 3 (default, URL ?paintInterval=N overrides)
- INITIAL_DATE: { yearBC: 453, season: 'spring', month: 1, xun: 'shang' }
- Initial map: site_1 = faction_red, site_2..5 = faction_blue
- Canvas size: 800×600, background #F5EFD9 (parchment)
- faction_red color: #dc2626, faction_blue color: #2563eb

### TS Conventions
- strict: true, noUncheckedIndexedAccess: true
- NO `any`, NO `@ts-ignore`, NO `@ts-expect-error`
- Functions ≤ 50 lines (per 10-tech.md §11.2)
- kebab-case file names, camelCase/PascalCase identifiers
- Single quotes, no semicolons, 80-char line width (Prettier)
- Path alias: `@/*` → `src/*`

### Testing Strategy
- Vitest: engine tests = node env, UI tests = jsdom env
- Playwright: E2E with chromium only, viewport 1280×720
- Evidence saved to `.sisyphus/evidence/`

### PRNG: Mulberry32
- Core: `let t = seed + 0x6D2B79F5; ...` (10 lines)
- State: `{seed: number, counter: number}`
- Pure function: `nextRng(state) => {value, nextState}`
- counter increments by 1 each call, seed never changes

### Site Data Contract
- RawSite (JSON): id, name, position, polygon, adjacency
- Site (runtime): extends RawSite + ownerId: FactionId | null
- Vec2: readonly [number, number]
- Polygon: readonly Vec2[]
- Adjacency: readonly SiteId[] (bidirectional, closed)

### Painting System (M0)
- Red eats blue: faction_red absorbs adjacent faction_blue
- Every PAINT_INTERVAL_TICKS ticks, pick random (red, blue-neighbor) pair
- No-op if no red-blue adjacent pairs
- Uses Immer for immutable state updates
- Events: [{type: 'painting:siteFlipped', payload: {siteId, fromFaction, toFaction}}]

### M0 World Data
- 5 sites: site_1..site_5, each with irregular polygons (≥6 vertices)
- 2 factions: faction_red, faction_blue
- Initial: site_1 = red, site_2..5 = blue

### M0 data file: src/content/m0/sites.json schema
```json
{
  "sites": [{id, name, position, polygon, adjacency}],
  "factions": [{id, displayName, color}],
  "initialOwnership": {"site_1": "faction_red", ...}
}
```

### Vitest config (dual environment)
- Default: node
- Override for `src/ui/**`: jsdom
- Override for `src/rendering/**`: jsdom (has DOM components)

### Commit convention (Conventional Commits)
- No Husky/lint-staged (M0 scope boundary)
- Pre-commit: `pnpm typecheck && pnpm lint && pnpm test <scope>`
- Added `baseUrl: "."` to `tsconfig.json`; TypeScript path mapping with `paths` failed without it.
- Used a tiny ambient shim in `tools/node-globals.d.ts` so `vite.config.ts` and `vitest.config.ts` can typecheck without pulling in extra Node type packages.
- `pnpm install` generated the lockfile and `pnpm build` produced `dist/index.html` successfully.
### 2026-04-29 Task: Shared types and schemas
- Added opaque string IDs, readonly tuple shapes, and Zod runtime schemas for M0 shared data.
- Kept `FactionId` opaque and `ownerId` nullable to preserve M1+ extensibility.
- Verified with `pnpm typecheck` and `pnpm test src/shared`.

### 2026-04-29 Task: Architecture enforcement
- ESLint `overrides` can enforce engine purity cleanly with `no-restricted-imports` + `no-restricted-globals`.
- Vitest path-based `environmentMatchGlobs` is enough for node/jsdom separation without splitting configs.
- Node built-in imports in tests require `@types/node` for `pnpm typecheck` to stay green.
- Runtime scanning tests are a good backstop for architecture rules that lint cannot fully express.

### 2026-04-29 Task: PRNG module
- Mulberry32 stays pure by deriving each output from `{ seed, counter }`.
- `nextInt` is inclusive on both ends; `pickRandom` returns `undefined` for empty arrays and does not advance state.
- Targeted RNG tests passed; lint and typecheck were clean.

- Implemented date arithmetic as a pure tick stepper with explicit xun/month/season/year carry logic and no Date/date-fns usage.
- Table-driven tests are a good fit here because formatting hides month numbers while arithmetic still needs month/season coverage.
