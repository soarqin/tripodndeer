# M0 Engine Prototype - Decisions

## 2026-04-29 Task: Initial Setup

### Decision: advanceClock does NOT cap deltaMs
- Cap (MAX_DELTA_MS=100) is driver responsibility (T9 raf-driver.ts)
- Engine trusts input for testability
- Engine test can pass 60000ms to test 150 ticks push

### Decision: setSpeed resets realTimeAccum to 0
- "Rescaling rule": speed change zeroes accumulator
- Simple, predictable, Paradox-like behavior

### Decision: paintingStep checks tick % PAINT_INTERVAL_TICKS
- Each phase decides its own trigger frequency
- Can be overridden by URL ?paintInterval=N

### Decision: BC→AD transition uses yearBC=-1 for AD1 (no year zero)
- Convention: negative yearBC = AD years
- yearBC: 1 → yearBC: -1 (AD 1)

### Decision: MapCanvas uses LOCAL RAF for color transitions only
- Rendering-layer RAF: only for 0.3s color interpolation
- This RAF NEVER calls store.tick or any engine action
- Engine RAF is in raf-driver.ts (T9), completely separate
- Local RAF stops when all transitions complete

### Decision: Space + +/- hotkeys in TimeControlBar
- Space = toggle pause/play (remembers last speed)
- +/- = increment/decrement speed tier
- Boundary: 5x + '+' stays at 5x

### Decision: window.__game debug hook (DEV only)
- Only exposed when import.meta.env.DEV
- Provides: store, world getter
- Playwright uses this for E2E state assertions

### Decision: Sites.json static import (not fetch)
- Compile-time bundled, no runtime network dependency
- M0DataSchema.parse() validates at load time

### Decision: T8 phases: [paintingStep] (not empty [])
- Factory wires paintingStep as the single phase
- Shape: `phases: readonly TickPhase[]`

### Decision: Immer for painting state updates
- world.sites is a Map - needs Immer's produce() for immutable updates
- Alternative: spread new Map - Immer is cleaner

### Decision: vitest.config.ts test environment overrides
- `src/engine/**` → node
- `src/ui/**` → jsdom
- `src/rendering/**` → jsdom (Canvas components)
- Default project environment: node
- Kept the scaffold minimal: no `src/App.tsx`, no banned utility libraries, no extra engine subdomains.
- Preserved the requested Vite/Vitest alias shape while making TypeScript happy via the shim file.
### 2026-04-29 Task: Shared types and schemas
- Standardized the shared contract around `RawSite`, runtime `Site`, `World`, and `M0Data`.
- `World.phases` remains a readonly array even for a single phase.

### 2026-04-29 Task: PRNG module
- Kept the RNG as stateless pure functions only; state progression is always returned via `nextState`.
- Reused `nextRng` as the single source of randomness for integer and array helpers.

### 2026-04-29 Task: Architecture enforcement
- Enforce engine purity in two layers: ESLint rules for import/global bans plus Vitest scans for filesystem/package checks.
- Keep the default Vitest environment as `node`, with `jsdom` only for `src/ui/**` and `src/rendering/**`.
- Use `@types/node` rather than local ad-hoc shims so Node-based tests typecheck cleanly.

### 2026-04-29 Task: T8 world factory
- Keep `sites.json` as a static module import and validate it through `M0DataSchema.parse()` instead of fetching at runtime.
- Enforce `initialOwnership` references in the factory, not the schema, because schema typing alone cannot verify faction existence.

### 2026-04-29 Task: T9 Zustand store bridge

- Chose to keep `immer` middleware (per spec) and use `castDraft` from immer to bypass `WritableDraft` for whole-field replacements (`World`, `events`). Alternative was dropping `immer` and using object-return `set`; rejected because spec mandates immer and future actions may want partial draft mutations.
- Selectors return raw fields with strict-equality; `useShallow`/custom equality reserved for future composite selectors when components need multiple fields in one render.
- Did not introduce `src/vite-env.d.ts`; instead inlined minimal `ImportMeta`/`ImportMetaEnv` augmentation in `game-store.ts` to keep the deliverable scope tight. If more files need `import.meta.env.DEV` later, promote the augmentation to a shared `vite-env.d.ts`.
- RAF id stored in a closure ref (`let rafId`) inside `useEffect`, NOT in Zustand state, so transient driver state never triggers store subscribers.

### 2026-04-29 Task: T14 app wiring

- Kept the final composition minimal: `TopBar` + `MapCanvas` + `TimeControlBar`, with layout handled in `App.module.css` only.
- Chose `src/index.css` for the reset rather than touching `index.html`, since importing it from `main.tsx` keeps the entry self-contained.
- Demo completion overlay is purely presentational and depends only on `useSites`/`useFactions`, avoiding any extra store state or routing.

### 2026-04-29 Task: M0.2-T2 edge-indexed content

- Chose canonical endpoint ordering as the stable source of truth for edge ids, reverse flags, and deterministic shared-edge perturbation.
- Boundary/canvas-frame edges remain `polyline`; only edges referenced by two cells become perturbed `cubic-bezier` edges.
