# AGENTS.md — 鼎鹿 · Tripod and Deer

AI agent behavioral guidelines for this codebase. Read before making any changes.

---

## Project Overview

战国策略游戏引擎原型。Vite + React + TypeScript strict，纯函数引擎 + Zustand UI 层。

**当前里程碑**: M0-M9 已交付。Wave 9: Refactor & Cleanup 已完成。

**实施顺序**: M4(✅) → M5(✅) → M4.1(✅) → M4.2(✅) → M6(✅) → M7(✅) → M8(✅) → M9(✅) → Wave 9(✅)

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
  date: GameDate // 旬为最小单位
  tick: number
  sites: ReadonlyMap<SiteId, Site>
  realms: ReadonlyMap<RealmId, Realm>
  armies: ReadonlyMap<ArmyId, Army>
  edges: ReadonlyMap<EdgeId, MapEdge> // 几何/渲染边（不要混用）
  adjacencyEdges: ReadonlyMap<AdjacencyEdgeId, AdjacencyEdge> // 仅关隘边
  wars: ReadonlyMap<WarKey, WarState>
  passes: ReadonlyMap<PassId, Pass>
  generals: ReadonlyMap<GeneralId, General>
  peaceProposals: ReadonlyMap<PeaceProposalId, PeaceProposal>
  sieges: ReadonlyMap<SiegeId, Siege>
  academies: ReadonlyMap<AcademyId, Academy> // M6 学宫
  playerRealmId: RealmId
  rngState: RNGState
  phases: readonly TickPhase[]
  pendingOrders: readonly Order[]
}
```

### Phase Pipeline (M2)

```
aiStrategic (yearly) → aiOperational (monthly) → aiTactical (per-tick) → orderApply → march → siege → combat-v2 → culturalIdentity → manpower → espionagePhase → rulerLifecycle → characterLifecycle → recruitment → ideologyDrift → reform → victoryCheck → diplomacyLifecycle → economy → disaster → trade → faction → historicalEvents → prestigeUpdate
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
const MOUNTAIN_DEFENSE = 0.5 // 硬编码在 engine 文件
```

### Pure Functions + Immutable Maps

```typescript
// ✅ 正确：返回新 Map
function endWar(
  wars: ReadonlyMap<WarKey, WarState>,
  key: WarKey
): ReadonlyMap<WarKey, WarState> {
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
;[...world.realms.values()].sort((a, b) => a.id.localeCompare(b.id))
```

这是 contract，改变顺序会破坏 RNG 可复现性。

---

## Critical Invariants

| 不变量                                                                              | 守护测试                                                             |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| M1 scenario 恰好 50 个 site                                                         | `tools/__tests__/generate-m1-map.test.ts`                            |
| engine 层零 React 依赖                                                              | `src/engine/__tests__/architecture-purity.test.ts`                   |
| 源文件无 `as any` / `@ts-ignore`                                                    | `src/__tests__/no-any.test.ts`                                       |
| 禁止引入特定依赖                                                                    | `src/__tests__/banned-deps.test.ts`                                  |
| 5 个关隘 edgeId 在 adjacencyEdges 中存在                                            | `src/engine/world/__tests__/passes-edge-existence.test.ts`           |
| Each realm has rulerId or null                                                      | `src/content/m1/__tests__/scenario-rulers.test.ts`                   |
| All M5 balance constants prefixed M5\_                                              | `src/content/m2/__tests__/balance-m5.test.ts`                        |
| 8 archetypes covered in personality-coverage.test.ts                                | `src/engine/systems/ai/__tests__/personality-coverage.test.ts`       |
| M4.1_REFORMS_COUNT === 4                                                            | `src/content/m2/__tests__/balance-m41.test.ts`                       |
| M6_ENABLED=true (balance.ts)                                                        | `src/content/m2/__tests__/balance-m6.test.ts`                        |
| ≥2 active academies at scenario start (jixia + xihe)                                | `src/engine/world/migrations/__tests__/v5-to-v6.test.ts`             |
| All M6 balance constants prefixed M6\_                                              | `src/content/m2/__tests__/balance-m6.test.ts`                        |
| M7_ENABLED=true（balance.ts）                                                       | `src/content/m2/__tests__/balance-m7.test.ts`                        |
| ESPIONAGE_ACTION_KINDS 长度 = 4（不含 forbidden）                                   | `src/engine/systems/espionage/__tests__/m7-deferred-actions.test.ts` |
| 56 directional intelligenceCoverage entries at scenario start                       | `src/shared/__tests__/m7-world-fields.test.ts`                       |
| All M7 balance constants prefixed M7\_                                              | `src/content/m2/__tests__/balance-m7.test.ts`                        |
| army-render fog gating: enemy armies hidden when coverage < 30 (M7_COVERAGE_TIER_1) | `src/rendering/map/__tests__/army-render-gating.test.ts`             |
| Initial coverage seeded by adjacency: adjacent realms = 30, non-adjacent = 0        | `src/engine/world/__tests__/factory-coverage.test.ts`                |
| All M8 balance constants prefixed M8_                                              | `src/content/m2/__tests__/balance-m8.test.ts`                        |
| M8_PERSONALITY_DIMENSIONS_COUNT === 8                                               | `src/content/m2/__tests__/balance-m8.test.ts`                        |
| getPersonality fallback uniform to 'incompetent'                                    | `src/engine/systems/ai/__tests__/utility-scorer.test.ts`             |
| 8 archetype 字面值与 docs/design/07-ai.md §2.3 一一对应                             | `src/content/m2/__tests__/balance-m8.test.ts`                        |
| M9_ENABLED=true (balance.ts)                                                        | `src/content/m2/__tests__/balance-m9.test.ts`                        |
| M9 scenario 恰好 250 sites                                                          | `src/content/m9/__tests__/scenario-m9.test.ts`                       |
| M9 12 realms registered (8 playable + 4 AI-only)                                   | `src/content/m2/__tests__/balance-m9.test.ts`                        |
| Forbidden anachronism strings absent in event text                                  | `src/content/__tests__/m9-historical-fidelity.test.ts`               |
| M9 character templates spawn within birthYear+20 window                             | `src/engine/systems/character/__tests__/character-spawn.test.ts`     |

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

## Three Types of People (DO NOT CONFUSE)

```
world.rulers: Map<RealmId, RulerState>
  → 君主状态（健康/年龄/性格/寿命）
  → 每个 realm 最多 1 个
  → 不要与 world.generals 混用

world.generals: Map<GeneralId, General>
  → 人才池（含君主、将领、太守等）
  → Realm.rulerId 指向此 Map 的键
  → 君主死亡时从此 Map 移除

world.characterTemplates: Map<CharId, CharacterTemplate>
  → M9 新增：时间戳 roster，非运行时 instance
  → 按 birthYearBC 动态 spawn 为 General
  → 不要与 world.generals 混用

heir candidate
  → 由 selectHeir(world, realmId) 动态计算
  → 不存储在 World 中（纯函数）
```

---

## Three Types of Reform Data (DO NOT CONFUSE)

```
Realm.traits: readonly string[]
  → 永久 buff 数组（已完成变法的 trait）
  → 通过 getTraitModifiers(realm) 影响数值
  → 不要与 world.reformStates 混用

world.reformStates: Map<RealmId, ReformState>
  → 进行中变法的状态（最多 1 个 per realm）
  → 包含 currentStageId / choiceHistory / status
  → 不要与 Realm.traits 混用

ReformDefinition JSON in src/content/m4_1/reforms/
  → 变法定义模板（trigger / stages / choices）
  → 不存储在 World 中（纯数据）
  → 不要把 ReformDefinition 字段加到 World
```

---

## Three Types of Espionage Data (DO NOT CONFUSE)

```
world.intelligenceCoverage: Map<CoverageKey, number>
  → 定向情报覆盖度 0-100，key = `${observer}__${target}`（directional）
  → 不要用对称 key（必须 directional）
  → 不要在 espionagePhase 之外修改
  → 渲染层通过 getCoverageTier() 决定 enemy army 可见性
  → 自己 realm + 盟友（active alliance）永远全可见
  → adjacent realms 初始 coverage = 30，non-adjacent = 0

world.spyMissions: Map<SpyMissionId, SpyMission>
  → 进行中谍报任务（含历史已完成）
  → 不要在 espionagePhase 之外修改
  → 不要与 world.intelligenceCoverage 混用

world.counterIntelStates: Map<RealmId, CounterIntelState>
  → 每 realm 防御姿态（detectionLevel 0-10）
  → 不要在 espionagePhase 之外修改
```

```
M0 path: loadM0Data() → createInitialWorld()   ← 不要碰
M1 path: loadM1Data() → createWorldFromM1Data()
  └─ 自动检测 schema_version，v1 自动 migrate 到 v3
  └─ 加载 generals / passes / adjacencyEdges / realm.stats
```

**M0 加载路径绝对不能被 M2 改动影响。**

---

## Testing

```bash
pnpm test          # 全部单元测试（2200+ 个，~25s）
pnpm typecheck     # TypeScript 严格检查
pnpm lint          # ESLint，0 警告模式
pnpm test:perf     # 性能预算（100 tick，p95 < 200ms）
pnpm test:all      # typecheck + lint + test
```

E2E 验证已迁移到 agent-browser CLI（agent 驱动的手动验证），不再有 Playwright 自动化套件。

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
  adjacencyEdges: new Map(), // ← M2 新增
  wars: new Map(),
  passes: new Map(), // ← M2 新增
  generals: new Map(), // ← M2 新增
  peaceProposals: new Map(), // ← M2 新增
  sieges: new Map(), // ← M2 新增
  rulers: new Map(), // ← M5 新增
  eventChainStates: new Map(), // ← M5 新增
  academies: new Map(), // ← M6 新增
  intelligenceCoverage: new Map(), // ← M7 新增
  spyMissions: new Map(), // ← M7 新增
  counterIntelStates: new Map(), // ← M7 新增
  playerRealmId: 'realm_qin',
  rngState: { seed: 42, counter: 0 },
  phases: [],
  pendingOrders: [],
}
```

---

## M2 Subsystems Quick Reference

| 子系统    | 主文件                                           | 关键函数                           |
| --------- | ------------------------------------------------ | ---------------------------------- |
| combat-v2 | `src/engine/systems/combat-v2/combat-v2.ts`      | `resolveCombat(ctx)`               |
| 战法      | `src/engine/systems/combat-v2/tactics/index.ts`  | `pickTactic(ctx)`                  |
| 攻城      | `src/engine/systems/siege/siege.ts`              | `siegeStep`, `startSiege`          |
| 兵源      | `src/engine/systems/manpower/manpower.ts`        | `manpowerTick`                     |
| 议和      | `src/engine/systems/peace/proposal-lifecycle.ts` | `acceptProposal`, `rejectProposal` |
| 战争      | `src/engine/wars/wars.ts`                        | `declareWarWithCasus`, `endWar`    |
| AI        | `src/engine/systems/ai/ai.ts`                    | `aiPlanStep`, `planEspionageAction` |
| AI 战术   | `src/engine/systems/ai/tactics/`                 | siege / cut-supply / retreat       |

---

## M5 Subsystems Quick Reference

| 子系统             | 主文件                                                | 关键函数                                      |
| ------------------ | ----------------------------------------------------- | --------------------------------------------- |
| rulerLifecycle     | `src/engine/systems/ruler/ruler-lifecycle.ts`         | `rulerLifecyclePhase(world, rng)`             |
| characterLifecycle | `src/engine/systems/character/character-lifecycle.ts` | `characterLifecyclePhase(world, rng)`         |
| recruitment        | `src/engine/systems/recruitment/recruitment.ts`       | `recruitmentPhase(world, rng)`                |
| 继承               | `src/engine/systems/ruler/succession.ts`              | `selectHeir(world, realmId)`                  |
| 势力分裂           | `src/engine/systems/ruler/realm-split.ts`             | `splitRealm(world, oldRealmId, config)`       |
| 事件链             | `src/engine/systems/events/event-chain-engine.ts`     | `applyEventEffect(world, effect)`             |
| Modal UI           | `src/ui/components/Modal/Modal.tsx`                   | `<Modal title content actions dismissable />` |

---

## M4.1 Subsystems Quick Reference

| 子系统              | 主文件                                           | 关键函数                                |
| ------------------- | ------------------------------------------------ | --------------------------------------- |
| reformPhase         | `src/engine/systems/reform/reform-phase.ts`      | `reformPhase(world, rng)`               |
| predicate evaluator | `src/engine/systems/reform/predicate.ts`         | `evaluatePredicate(world, realm, node)` |
| stage progression   | `src/engine/systems/reform/stage-progression.ts` | `applyReformChoice`, `completeReform`   |
| TraitEffectRegistry | `src/content/m4_1/trait-effects.ts`              | `getTraitModifiers(realm)`              |
| reform JSONs        | `src/content/m4_1/reforms/`                      | 4 reform definitions                    |
| v1→v3 migration     | `src/engine/world/migrations/v1-to-v3.ts`        | `migrateScenarioV1ToV3`                 |
| v3→v4 migration     | `src/engine/world/migrations/v3-to-v4.ts`        | `migrateScenarioV3ToV4`                 |

---

## M6 Subsystems Quick Reference

| 子系统            | 主文件                                                  | 关键函数                            |
| ----------------- | ------------------------------------------------------- | ----------------------------------- |
| culturalIdentity  | `src/engine/systems/culture/cultural-identity-phase.ts` | `culturalIdentityPhase(world, rng)` |
| ideologyDrift     | `src/engine/systems/culture/ideology-drift-phase.ts`    | `ideologyDriftPhase(world, rng)`    |
| prestigeUpdate    | `src/engine/systems/culture/prestige-update-phase.ts`   | `prestigeUpdatePhase(world, rng)`   |
| academyProduction | `src/engine/systems/recruitment/recruitment.ts`         | hook in `recruitmentPhase`          |
| 周王册封          | `src/content/m6/zhou-investiture-chain.json`            | event chain                         |

---

## M7 Subsystems Quick Reference

| 子系统               | 主文件                                                | 关键函数                                    |
| -------------------- | ----------------------------------------------------- | ------------------------------------------- |
| espionagePhase       | `src/engine/systems/espionage/espionage-phase.ts`     | `espionagePhase(world, rng)`                |
| planEspionageAction  | `src/engine/systems/ai/ai.ts`                         | `planEspionageAction(world, realm, rng)`    |
| espionage-reactions  | `src/engine/systems/espionage/espionage-reactions.ts` | `applyEspionageReactions(world, mission)`   |
| scoreEspionageOption | `src/engine/systems/espionage/score-espionage.ts`     | `scoreEspionageOption(option, personality)` |

---

## M9 Subsystems Quick Reference

| 子系统 | 主文件 | 关键函数 |
| --- | --- | --- |
| realmDeactivationPhase | `src/engine/wars/realm-deactivation.ts` | `realmDeactivationPhase(world, rng)` |
| characterSpawnPhase | `src/engine/systems/character/character-spawn.ts` | `characterSpawnPhase(world, rng)` |
| i18n core | `src/shared/i18n.ts` | `loadLocale`, `t` |
| Character Templates | `world.characterTemplates` Map | `CharacterTemplate` interface |
| Provinces / Regions | `world.provinces` / `world.regions` | `Province`, `Region` interfaces |

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
❌ 不要把 ruler 字段嵌入 Realm（ruler 状态在 world.rulers Map）
❌ 不要给 character 加 portraitUrl / familyTree（违 §8.4）
❌ 不要在 character lifecycle 之外修改 loyalty
❌ 不要用 Realm.aiPersonality 决定 archetype（从 world.rulers[realmId].personality 读）
❌ **不直接读 `politicalSystem` 改公式**——数值效果只通过 trait
❌ **不向 utility-scorer 添加变法决策**——独立 phase
❌ **不修改 lin_xiangru/fan_ju/lian_po JSON 格式**——保持 M5 数据完整
❌ 不策反/不暗杀/不窃取（§12.4 禁项 — defect/assassinate/steal）
❌ 不直接 mutate general.loyalty（用 Effect.character.loyalty）
❌ 不扩展 AIOption.kind（用 AIEspionageOption parallel 类型）
❌ 不新增 Realm.stability 字段（用 factionInfluences 代理）
❌ 不在 army-render 之外的渲染层 gate visibility（M7.1 仅 army 范围）
❌ 不直接修改 M7_COVERAGE_TIER_* 数值（30/60/90 是设计契约）
```

---

## M5+ Deferred Items

以下功能明确延后，**不要在对应里程碑之前实现**：

- 将领学/谋维度实际效果（M5）✅ 已交付
- 8 种 AI 性格 archetype（M5）✅ 已交付
- 变法系统（M4.1，依赖 M5 革新者人才）✅ 已交付（M4.1）
- 灾害 / 贸易 / 派系（M4.2，依赖 M5 人物）✅ 已交付（M4.2）
- `prestige` / `legitimacy` 文化威望字段（M6）✅ 已交付（M6）
- 学宫 / 百家 / 文化扩散（M6，依赖 M5 学宫产人才）✅ 已交付（M6）
- 谍报行动（M7，依赖 M5 间者人才）✅ 已交付（M7）

## M8+ Deferred Items

> M8 系列已全部交付（M8 + M8.1 + M8.2 + M8.3）。本 section 列举的剩余项均推到 M9.x / M10 / M12。

以下功能明确延后，**不要在对应里程碑之前实现**：

- 三层决策模型（Strategic/Operational/Tactical）（M8.x）
- 外交 AI 记忆（"被欺骗的记忆"）（M8.x）
- AI vs AI 自动对战 infra（M8.x）
- 5 档难度分层（M8.x）
- Dev mode AI introspection UI（M10）
- Personality drift 随事件演化（M8.x）
- Archetype 重命名 benevolent→opportunist / builder→zealot（M9 剧本里程碑）
- UI 呈现 archetype（RulerOverviewPanel 加 archetype 标签）（M10）
- 移除 realm.aiPersonality legacy 字段（M8.x）
- Opportunist/Zealot 名册扩展（M9）

## M9+ Deferred Items

以下功能明确延后，**不要在对应里程碑之前实现**：

- 兵种扩展（current 4 → design 6-9）（M9.x）
- 政令扩展（current 2 → design 20-40）（M9.x）
- 变法扩展（current 4 → design 5-8）（M9.x）
- 危机/氛围事件 100-200 数量级（M9.x）
- 会盟（春秋齐桓晋文式）机制（M9.x）
- 军功爵制度（M9.x）
- 变法窗口期限制（M9.x）
- 异族 frontier pressure 系统（M9.x）
- 春秋争霸前传 scenario（v1.x）
- 第二剧本（v2）
- 多语言（trad-CN / 英文）（v1.x）
- 玩家自定义起始日期沙盒（v2）
- 联姻 / 质子 / 朝聘（v1.x）
- 越/宋/鲁/中山 任一改 playable（M9.1）
- UI 面板（province/region/character browser）（M10）
- Scenario picker UI（M10）
