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
