# M11 Save System - Learnings (Updated)

## Session ses_1c8b73199ffepm6vTQQhchFOUU Progress

### Completed Tasks (Wave 1 + Wave 2 partial)
- T1 ✅ worldToSaveDTO has hintState arg (commit a37ae19)
- T2 ✅ Load side wires saveDtoToHintState (committed with T1/T3)
- T3 ✅ scenarioId direct-read (commit 9a02c46 + 4a997a1)
- T4 ✅ Migration code deleted (commit f616713)
- T5 ✅ SaveDTO v6 schema (commit a219ca7)
- T6 ✅ M11 balance constants (commit b5c298a)
- T7 ✅ Error toast (commit fd719eb)

### Current SAVE_DTO_VERSION = 6
### SUPPORTED_SAVE_DTO_VERSIONS = [6]
### scenarioVersion is REQUIRED field in SaveDTO

## Architecture Facts
- SaveDTO v6 has: schemaVersion=6, scenarioId, scenarioVersion (required), createdAt, tutorialState, world
- SaveDTO v6 optional: seenHints, hintsEnabled
- worldToSaveDTO signature: (world, scenarioId?, hintState?)
- M11_SCENARIO_VERSIONS in src/content/m2/balance/m11.ts
- Error classification: check schemaVersion numerically BEFORE Zod parse

## Key API Facts
- Toast interface: {id, text, createdAt, durationMs} - no severity
- enqueueToast(text: string, durationMs?: number)
- slot-crud.ts: saveSlot returns Promise<void> (pre-T10)
- raf-driver.ts: autosave errors now surface as toast with '[错误]' prefix

## Pre-existing Issue
- 11 DiplomacyPanel.test.tsx failures exist on master BEFORE our changes (confirmed pre-existing)
- These are NOT caused by M11 changes

## What Needs to Happen Next (T8 onward)

### T8: LZ-string compression (unspecified-high)
- Install: pnpm add lz-string @types/lz-string
- Create src/ui/store/persistence/compression.ts
- Apply C3: StoredSaveRecord (IDB) vs SaveDTOv6 (logical) type distinction
- Modify slot-crud.ts saveSlot/loadSlot
- Apply C6: ONE atomic IDB put (metadata + world together)
- Apply C2: loadSlot checks schemaVersion numerically BEFORE Zod parse
- Apply M4: decompressWorld throws if LZ returns null
- Perf tests go to vitest.config.ts exclude list (C7)

### T9: Corruption recovery + quarantine (unspecified-high)
- NEW: src/ui/store/persistence/quarantine.ts
- loadSlot: detect decompress fail / JSON fail / Zod fail → quarantine
- C2 is already applied in T8: v5 records return incompatible_version, NOT quarantine
- quarantine: rename slot to ${slotId}_quarantine_${timestamp}, return Err('corrupted')

### T10: Storage quota detection (quick)
- navigator.storage.estimate() integration in saveSlot
- saveSlot return type: Promise<Result<void, SaveLoadError>>
- M11_QUOTA_WARN_THRESHOLD_PCT = 80, M11_QUOTA_BLOCK_THRESHOLD_PCT = 95
- M11_QUOTA_CACHE_TTL_MS = 5 * 60 * 1000 (cache estimate results)

### T11: Persistent storage request (quick)
- navigator.storage.persist() on first manual save
- localStorage flag to avoid re-requesting

### T12: Ring buffer (unspecified-high)
- MANUAL_SLOT_IDS = ['slot1'..'slot5']
- AUTO_SLOT_IDS = ['auto_0'..'auto_9']
- SLOT_IDS = [...MANUAL_SLOT_IDS, ...AUTO_SLOT_IDS]
- NEW: auto-ring-buffer.ts with writeAutoRingBuffer
- C4: ONE atomic IDB readwrite transaction for eviction
- M6: single-entry.test.ts invariant

### T13-T15: Wave 4 (after T12)
- T13: yearly autosave trigger (yearBC change + M2 visibility handler)
- T14: critical-event autosave (domain GameEvents via UI critical-events.ts)
- T15: save-on-pagehide hook (M3: both pagehide AND visibilitychange)

### T16-T17: Delete/Rename UI (visual-engineering, after T12)
- T16: delete button + confirm dialog (M11: "手书史册" / "天道流转" sections)
- T17: rename slot inline editing (pencil icon)

### T18-T22: Wave 5 parallel tasks
- T18: thumbnail (visual-engineering) - async, offscreen canvas, M12 consistent viewBox
- T19: 编年体 summary (writing) - classical Chinese, reign years
- T20: F9 quick-load (quick) - M9 confirmation dialog
- T21: defeat modal (visual-engineering) - M8 亡国录 narrative
- T22: JSON export/import (unspecified-high) - strict Zod v6 parse

### T23: AGENTS.md + roadmap sync (writing) - last

### F1-F4: Final verification wave

### T10 quota detection notes
- `saveSlot` now returns `Result<void, SaveLoadError>` so callers can branch on `quota_exceeded` without relying on thrown errors.
- Cache quota snapshots by `navigator.storage.estimate` function identity + TTL to avoid stale cross-test reuse when globals are stubbed.
- Auto saves should surface quota failures as toast-only; manual saves can open the quota modal path.
- `toastQueue` is not cleared by `reset()` alone; tests that inspect toasts should clear `toastQueue` explicitly.

## T11 Persistent Storage Request — Completed

### Files
- NEW: `src/ui/store/persistence/persist-request.ts`
- NEW: `src/ui/store/persistence/__tests__/persist-request.test.ts`
- MOD: `src/ui/components/SaveLoadModal/SaveLoadModal.tsx` (manual-save hook + status)
- MOD: `src/ui/components/SaveLoadModal/SaveLoadModal.module.css` (status line)

### Architecture
- `requestPersistentStorage()` sets `localStorage['persist_requested']` before calling `navigator.storage.persist()`
- `navigator.storage` absence is a graceful noop
- SaveLoadModal now shows a simple persisted-status line via `isPersisted()`

### Verification
- `pnpm test src/ui/store/persistence/__tests__/persist-request.test.ts` ✅
- `pnpm typecheck` ✅

## T8 LZ-String Compression — Completed (commit 86ead27)

### Files
- NEW: `src/ui/store/persistence/compression.ts` (compressWorld/decompressWorld/isCompressed)
- NEW: `src/ui/store/persistence/__tests__/compression.test.ts` (9 tests)
- NEW: `src/engine/world/__tests__/save-dto-compression.test.ts` (3 tests, in pnpm test)
- NEW: `src/engine/world/__tests__/save-dto-compression-perf.test.ts` (1 test, in pnpm test:perf only)
- MOD: `src/ui/store/persistence/slot-crud.ts` (compression + StoredSaveRecord + envelope check)
- MOD: `vitest.config.ts` (exclude perf test from pnpm test)
- MOD: `package.json` (test:perf file list)
- MOD: `.eslintrc.cjs` (engine __tests__ exempt from no-restricted-globals)

### Architecture
- StoredSaveRecord vs SaveDTO type distinction — physical (string world) vs logical (object world)
- StoredSaveDTO interface defined locally in slot-crud.ts (NOT in shared types — persistence-only concern)
- COMPRESSED_PREFIX = '\x00lz\x00' — non-printable sentinel to avoid collision with legacy JSON
- decompressWorld is lenient: returns input as-is if !isCompressed (backward-compat path)
- decompressWorld throws on lz-string null return (corruption detection)

### Critical Decisions
- C2 envelope check uses STRICT equality `schemaVersion === SAVE_DTO_VERSION` (not Array.includes)
  - When SUPPORTED_SAVE_DTO_VERSIONS grows past [6], revisit this in migration code
- C6 atomic IDB put: ONE record contains slotId + compressedDto + metadata (no separate writes)
- World fields only compressed; top-level (schemaVersion/scenarioId/scenarioVersion/createdAt/tutorialState/seenHints/hintsEnabled) stay as plain JSON

### Gotchas
- ESLint `no-restricted-globals: performance` blocks engine code, but tests need it for perf assertions
- Solution: added override exempting `src/engine/**/__tests__/**` — matches architecture-purity test which also excludes __tests__
- @types/lz-string is deprecated (lz-string ships its own types) but installed anyway per task spec

### M9 Perf Results (evidence: .sisyphus/evidence/task-8-compression-size.txt)
- uncompressed: 318.58 KB (UTF-16)
- compressed: 40.92 KB (UTF-16) — 12.84% ratio
- median compress time: 21.66ms (samples: 19.92, 21.42, 21.66, 27.19, 41.66)
- well under M11_COMPRESSION_TARGET_KB=50, M11_COMPRESSION_SPEED_MS=100

### Tests Status
- pnpm test: 2914 passed | 11 failed (DiplomacyPanel pre-existing, useGameStore.getState mock issue, NOT from compression)
- pnpm typecheck: 0 errors
- pnpm lint: 0 errors, 0 warnings
- pnpm test:perf: 21 passed (11 perf test files)

### Backward-Compat Note
- saveSlot writes StoredSaveDTO with world as compressed string
- loadSlot expects world as string; legacy v6 records with world-as-object will fail at readStoredWorld → parse_error
- Since this is the FIRST compression integration, no legacy data exists in production yet — safe

## T9 Corruption Recovery + Quarantine — Completed

### Files
- NEW: `src/ui/store/persistence/quarantine.ts` (`quarantineSlot(slotId)` — rename to `${slotId}_quarantine_${Date.now()}`)
- NEW: `src/ui/store/persistence/__tests__/quarantine.test.ts` (5 tests: 3 corruption modes + v5 regression + evidence)
- MOD: `src/shared/types/save-dto.ts` — `SaveLoadError` converted to discriminated union; added `corrupted` + `newer_version` + `quota_exceeded` kinds; `SaveLoadErrorKind` derived via `SaveLoadError['kind']`
- MOD: `src/ui/store/persistence/slot-crud.ts` — 3 catch blocks (decompress / JSON.parse / Zod safeParse) now call `quarantineSlot` and return `{ kind: 'corrupted', originalSlotId, quarantineSlotId }`
- MOD: `src/engine/world/__tests__/save-dto.test.ts` + `save-dto-m8_1.test.ts` — added `if (result.error.kind !== 'incompatible_version') throw` narrowing for `.got` / `.expected` access

### Architecture
- "v6-shaped data that fails further processing" → quarantine. v5 envelope check returns `incompatible_version` BEFORE the corruption catch blocks (C2 already applied in T8).
- The "Stored world field is missing or not a string" case still returns `parse_error` (not quarantined) — kept narrow per task spec which lists only the 3 catch blocks.
- Quarantine slot ID format: `${slotId}_quarantine_${Date.now()}` — non-overlapping with `SLOT_IDS` namespace (`slot1..slot5`, `auto`).

### Critical Decisions
- Discriminated union (not optional fields) for `SaveLoadError` — task spec explicitly defined the union with required per-variant fields. Existing test files updated with narrowing instead.
- `SaveLoadErrorKind` retained as a derived type alias (`SaveLoadError['kind']`) for backward compat with any future consumer using the kind alone.

### Gotchas
- Initial `Read` of `slot-crud.ts` returned a stale view (missing the T10 imports). My subsequent import-line edit then dropped `M11_QUOTA_*` and `useGameStore` / `ModalPriority` imports. Caught via typecheck and restored. **Lesson**: when editing import blocks, verify with `git diff` immediately after to catch silent drops.
- `decompressWorld` throws ONLY when `isCompressed(input)` returns true AND `decompressFromUTF16` returns null. Tests must prefix bogus data with `'\x00lz\x00'` (COMPRESSED_PREFIX) to hit the throw path.
- Non-compressed strings flow through `decompressWorld` as-is, so JSON.parse failure tests don't need the prefix.

### Tests Status
- `pnpm test src/ui/store/persistence/__tests__/quarantine.test.ts`: 5/5 pass
- `pnpm typecheck`: 0 errors
- `pnpm lint`: 0 errors, 0 warnings
- `pnpm test` (full): 2927 pass, 11 fail (DiplomacyPanel pre-existing — unchanged from baseline)

### Evidence
- `.sisyphus/evidence/task-9-quarantine-flow.txt` — quarantine flow PASS, original deleted, quarantine present
- `.sisyphus/evidence/task-9-quarantine-preserved.txt` — schemaVersion + metadata preserved post-quarantine
