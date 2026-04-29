
## F3 Manual QA Re-run Results

- Unit tests: 242/242 pass (vitest 30 files)
- Build: PASS (Vite 5.4.21, 293.30 kB JS, 4.86 kB CSS)
- E2E: 20/21 pass (the 1 failure is obsolete M0 func.spec.ts, not M1 issue)
- M1 specs all pass individually:
  - m1-context-menu.spec.ts: 7/7
  - m1-march-conquest.spec.ts: 2/2
  - m1-ai-behavior.spec.ts: 2/2
  - m1-victory.spec.ts: 1/1
- Existing: deliverable 3/3, control 1/1

## Key insight: func.spec.ts is M0-obsolete

The demo-complete banner in src/App.tsx now requires isVictorious(world) (M1 victory condition), no longer the M0 auto-conquest behavior. M1 design is player-agency: conquest via right-click context menu. The M0 test's 90s auto-conquest expectation no longer applies; M1 victory is verified via m1-victory.spec.ts.

