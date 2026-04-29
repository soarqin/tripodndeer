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
