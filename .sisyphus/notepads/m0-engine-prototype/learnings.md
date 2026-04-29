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
## 2026-04-29 - T6 clock engine

- Clock engine lives under `src/engine/clock` and remains pure: `advanceClock` only consumes explicit state, delta, and world; browser/RAF capping stays outside the engine.
- Tick execution should chain `world` and `rng` through `world.phases`, then increment `world.tick`, advance `world.date` via `addOneTick`, and store the final RNG on `world.rngState`.
- Speed switching intentionally resets `realTimeAccum` to `0` for predictable behavior.

## 2026-04-29 - T7 painting system

- Painting is a pure TickPhase under `src/engine/systems/painting`, firing on `world.tick % PAINT_INTERVAL_TICKS === 0` including tick 0.
- Immer 10 needs `enableMapSet()` before producing Worlds that contain `ReadonlyMap` sites.
- Painting events use `painting:siteFlipped` with `{siteId, fromFaction, toFaction}` payload while no-op cases preserve the same world and RNG references.

### 2026-04-29 Task: T8 world factory

- Static JSON import works with the current Vite/TypeScript bundler setup; no `resolveJsonModule` change was needed.
- Factory should re-validate incoming `M0Data` and then separately enforce ownership reference integrity against the factions map.
- `phases: [paintingStep]` keeps the world bootstrap aligned with the single M0 engine phase.

### 2026-04-29 Task: T9 Zustand store bridge

- Zustand 4.5 with immer middleware infers `WritableDraft<World>` for `state`; because `World` contains `ReadonlyMap` (sites/factions), bare `state.world = nextWorld` fails to typecheck. Use `castDraft(nextWorld)` from immer to satisfy the draft shape without relaxing engine-side immutability.
- Path-based environment from `vitest.config.ts` (jsdom for `src/ui/**`) is sufficient for store tests; no extra setup file needed.
- `import.meta.env.DEV` requires Vite client types; instead of adding `vite-env.d.ts` we declared a minimal global `ImportMeta`/`ImportMetaEnv` augmentation in `game-store.ts` and gated the `window.__game` debug hook behind a `typeof window !== 'undefined'` check so the module stays SSR-safe.
- Zustand selectors that return primitives or single object references work with the default strict-equality compare, so no `useShallow` is needed for the M0 selector set.

### 2026-04-29 Task: T14 app wiring

- App bootstrap is simplest as `main.tsx -> <App />` with a tiny global CSS import for reset and Vite client entry alignment.
- A single derived `useAllRed()` hook can drive the completion banner by checking faction display names and site ownership directly from Zustand selectors.
- The project already had `src/vite-env.d.ts`, so no extra Vite typing shim was needed for the final entry wiring.

### 2026-04-29 Task: T15 E2E test suite (Playwright)

- Playwright 1.59 (with @playwright/test 1.44 hoisted to 1.59 via pnpm) works out of the box; chromium binary already cached in C:\Users\soar\AppData\Local\ms-playwright.
- ESLint with parserOptions.project requires every linted `.ts` file to be in a referenced tsconfig. `playwright.config.ts` therefore has to be added to `tsconfig.json` `include` (alongside `vite.config.ts` / `vitest.config.ts`), otherwise lint fails with a `parserOptions.project` error.
- Default Playwright per-test timeout is 30s. Tests that intentionally wait `~35s` (to produce a long demo video) need explicit `test.setTimeout(60000)` inside the test body — config-level `timeout` would also work but per-test scoping keeps short tests strict.
- `playwright-report` HTML reporter pops a browser at the end of the run by default. `open: 'never'` keeps CI/agent runs non-interactive.
- `video: 'on'` in `use` always records every test; the longest webm in `test-results/` corresponds to the longest test and is the best candidate for `artifacts/m0-demo.webm`. Picking the largest file size (`Sort-Object Length -Descending`) reliably finds the demo recording.
- The default Playwright `webServer` block (`command: 'pnpm dev'`, `url: http://localhost:5173`, `reuseExistingServer: !CI`) handles dev server lifecycle automatically.
- For QA-FUNC-1 the M0 graph (5 sites, 1 starts red) reaches all-red in roughly 4–5s of wallclock at 5x speed even with the default `PAINT_INTERVAL_TICKS=3` because the only paint loop runs 4 flips × 3 ticks × 400ms = 4.8s. The `?paintInterval=1` URL parameter is forward-compatible but not strictly required to pass the 90s budget.
- Default app speed is `pause` (per `game-store` initial `ClockState`), so the QA-CONTROL-1 test must explicitly start a non-pause speed before pausing again to verify tick freezing.
- `[data-testid=top-bar-tick-count]` text is `Tick: <n>`; extracting via `/\d+/` regex on `textContent` is safer than `Number()` of the full string.
- `artifacts/` is gitignored alongside `playwright-report/` and `test-results/` — already present in M0 `.gitignore` so no further changes needed.


## F1 Plan Compliance Audit Re-run - 2026-04-29
- Required commands passed: git log inspection, pnpm test (13 files / 52 tests), pnpm typecheck, pnpm lint.
- Must Have verified 16/16 against implementation files, including strict TS, 5 irregular sites, clock/pause/5 speeds, painting, UI bars, architecture layers, rngState, phases array, delta cap, calendar, Zod load validation, dual Vitest env, engine purity test, and 300ms transition.
- Must NOT verified 7/7: no banned entities/fields/dependencies/tooling, no IndexedDB/Dexie, no production TS escape hatches, and no d3-delaunay import in src.
- Evidence check: .sisyphus/evidence has 62 files; artifacts include m0-demo.webm at 561,881 bytes plus three screenshots.
- Verdict: APPROVE.

## F2 Code Quality Review (passed 2026-04-29 15:47)

**All gates passed:**
- typecheck: clean
- lint: clean (max-warnings 0, --report-unused-disable-directives)
- test: 13 files / 52 tests pass (incl. architecture-purity, no-any, banned-deps)
- build: 221 KB (gzip 67 KB)

**Findings:**
- No s any / @ts-ignore / @ts-expect-error in src (only referenced inside the no-any test as banned literals).
- No production console.log / catch {} / TODO markers.
- `src/engine/random/mulberry32.ts` is pure (no module-level mutable state, no I/O).
- `src/engine/` has no react / zustand / DOM imports (only the purity test mentions them as banned strings).
- `src/ui/store/raf-driver.ts:20` caps deltaMs via `Math.min(rawDelta, MAX_DELTA_MS)` — anti-spiral guard verified.
- `src/ui/store/game-store.ts:72` uses a typed cast `(window as Window & { __game?: unknown })` — DEV-only debug hook, properly typed.
- All 10 reviewed files are under 95 lines; no function exceeds 50 lines.

VERDICT: APPROVE
## QA Run - 2026-04-29 15:50:31

### F3 Hands-on QA Execution Results

**E2E Suite (Playwright):** 5/5 PASS
- QA-CONTROL-1 (pause freezes tick): PASS (8.7s)
- QA-DELIVERABLE-1 (testids visible): PASS (372ms) 
- QA-DELIVERABLE-1 (paused screenshot): PASS (869ms)
- QA-DELIVERABLE-1 (after-30s @ 5x): PASS (35.4s)
- QA-FUNC-1 (all sites turn red at 5x): PASS (4.7s)
- Total runtime: 52.6s

**Unit Suite (Vitest):** 52/52 PASS across 13 test files (1.77s)

**Artifacts:**
- m0-initial.png: 33.8KB (>10KB threshold)
- m0-paused.png: 33.8KB (>10KB threshold)
- m0-after-30s.png: 38.3KB (>10KB threshold)
- m0-demo.webm: 548.7KB (>500KB threshold for 35s+ video)

**Verdict:** APPROVE - All scenarios pass, all artifacts present and meet size requirements.

## M0.1-T1 Voronoi map generator
- Rewrote `tools/generate-m0-map.ts` around `d3-delaunay` Voronoi cells, 4 Lloyd relaxation passes, deterministic inline Mulberry32, and symmetric hash-seeded edge perturbation.
- Shared-edge zero-gap validation relies on identical rounded vertices across adjacent polygons after `round2` serialization.
- `SUBDIVISIONS = 20` with observed generated minimum polygon vertex count of 80 for 5 sites.

## M0.1-T5: E2E re-record + visual.spec.ts (2026-04-29)

### Visual verification approach
- Read canvas pixel data via page.evaluate(() => canvas.getImageData(...).data) — works because tile cache is same-origin (no CORS taint).
- Two checks: (1) >1000 non-background pixels (canvas not blank), (2) >100 red/blue pixels in 200×200 center region.
- Color thresholds use loose RGB ranges ( > 180 && g < 80 && b < 80 for red) to tolerate antialiasing on curved edges.

### Refactoring for ESLint max-lines-per-function (50 lines)
- Extracted countNonBackgroundPixels(page) and countFactionPixelsInCenter(page) helpers into top-level async functions.
- Each test body now <10 lines; helpers are pure pixel-counting logic.

### Webm video deliverable
- Playwright outputs per-test videos under 	est-results/<test-folder>/video.webm (config: ideo: 'on', outputDir: 'test-results').
- The 30s deliverable test produces the longest clip (628.3KB at 5x speed for 35s); copied manually to rtifacts/m0-demo.webm.
- No automated copy in spec — could be added via test.afterAll fixture if needed.

### E2E final result
- 7 tests pass in 56.6s (1 worker, fullyParallel: false).
- All artifacts regenerated; dimensions/sizes confirmed.

## M0.2-T2 edge-indexed map generator (2026-04-29)

- `tools/generate-m0-map.ts` now keeps the M0.1 deterministic Voronoi + Lloyd relaxation path but serializes a global `edges` table plus per-site `boundary` refs instead of duplicated polygons/adjacency.
- Canonical rounded endpoint keys let adjacent Voronoi cells share one edge id; shared edges are cubic-bezier with `controls.length === anchors.length - 1`, while canvas boundary edges stay straight polylines.
- Reverse flags are derived from cell traversal vs canonical endpoint order; generated invariants and Vitest content tests both verify shared edges have opposite reverse flags and no edge is referenced by more than two sites.
- Verification evidence saved in `.sisyphus/evidence/m02-task-2-generate.txt` and `.sisyphus/evidence/m02-task-2-edge-cardinality.txt`; final `pnpm typecheck` and `pnpm lint` were clean.

## 2026-04-29 Task: M0.2-T5 E2E re-record + zero-gap pixel verification

### Zero-gap pixel test pattern (Playwright + Canvas)
- Sample center region of map canvas via ctx.getImageData(250, 200, 300, 200)
- Iterate RGBA stride (i += 4) and count pixels matching background color #F5EFD9 (245, 239, 217) with Math.abs(r - 245) <= 3 tolerance
- Expect bgPixels === 0 to confirm adjacent polygons meet perfectly with no gaps
- Edge-indexed cubic-bezier shared boundaries mathematically guarantee zero gap

### Playwright video artifacts location
- Videos go to 	est-results/<test-folder>/video.webm, NOT rtifacts/
- Must Copy-Item from test-results to artifacts/m0-demo.webm if needed for deliverable
- The 35s "after-30s screenshot at 5x speed" test produces the longest demo (~475KB)

### E2E pre-flight checks
- pnpm typecheck && pnpm lint && pnpm test all run cleanly via pre-commit hook
- 8 E2E tests pass in 54s with the new zero-gap assertion
## 2026-04-29 Task: T3.6 TopBar
- Added player realm badge and total manpower summary to the TopBar using store selectors, while keeping date/speed/tick unchanged.
- Replaced the ad-hoc red-faction victory check with `isVictorious(world)` in `App.tsx` and preserved the `demo-complete` testid.
- RealmOverviewPanel implemented successfully. Used vitest mock for useGameStore to avoid complex world setup in tests.
