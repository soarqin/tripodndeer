# M1 Core Loop - Issues & Gotchas

## Critical Metis-Flagged Issues

1. **MapEdge.travel_cost does not exist** - T0.1 must add it before anything else
2. **painting/ system MUST BE DELETED, not renamed** - uses hardcoded 'faction_red'/'faction_blue'
3. **App.tsx useAllRed() uses string matching** - must rewrite with playerRealmId

## 2026-04-29 T0.1 travel_cost schema
- `lsp_diagnostics` is blocked because `typescript-language-server` is not installed in this environment; verified with typecheck/lint/tests instead.

## LSP Rename Risks
- LSP rename won't catch string literals like 'faction_red', 'faction_blue', '红'
- Must grep manually after LSP rename
- Command: `grep -r "'faction_" src/`
- Also check: `grep -r "Faction" src/ --include='*.ts' --include='*.tsx'`

## 2026-04-29 T1.1 realm rename
- TypeScript LSP is unavailable in this environment, so rename propagation had to be done manually and verified with typecheck/lint/tests.
- The banned-deps test now excludes itself when scanning for `'faction_'` so the guard can stay green without self-triggering.

## Architecture Purity Guard
- `src/engine/__tests__/architecture-purity.test.ts` - must pass
- `src/__tests__/banned-deps.test.ts` - must pass (no date-fns/dayjs/lodash)
- `src/__tests__/no-any.test.ts` - must pass (no `as any` or `@ts-ignore`)

## M0 Compatibility
- `createWorldFromM0Data` must be PRESERVED for backwards compatibility
- M1 adds NEW `createWorldFromM1Data` function in factory.ts

## Map Generator Notes
- d3-delaunay is ONLY allowed in tools/, not src/
- BFS connectivity check required (no islands)
- Geographic constraints: 秦(west), 楚(south), 燕(north), 齐(east)

## World.pendingOrders
- T2.5 (orders system) will add `pendingOrders: readonly Order[]` to World type
- This must be done carefully to not break existing code

## demo-complete testid
- MUST preserve `data-testid="demo-complete"` - used by existing e2e tests
- Just change the text to "江山一统"
## T1.2 verification note
- TypeScript ESLint rejected an `as any` shortcut in the missing-armyId test; resolved by relying on `zod`'s `unknown` input and removing the cast.
- Language-server diagnostics were unavailable in this environment because `typescript-language-server` is not installed.

## 2026-04-29 T1.7 gotcha
- TypeScript LSP diagnostics are still unavailable here (`typescript-language-server` missing), so verification used typecheck/lint/vitest instead.

## 2026-04-29 T1.4 gotcha
- Removing paintingStep also removed the only nableMapSet() call, which broke store tests until MapSet initialization was moved to src/engine/clock/clock.ts.

## 2026-04-29 T1.3 verification gotchas
- `typescript-language-server` is still unavailable here, so `lsp_diagnostics` could not be used; typecheck/lint/vitest were the fallback proof.
- The widened `World` interface required updating older test fixtures (e.g. clock tests) to include `armies`, `wars`, `playerRealmId`, and `pendingOrders`.

## 2026-04-29 Victory system

- `pnpm typecheck` initially failed on `src/shared/__tests__/schemas.test.ts` because `delete` was used on a fully required inferred object; widened the local test object to `Partial<>`.
- 2026-04-29: Current M0 runtime world does not expose `realm_qin`, so `selectPlayerRealm` needs synthetic-state coverage in tests rather than relying on the default store world.
- 2026-04-29: ESLint `max-lines-per-function` forced splitting the store initializer and test suites into smaller helper functions/describe blocks.

## T2.1 combat system
- LSP diagnostics could not run because typescript-language-server is not installed in the environment; pnpm typecheck passed instead.

## 2026-04-29 T2.2 march system
- `lsp_diagnostics` remains unavailable (`typescript-language-server` not installed); verification used `pnpm typecheck`, `pnpm lint`, targeted march tests, and architecture purity tests.

## 2026-04-29 T2.3 AI plan system
- `lsp_diagnostics` remains unavailable (`typescript-language-server` not installed); verification used `pnpm typecheck`, `pnpm lint`, targeted AI tests, and architecture purity tests.
- Multi-realm AI tests must account for every non-player realm rolling each monthly tick, even if it has no idle armies; use single-realm fixtures when asserting exact RNG counters or 80/20 distribution.

## T3.1 verification notes
- TypeScript LSP diagnostics could not run locally because `typescript-language-server` is not installed; `pnpm typecheck` passed instead.
- Playwright browser console verification could not run because Chrome is not installed at the configured path; `pnpm dev` started and HTTP smoke returned 200.
## 2026-04-30 F4 scope fidelity check
- Current `git diff`/base diff contains no M1 implementation files; only `.sisyphus/boulder.json`, `.sisyphus/notepads/m1-core-loop/learnings.md`, and `.sisyphus/plans/m1-core-loop.md` are modified.
- The plan file is modified in working tree despite the read-only plan rule, so F4 cannot approve the current diff even though the checked M1 source files exist in the repository state.

## F1 compliance audit - 2026-04-30T01:32:04.3227306+08:00
- Code-level Must Have verified 10/10; Must NOT Have verified 11/11; 27 implementation tasks marked [x].
- Rejected due to missing exact evidence artifacts: m1-task-1.1-faction-grep.txt, m1-task-1.3-factory-build.txt, m1-task-1.3-unknown-realm.txt, m1-task-1.5-bfs.txt, m1-task-1.5-generate.txt, m1-task-1.5-partition.txt, m1-task-1.6-colors.txt, m1-task-1.8-bottombar.png, m1-task-3.1-dev-screen.png, m1-task-3.2-rightclick.png, m1-task-3.4-realtime.png, m1-task-3.6-victory.png, m1-task-3.7-visual.png, m1-task-4.2-after.png, m1-task-4.2-before.png, m1-task-4.3-map.png, m1-task-4.4-fps-samples.json.
- Spot checks passed: pnpm test src/engine/systems; pnpm test src/engine/__tests__/architecture-purity.test.ts; pnpm test src/content/m1 tools/__tests__/generate-m1-map.test.ts.

[2026-04-30T02:10:11.9585927+08:00] F4 scope fidelity check found one non-metadata untracked file: e2e/m1-screenshots-evidence.spec.ts. .sisyphus modifications are expected orchestration metadata.
