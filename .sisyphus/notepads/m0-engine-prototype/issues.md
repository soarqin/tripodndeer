# M0 Engine Prototype - Issues

## 2026-04-29 Task: Initial Setup

### Known Challenges

1. **T3 vs T2 import timing**: T3 (PRNG) can run before T2 (types). Strategy: T3 can locally define RNGState and switch to `import type { RNGState } from '@/shared/types'` after T2 merges.

2. **T8 needs T7 complete**: Factory needs `paintingStep` import. T8 can stub `phases: []` and complete after T7 merges.

3. **pnpm on Windows**: Use `pnpm` not `npm`. Path separator is `\` but TypeScript paths use `/`.

4. **jsdom canvas limitations**: jsdom doesn't do real canvas rendering. Tests mock canvas context methods.

5. **Vitest dual environment config**: Need `projects` or `overrides` in vitest.config.ts for separate envs.

6. **ESLint no-restricted-globals for browser APIs**: `no-restricted-globals` covers window/document/navigator/requestAnimationFrame/cancelAnimationFrame/performance in engine files.

7. **Wave 2 ordering**: T6 and T7 fully parallel. T8 needs T7. T9 needs T6+T7+T8.
- TypeScript rejects `paths` without `baseUrl`; the scaffold needed an extra `baseUrl: "."` field even though the target config sample omitted it.
- `vite.config.ts` and `vitest.config.ts` require Node globals during typecheck; solved with a local ambient declaration instead of broadening dependencies.
### 2026-04-29 Task: Shared types and schemas
- `lsp_diagnostics` could not run because the TypeScript language server is not installed in this environment.
- Used `pnpm typecheck` as a fallback verification signal.

### 2026-04-29 Task: PRNG module
- `lsp_diagnostics` still could not run here because `typescript-language-server` is missing.

- TypeScript LSP diagnostics were unavailable in this environment (`typescript-language-server` missing), so verification relied on `pnpm typecheck` and tests instead.

### 2026-04-29 Task: Architecture enforcement
- `lsp_diagnostics` is still unavailable in this environment, so final verification used `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
- Added `@types/node` to support Node-based test utilities during typecheck.

### 2026-04-29 Task: T8 world factory
- `lsp_diagnostics` could not be used because `typescript-language-server` is missing in this environment.

### 2026-04-29 Task: T9 Zustand store bridge

- `src/engine/__tests__/architecture-purity.test.ts` had a path bug: `engineDir = path.resolve(testDir, '../../')` resolved to `src/` instead of `src/engine/`, which started failing as soon as UI files (`src/ui/store/*`) legitimately imported react/zustand and used window/RAF. Fixed to `'../'` to keep purity scanning scoped to engine. Watch out for other tests with similar over-broad path resolves.

## F4 Scope Fidelity Check - 2026-04-29
- Scope violation found in T14 app assembly: src/App.tsx lines 35-39 adds a conditional demo completion overlay, and src/App.module.css lines 17-28 styles it. T14 scope required only TopBar + MapCanvas + TimeControlBar, with no extra panels/routing.
- M1+ forbidden terms/dependencies search was clean; build passed. LSP diagnostics could not run because typescript-language-server is not installed in the environment.

## F4 Scope Fidelity Correction - 2026-04-29
- Corrected prior false positive: the '演示完成' banner is explicitly required by T14 in .sisyphus/plans/m0-engine-prototype.md lines 1856-1868 and acceptance criteria line 1908. It is not scope creep.
- Corrected verdict: all 15 tasks compliant; contamination clean; unaccounted src files clean.

## M0.1-T1 Verification
- `typescript-language-server` is unavailable in the environment, so LSP diagnostics could not run directly.
- `pnpm typecheck`, `pnpm lint`, `pnpm generate:m0-map`, and `pnpm test src/content` passed after adding `@types/d3-delaunay`.

## 2026-04-29 M0.2 scope fidelity review
- REJECT: expected M0.2 commits are present, but T1 commit 406527e touched engine/rendering/test files despite schema-only scope.
- REJECT: T4 commit 39aac03 touched engine/world factory, engine tests, shared types, and painting/clock tests despite rendering-only scope.
- No M1+ data fields/entities detected; build passes. LSP diagnostics unavailable because typescript-language-server is not installed.

## 2026-04-29 M0.2 scope fidelity correction
- CORRECTED VERDICT: APPROVE. Prior contamination finding was too strict: compile-cascade fixture/stub updates and World.edges plumbing are justified by M0.2 integration requirements.
- No files were identified as unrelated to the edge-indexed map format objective; no M1+ fields/entities/interactions detected.
### 2026-04-29 Task: T3.6 TopBar
- `lsp_diagnostics` remains unavailable because `typescript-language-server` is not installed in this environment.
