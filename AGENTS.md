# AGENTS.md — 鼎鹿 · Tripod and Deer

AI agent behavioral guidelines for this codebase. Read before making any changes.

---

## Project Overview

战国策略游戏引擎原型。Vite + React + TypeScript strict，纯函数引擎 + Zustand UI 层。

**当前里程碑**: M0/M1/M2/M3/M4(v1) 已交付。M5（人物与人才）为下一里程碑。

**实施顺序**: M4(已) → M5 人物 → M4.1 变法 → M4.2 灾害·贸易·派系 → M6 文化 → M7 谍报

---

## Architecture

### Layer Separation (ENFORCED by `architecture-purity.test.ts`)

```
src/engine/   ← 纯函数引擎，零 React 依赖
src/ui/       ← React 组件，只读 engine 输出
src/rendering/← Canvas 渲染，只读 world 状态
src/shared/   ← 类型 + schema（types.ts, schemas.ts）
src/content/  ← 静态数据（JSON + balance.ts）
```

**绝对禁止**: engine 层 import React / UI 层 / rendering 层。

### World State (Immutable)

```typescript
interface World {
  date: GameDate          // 旬为最小单位
  tick: number
  sites: ReadonlyMap<SiteId, Site>
  realms: ReadonlyMap<RealmId, Realm>
  armies: ReadonlyMap<ArmyId, Army>
  edges: ReadonlyMap<EdgeId, MapEdge>        // 几何/渲染边（不要混用）
  adjacencyEdges: ReadonlyMap<AdjacencyEdgeId, AdjacencyEdge>  // 仅关隘边
  wars: ReadonlyMap<WarKey, WarState>
  passes: ReadonlyMap<PassId, Pass>
  generals: ReadonlyMap<GeneralId, General>
  peaceProposals: ReadonlyMap<PeaceProposalId, PeaceProposal>
  sieges: ReadonlyMap<SiegeId, Siege>
  playerRealmId: RealmId
  rngState: RNGState
  phases: readonly TickPhase[]
  pendingOrders: readonly Order[]
}
```

### Phase Pipeline (M2)

```
aiPlan → orderApply → march → siege → combat-v2 → manpower → victoryCheck
```

每个 phase 是纯函数：`(World, RNGState) → { world, nextRng, events }`

---

## Key Conventions

### Types & Schemas

- **类型定义**: `src/shared/types.ts`（单一真相源）
- **Zod schema**: `src/shared/schemas.ts`（与 types.ts 并行，不重复）
- **新类型**: 先加 types.ts，再加 schemas.ts，两者保持同步
- **ID 类型**: 全部用 `string` alias（`SiteId = string`），不用字面量联合

### Balance Values

**所有数值常量**必须放在 `src/content/m2/balance.ts`，不得散落在 engine 文件中：

```typescript
// ✅ 正确
import { TERRAIN_DEFENSE } from '~/content/m2/balance'

// ❌ 错误
const MOUNTAIN_DEFENSE = 0.5  // 硬编码在 engine 文件
```

### Pure Functions + Immutable Maps

```typescript
// ✅ 正确：返回新 Map
function endWar(wars: ReadonlyMap<WarKey, WarState>, key: WarKey): ReadonlyMap<WarKey, WarState> {
  const next = new Map(wars)
  next.delete(key)
  return next
}

// ❌ 错误：直接修改
wars.delete(key)
```

### RNG

- PRNG 状态在 `World.rngState`，不在模块闭包
- 使用 `nextRng(state)` 获取下一个值，返回 `{ value, nextState }`
- 测试时用 `setCombatVarianceEnabled(false)` 关闭随机性

### AI Iteration Order

AI phase 中所有 `world.realms.values()` 和 `world.armies.values()` 必须按 ID 字典序排序：

```typescript
[...world.realms.values()].sort((a, b) => a.id.localeCompare(b.id))
```

这是 contract，改变顺序会破坏 RNG 可复现性。

---

## Critical Invariants

| 不变量 | 守护测试 |
|---|---|
| M1 scenario 恰好 50 个 site | `tools/__tests__/generate-m1-map.test.ts` |
| engine 层零 React 依赖 | `src/engine/__tests__/architecture-purity.test.ts` |
| 源文件无 `as any` / `@ts-ignore` | `src/__tests__/no-any.test.ts` |
| 禁止引入特定依赖 | `src/__tests__/banned-deps.test.ts` |
| 5 个关隘 edgeId 在 adjacencyEdges 中存在 | `src/engine/world/__tests__/passes-edge-existence.test.ts` |

---

## Two Types of Edges (DO NOT CONFUSE)

```
world.edges: Map<EdgeId, MapEdge>
  → 几何/渲染用途（Voronoi polygon 边界）
  → 151 条，覆盖全部站点边界
  → 不要用于旅行图逻辑

world.adjacencyEdges: Map<AdjacencyEdgeId, AdjacencyEdge>
  → 旅行图边，仅含 5 条关隘边
  → Pass.edgeId 指向此 Map 的键
  → 不要与 world.edges 混用
```

---

## Data Loading

```
M0 path: loadM0Data() → createInitialWorld()   ← 不要碰
M1 path: loadM1Data() → createWorldFromM1Data()
  └─ 自动检测 schema_version，v1 自动 migrate 到 v2
  └─ 加载 generals / passes / adjacencyEdges / realm.stats
```

**M0 加载路径绝对不能被 M2 改动影响。**

---

## Testing

```bash
pnpm test          # 全部单元测试（390 个，~3s）
pnpm typecheck     # TypeScript 严格检查
pnpm lint          # ESLint，0 警告模式
pnpm test:e2e      # Playwright e2e（需 dev server）
pnpm test:perf     # 性能预算（100 tick，p95 < 200ms）
pnpm test:all      # typecheck + lint + test + e2e
```

### TDD 节奏

每个任务：先写失败测试 → 最小实现 → refactor。

### Test Fixtures

创建 World fixture 时必须包含所有字段（M2 新增了多个 Map）：

```typescript
const world: World = {
  date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
  tick: 0,
  sites: new Map(),
  realms: new Map(),
  armies: new Map(),
  edges: new Map(),
  adjacencyEdges: new Map(),  // ← M2 新增
  wars: new Map(),
  passes: new Map(),          // ← M2 新增
  generals: new Map(),        // ← M2 新增
  peaceProposals: new Map(),  // ← M2 新增
  sieges: new Map(),          // ← M2 新增
  rulers: new Map(),          // ← M5 新增
  eventChainStates: new Map(), // ← M5 新增
  playerRealmId: 'realm_qin',
  rngState: { seed: 42, counter: 0 },
  phases: [],
  pendingOrders: [],
}
```

---

## M2 Subsystems Quick Reference

| 子系统 | 主文件 | 关键函数 |
|---|---|---|
| combat-v2 | `src/engine/systems/combat-v2/combat-v2.ts` | `resolveCombat(ctx)` |
| 战法 | `src/engine/systems/combat-v2/tactics/index.ts` | `pickTactic(ctx)` |
| 攻城 | `src/engine/systems/siege/siege.ts` | `siegeStep`, `startSiege` |
| 兵源 | `src/engine/systems/manpower/manpower.ts` | `manpowerTick` |
| 议和 | `src/engine/systems/peace/proposal-lifecycle.ts` | `acceptProposal`, `rejectProposal` |
| 战争 | `src/engine/wars/wars.ts` | `declareWarWithCasus`, `endWar` |
| AI | `src/engine/systems/ai/utility-scorer.ts` | `pickAction`, `getPersonality` |
| AI 战术 | `src/engine/systems/ai/tactics/` | siege / cut-supply / retreat |

---

## What NOT to Do

```
❌ 不要给每个新函数加 JSDoc（匹配 M1 简洁风格）
❌ 不要 memoize / cache / precompute 任何"未测出慢"的内容
❌ 不要新建 Map<X, Map<Y, Z>> 嵌套结构
❌ 不要为单一调用点提取工具函数
❌ 不要 over-validate（已有 Zod schema 的不要再加运行时类型检查）
❌ 不要把 balance 数值硬编码到 engine（统一进 src/content/m2/balance.ts）
❌ 不要修改与当前任务无关的 M1/M2 代码
❌ 不要新建 index.ts barrel file 除非匹配既有模式
❌ 不要在 engine 层使用 as any 或 @ts-ignore
```

---

## M5+ Deferred Items

以下功能明确延后，**不要在对应里程碑之前实现**：

- 将领学/谋维度实际效果（M5）
- 8 种 AI 性格 archetype（M5）
- 变法系统（M4.1，依赖 M5 革新者人才）
- 灾害 / 贸易 / 派系（M4.2，依赖 M5 人物）
- `prestige` / `legitimacy` 文化威望字段（M6）
- 学宫 / 百家 / 文化扩散（M6，依赖 M5 学宫产人才）
- 谍报行动（M7，依赖 M5 间者人才）
