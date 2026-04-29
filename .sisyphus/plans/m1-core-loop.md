# M1 · 核心循环可玩

## TL;DR

> **核心目标**：让玩家扮演秦国，宣战邻国，调度军团征伐，最终独占所有邑实现"江山一统"。
>
> **交付物**：
> - 8 势力（七雄+周）+ ~50 邑的春秋战国简化地图（算法生成 + 历史名邑标签）
> - Realm/Army/War 三大数据模型（Faction LSP 重命名为 Realm + 字段扩充）
> - 行军/战斗/AI/胜利 四大引擎系统（替代 M0 painting）
> - 王宫面板 + 军事面板 + 右键上下文菜单 + 底栏导航
> - 玩家可在 30 分钟内完成一局（5 倍速无卡顿）
>
> **预估工作量**：4-6 周（roadmap §11.1）
> **并行执行**：是 - 5 个执行 wave（含 Wave 0 前置），峰值并发 7 任务
> **关键路径**：W0-T1（travel_cost）→ W1-T1/T2（schema/rename）→ W2-T1/T2（行军/战斗）→ W3-T2（系统接线）→ W4-T1（30 分钟回放）→ Final F1-F4 → 用户验收

---

## Context

### 原始请求

用户："编写 M1 计划"

### 设计文档锚点

- **`docs/design/11-roadmap.md` §4 · M1 · 核心循环可玩**：roadmap 硬约束
  - 4.1 目标："玩家可以扮演秦国，宣战韩国，派军占领韩的一座城，让它变成秦的颜色。"
  - 4.2 必须完成 / 4.3 不需要 / 4.4 验收标准：本计划严格遵循
- **`docs/design/02-map.md`**：邑邻接图（不是网格）+ 涂色规则
- **`docs/design/03-factions.md`**：8 势力主色考据（M1 用第 §2.2 表）
- **`docs/design/04-systems-military.md`**：军团是最小操作单位（M1 简化掉兵种/补给/战法）
- **`docs/design/06-scenarios.md`**：剧本数据驱动（M1 创建 warring_states 剧本最小子集）
- **`docs/design/09-ux-ui.md`**：底栏 8 入口（M1 仅启用 王宫 + 军事，其他灰显）
- **`docs/design/10-tech.md`**：栈/分层/Zod/Immer 锁定
- **`docs/design/12-historical-fidelity.md`**：地理红线——秦在西、楚在南、燕在北、齐在东不能错

### 面谈关键决策（13 项）

| # | 决策 | 选择 |
|---|------|------|
| Q1 | 战斗结算模型 | 守方 +30% 加成，兵力大者胜 |
| Q2 | 行军模型 | 基于 `MapEdge.travel_cost` |
| Q3 | 宣战模型 | 右键菜单一键宣战 + World 维护 wars 集合 |
| Q4 | 兵力来源 | 完全硬编码 + 战斗减员，无补员 |
| Q5 | 地图来源 | 算法生成 + 历史名邑标签 |
| Q6 | AI 节奏 | 每月（每 3 tick）摇骰 |
| Q7 | 测试策略 | TDD 全程 + 全任务 agent QA |
| Q8 | 玩家身份 | 硬编码 = 秦 |
| Q9 | 战斗持续 | 瞬时单 tick 结算 |
| Q10 | 数据模型 | LSP 升级 Faction → Realm |
| Q11 | 开局军团 | 每势力 2 军团 |
| Q12 | 退却行为 | 回起源邑（3 tick） |
| Q13 | 胜利条件 | 玩家独占所有邑 |

### Metis 审查应用（17 项）

> Metis 找到 3 个事实错误 + 14 个未地址的细节。计划已应用其推荐默认值并在 Success Summary 中披露。

**关键事实修正：**
- ❗ `MapEdge.travel_cost` **不存在**——必须新建（Wave 0 前置任务）
- ❗ painting 系统硬编码 `'faction_red'/'faction_blue'`——必须 **DELETE**，不是 rename
- ❗ App.tsx 的 `useAllRed()` 用 `displayName === '红'` 字符串匹配——必须按 `playerRealmId` 重写

**已应用 Metis 默认（详见 Success Summary）：**
- A1: travel_cost 加在 MapEdge | A2: ticks = travel_cost（M1 速度系数 = 1）| A3: wars = ReadonlyMap<string, true> 含 warKey()
- A4: 阶段链 [aiPlan, orderApply, march, combat, victoryCheck] | A5: 删除 painting/ 目录
- B1: 取消 pan/zoom（M2+）| B2: 保留 300ms 涂色过渡 | B3: TopBar 加国号+总兵 | B4: 保留 testid demo-complete
- B5: 极简事件横幅（XX 国占领了 YY）| C1-C8: 多军团/退却边缘场景规则
- D1: 确定性回放 M1 不测 | D2: ceil(defender×1.3) + floor(defender×0.5)

---

## Work Objectives

### 核心目标

让玩家通过键鼠操作、在 30 分钟内、扮演秦国、宣战诸国、派军征伐、最终把整个春秋战国地图涂成秦色（玄黑），形成完整的"中国版 EU4 雏形"手感。

### 具体交付物

1. **数据**：`src/content/m1/scenario.json`（8 realms × ~50 sites + initial armies + initial wars=空）
2. **共享类型**：`src/shared/types.ts` 扩充 Realm/Army/War + `src/shared/schemas.ts` 新建 M1DataSchema
3. **引擎系统**：
   - `src/engine/systems/march/` — 行军推进
   - `src/engine/systems/combat/` — 瞬时战斗结算
   - `src/engine/systems/ai/` — 80/20 AI 决策
   - `src/engine/systems/victory/` — 胜利检测
   - `src/engine/systems/orders/` — 玩家订单应用
   - `src/engine/phases/index.ts` — 阶段链常量
4. **UI 组件**：
   - `src/ui/components/BottomBar/` — 8 入口底栏（仅 王宫 + 军事 启用）
   - `src/ui/components/RealmOverviewPanel/` — 王宫面板
   - `src/ui/components/ArmyListPanel/` — 军事面板
   - `src/ui/components/SiteContextMenu/` — 右键上下文菜单
   - `src/ui/components/EventBanner/` — 极简事件横幅
   - 更新 `src/ui/components/TopBar/` — 加国号+总兵显示
5. **Rendering 扩展**：
   - `MapCanvas` 加点击与右键命中测试（point-in-polygon）
   - 加军团图标层（小圆点 + 兵力数）
   - 加选中军团高亮
6. **工具**：`tools/generate-m1-map.ts` — 50 邑生成 + 历史名邑标签 + 8 势力分配
7. **测试**：每个 system colocated `__tests__/` + 4 个新 e2e specs
8. **删除**：`src/engine/systems/painting/` 整个目录 + 相关 fixture

### Definition of Done

- [ ] `pnpm typecheck` 0 错误
- [ ] `pnpm lint` 0 警告
- [ ] `pnpm test` 全部通过（约 ~40 个 vitest spec）
- [ ] `pnpm test:e2e` 全部通过（含新 4 个 spec）
- [ ] `pnpm test:e2e e2e/m1-30min-playthrough.spec.ts` 通过——5 倍速 6 分钟壁钟无错无掉帧
- [ ] `pnpm build` 输出 dist/ 无错
- [ ] 手工玩通一局：选中秦国军团 → 右键韩邑 → 宣战并进军 → 抵达 → 占领；继续直到全图变玄黑 → 见"江山一统"横幅
- [ ] `boulder.json` `active_plan` 已切换为 `m1-core-loop.md`

### Must Have（不可协商）

- 8 势力（齐/楚/燕/韩/赵/魏/秦/周）地理位置正确（秦西/楚南/燕北/齐东）
- 玩家硬编码 = 秦
- 右键邑可弹出"进军"/"宣战并进军"菜单
- 行军必须按 `MapEdge.travel_cost` 计算 tick 数
- 战斗 = 瞬时 + 守方 ×1.3 + ceil/floor 取整
- 战败方退回起源邑（3 tick）
- AI = 每 3 tick 摇骰、80% 不动 / 20% 攻击邻邑
- 玩家独占全图 → 弹"江山一统"横幅 + `data-testid="demo-complete"`
- 引擎层不引入 React/Zustand/浏览器全局
- TDD：所有引擎逻辑先 RED 后 GREEN

### Must NOT Have（防 AI Slop · 全部来自 roadmap §4.3 + Metis）

- ❌ **兵种**（步车骑弩重步水军工兵）——M2 才考虑
- ❌ **地形修正**（平原丘陵山地林木...）——M2
- ❌ **关隘系统**（函谷虎牢...）——M2
- ❌ **将领 / 君主 / 人才**——M5
- ❌ **师出有名 / 战争借口** —— M2
- ❌ **议和 / 割地 / 朝贡**——M3
- ❌ **战疲 / 民望 / 威望** —— M2/M4
- ❌ **补给线 / 粮草** —— M2
- ❌ **攻城战 / 围城**——M2
- ❌ **完整外交（盟约/互不侵犯/互市）**——M3
- ❌ **内政 / 政令 / 经济 / 财政**——M4
- ❌ **文化 / 意识形态 / 学宫**——M6
- ❌ **谍报 / 间者**——M7
- ❌ **存档 / 读档 / IndexedDB**——M11
- ❌ **音乐 / 音效**——M10
- ❌ **史书百科 / 教程剧本**——M12
- ❌ **通知 L1-L4 完整系统**——M10（M1 仅极简横幅）
- ❌ **camera pan/zoom**——M2
- ❌ **多选军团 / 拖框选**——M2
- ❌ **军团自动合并**——保持独立
- ❌ **基于 realm.traits / realm.aiPersonality / realm.fullTitle / realm.capital 的差异化逻辑**——M1 全部 8 国走相同代码路径
- ❌ **手工编写 50 邑 JSON**——必须算法生成
- ❌ **保留 / rename `src/engine/systems/painting/`**——必须 **DELETE**

---

## Verification Strategy

> **零人工干预**——所有验证由 agent 执行命令完成。

### 测试决策

- **基础设施**：已存在（M0 已建）——vitest + Playwright + jsdom + testing-library
- **自动化测试**：YES (TDD)——所有引擎任务 RED-GREEN-REFACTOR；UI 任务先写 component test
- **框架**：vitest（单测） + Playwright（e2e）
- **新增 e2e specs**：
  - `e2e/m1-context-menu.spec.ts` — 右键菜单
  - `e2e/m1-march-conquest.spec.ts` — 完整征伐路径
  - `e2e/m1-ai-behavior.spec.ts` — AI 决策可观察
  - `e2e/m1-30min-playthrough.spec.ts` — 30 分钟回放（关键交付）
  - `e2e/m1-victory.spec.ts` — 江山一统横幅

### 测试守门（M0 沿用）

- `src/__tests__/banned-deps.test.ts`——禁止 date-fns/dayjs/lodash 等
- `src/__tests__/no-any.test.ts`——禁止 `as any` / `@ts-ignore`
- `src/engine/__tests__/architecture-purity.test.ts`——引擎不能 import react/zustand/browser globals

### QA 政策

每个任务必须含 agent 可执行 QA scenarios，证据保存到 `.sisyphus/evidence/m1-task-{N}-{slug}.{ext}`。

- **前端 / UI**：Playwright（playwright skill）—— 启动浏览器、点击、断言 DOM、截图
- **TUI / CLI**：interactive_bash（tmux）——运行命令、断言输出
- **API / 引擎逻辑**：Bash（vitest CLI）——`pnpm test path/to/spec.ts` + grep 输出

---

## Execution Strategy

### 并行执行 Wave

> 5 个 wave（含前置 W0）。每 wave 内任务尽量并行，但 W1 含两个子阶段（关键类型必须先于其消费者）。

```
Wave 0 (前置 · 解决 Metis 发现的事实错误):
└── T0.1: MapEdge.travel_cost 字段引入 [quick] [关键路径起点]

Wave 1 阶段 A (类型基础 · 串行 · 必须先完成):
└── T1.1: Faction → Realm LSP 重命名 + ArmyId/ArmyTemplate 占位 + Realm 字段扩充 [quick] (依赖 T0.1)

Wave 1 阶段 B (5 任务并行):
├── T1.2: Army runtime / Order / War 共享类型与 schema [quick] (依赖 T1.1)
├── T1.4: 删除 painting/ + 阶段链常量 phases/index.ts [quick] (依赖 T1.1)
├── T1.5: tools/generate-m1-map.ts 算法生成器 [unspecified-high] (依赖 T1.1)
├── T1.7: warKey + wars 工具函数 [quick] (依赖 T1.1)
└── T1.8: 底栏组件 BottomBar 骨架 [quick] (无依赖，可与 T1.1 并行)

Wave 1 阶段 C (T1.2 完成后):
└── T1.3: M1DataSchema + WorldSchema 运行时校验 [quick] (依赖 T1.1, T1.2)

Wave 1 阶段 D (T1.5 完成后, 串行因需用户验收):
└── T1.6: src/content/m1/scenario.json 历史名邑标签人工合规审查 [unspecified-high · 需用户验收] (依赖 T1.5)

Wave 2 (核心系统 · 7 任务并行):
├── T2.1: combat 系统 + 瞬时结算 + 单测 [deep] (依赖 T1.2)
├── T2.2: march 系统 + travel_cost 推进 + 单测 [deep] (依赖 T0.1, T1.2, T1.7)
├── T2.3: ai 系统 + 80/20 决策 + 邻邑过滤 + 确定性测试 [deep] (依赖 T1.2, T1.7)
├── T2.4: victory 系统 + 胜利检测 [quick] (依赖 T1.1)
├── T2.5: orders 系统 + 玩家命令应用 [unspecified-high] (依赖 T1.2, T1.7)
├── T2.6: MapCanvas 点击/右键命中测试（point-in-polygon） [unspecified-high]
└── T2.7: ui store 扩充 selectedArmyId / contextMenu / playerRealmId [quick] (依赖 T1.1)

Wave 3 (集成与 UI · 7 任务并行):
├── T3.1: 阶段链接线到 factory.ts + raf-driver 串联 [deep] (依赖 T2.1, T2.2, T2.3, T2.4, T2.5)
├── T3.2: SiteContextMenu 右键菜单组件 [visual-engineering] (依赖 T2.6, T2.7)
├── T3.3: ArmyListPanel 军事面板 [visual-engineering] (依赖 T2.7)
├── T3.4: RealmOverviewPanel 王宫面板 [visual-engineering] (依赖 T2.7)
├── T3.5: EventBanner 极简事件横幅 [visual-engineering] (依赖 T2.7)
├── T3.6: TopBar 加国号 + 总兵显示 [quick] (依赖 T2.7)
└── T3.7: MapCanvas 军团图标渲染层 + 选中高亮 [visual-engineering] (依赖 T2.7)

Wave 4 (端到端验证 · 4 任务):
├── T4.1: e2e m1-context-menu.spec.ts [unspecified-high] (依赖 W3 全部)
├── T4.2: e2e m1-march-conquest.spec.ts [unspecified-high] (依赖 W3 全部)
├── T4.3: e2e m1-ai-behavior.spec.ts [unspecified-high] (依赖 W3 全部)
└── T4.4: e2e m1-30min-playthrough.spec.ts + m1-victory.spec.ts [unspecified-high] (依赖 W3 全部)

Wave Final (4 个并行审查 + 用户验收):
├── F1: 计划合规审计 [oracle]
├── F2: 代码质量审查 [unspecified-high]
├── F3: 真实手工 QA 执行 [unspecified-high + playwright skill]
└── F4: 范围保真度检查 [deep]
→ 呈现结果 → 等待用户明确"okay"
```

### 关键路径

```
T0.1 (travel_cost) → T1.1 (Realm) → T2.2 (march) → T3.1 (阶段接线) → T4.4 (30min) → F1-F4 → 用户验收
```

### 并行加速估算

- Wave 1：8 并发，串行需 ~12-15 task-day → 并行 ~3 day
- Wave 2：7 并发，串行需 ~14 task-day → 并行 ~3 day
- Wave 3：7 并发，串行需 ~10 task-day → 并行 ~2 day
- 总并行加速：~70%（约 4 周完成 vs 串行 ~10 周）

### 依赖矩阵（精简版 - 完整版见每任务 Parallelization 字段）

| Task | 依赖 | 阻塞 |
|------|------|------|
| T0.1 | - | T1.1, T2.2 |
| T1.1 | T0.1 | T1.2, T1.3, T1.4, T1.5, T1.7, T2.4, T2.7 |
| T1.2 | T1.1 | T1.3, T2.1, T2.2, T2.3, T2.5 |
| T1.3 | T1.1, T1.2 | T2.* |
| T1.4 | T1.1 | T3.1 |
| T1.5 | T1.1 | T1.6 |
| T1.6 | T1.5 | W2 全部（无内容无法测试） |
| T1.7 | T1.1 | T2.2, T2.3, T2.5 |
| T1.8 | - | T3.* |
| T2.* | T1.* | T3.* |
| T3.1 | T2.1-T2.5 | W4 全部 |
| T3.2-T3.7 | T2.6, T2.7 | W4 全部 |
| W4 | W3 全部 | F1-F4 |

### Agent 调度摘要

- **Wave 0**：1 任务 — `quick`
- **Wave 1**：8 任务 — T1.1/T1.4/T1.7/T1.8 → `quick`；T1.2/T1.3 → `quick`；T1.5/T1.6 → `unspecified-high`
- **Wave 2**：7 任务 — T2.1/T2.2/T2.3 → `deep`；T2.5/T2.6 → `unspecified-high`；T2.4/T2.7 → `quick`
- **Wave 3**：7 任务 — T3.1 → `deep`；T3.2-T3.5/T3.7 → `visual-engineering`；T3.6 → `quick`
- **Wave 4**：4 任务 — `unspecified-high`（含 `playwright` skill）
- **Final**：F1 → `oracle`；F2/F3 → `unspecified-high`；F4 → `deep`

---

## TODOs

> 实现 + 测试 = 一个任务，不可分离。
> 每任务必须有：Recommended Agent Profile + Parallelization + QA Scenarios。
> **没有 QA Scenarios 的任务 = 不完整任务。无例外。**

### Wave 0 · 前置事实修正

- [x] 0.1 **MapEdge 引入 travel_cost 字段（解决 Metis 发现的关键事实错误）**

  **What to do**:
  - 在 `src/shared/types.ts` 的 `MapEdge` interface 添加 `readonly travel_cost: number` 字段
  - 在 `src/shared/schemas.ts` 的 `MapEdgeSchema` 添加 `travel_cost: z.number().int().min(1).max(10)` 校验
  - 在 `tools/generate-m0-map.ts` 的 edge 输出处，按欧氏距离 / 缩放因子计算 `travel_cost = Math.max(1, Math.round(distance / 100))`，注入每条 edge
  - 重新生成 `src/content/m0/sites.json`（M0 数据保持向后兼容）
  - 在 `src/content/m0/__tests__/sites.test.ts` 添加 invariant：`expect(edge.travel_cost).toBeGreaterThanOrEqual(1)`

  **Must NOT do**:
  - 不要把 travel_cost 写在 site 上（per Metis Q-A1：在 edge 上）
  - 不要在引擎层计算 travel_cost（保持纯数据，引擎只读）
  - 不要为 M0 数据回填非整数 travel_cost（保持 1-10 整数范围）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件 schema 改动 + JSON 重生成 + 1 个 invariant 测试，纯增量
  - **Skills**: []
    - 无需特殊 skill

  **Parallelization**:
  - **Can Run In Parallel**: NO（关键路径起点）
  - **Parallel Group**: Wave 0 单任务
  - **Blocks**: T1.1（Realm 类型）、T1.3（M1DataSchema）、T2.2（march 系统）
  - **Blocked By**: 无（可立即开始）

  **References**:

  *Pattern References*:
  - `src/shared/types.ts:19-26` - MapEdge interface 现状（id/curveType/anchors/controls？）
  - `src/shared/schemas.ts:9-25` - MapEdgeSchema 现状
  - `tools/generate-m0-map.ts:199-228` - 当前 edge 生成逻辑（缺 travel_cost）

  *Test References*:
  - `src/content/m0/__tests__/sites.test.ts:1-67` - 现有 invariant 测试模板（边 cardinality ≤ 2、reverse 标记对偶）

  *External References*:
  - 无

  **WHY Each Reference Matters**:
  - `MapEdge` 是边索引架构核心；M0.2 计划明确 §"❌ Edge 的额外属性（type/passable/river — M2+ 才考虑）"——travel_cost 是 M1 必须打开的口子
  - 当前 edge 生成已计算 anchor 距离（L211-220 区域），可直接复用为 travel_cost 输入
  - sites.test.ts 的 invariant 测试是新规则验证的范例，照着加

  **Acceptance Criteria**:

  - [ ] `pnpm typecheck` PASS（新字段类型一致）
  - [ ] `pnpm test src/shared/__tests__/schemas.test.ts` PASS（schema 接受合法、拒绝 < 1 或 > 10）
  - [ ] `pnpm test src/content/m0/__tests__/sites.test.ts` PASS（每条 edge.travel_cost ≥ 1）
  - [ ] 重生成的 `src/content/m0/sites.json` 中所有 16 条边都有 `travel_cost: <integer>`
  - [ ] `pnpm test src/engine/world/__tests__/factory.test.ts` PASS（不应破坏现有 World 构建）

  **QA Scenarios**:

  ```
  Scenario: travel_cost 字段被 schema 接受
    Tool: Bash (vitest)
    Preconditions: src/shared/schemas.ts 已添加 travel_cost
    Steps:
      1. 运行 `pnpm test src/shared/__tests__/schemas.test.ts` 
      2. grep 输出含 "travel_cost"
    Expected Result: schemas.test.ts 全绿，至少 1 个新测试 case 涉及 travel_cost
    Failure Indicators: "Expected number, received undefined" → 字段未传入 schema
    Evidence: .sisyphus/evidence/m1-task-0.1-schema-pass.txt

  Scenario: 非法 travel_cost 被 schema 拒绝
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 临时构造一份 fixture：edge with travel_cost: 0
      2. 调用 MapEdgeSchema.safeParse(fixture)
      3. 断言 .success === false
    Expected Result: 校验失败，错误信息含 "min" 或 "greater than"
    Failure Indicators: success: true → schema 没有 min(1) 约束
    Evidence: .sisyphus/evidence/m1-task-0.1-schema-reject.txt

  Scenario: 重生成的 sites.json 含 travel_cost
    Tool: Bash
    Preconditions: tools/generate-m0-map.ts 已更新
    Steps:
      1. 运行 `pnpm tsx tools/generate-m0-map.ts`
      2. 运行 `node -e "const d = require('./src/content/m0/sites.json'); console.log(Object.values(d.edges).every(e => typeof e.travel_cost === 'number' && e.travel_cost >= 1))"`
    Expected Result: 输出 true
    Failure Indicators: false 或 undefined → 生成器未注入字段
    Evidence: .sisyphus/evidence/m1-task-0.1-regenerated.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-0.1-schema-pass.txt` — vitest schema 全绿输出
  - [ ] `.sisyphus/evidence/m1-task-0.1-schema-reject.txt` — schema 拒绝非法输入证据
  - [ ] `.sisyphus/evidence/m1-task-0.1-regenerated.txt` — `node -e ...` 输出

  **Commit**: YES (groups with 0)
  - Message: `feat(map): add travel_cost field to MapEdge`
  - Files: `src/shared/types.ts`, `src/shared/schemas.ts`, `tools/generate-m0-map.ts`, `src/content/m0/sites.json`, `src/content/m0/__tests__/sites.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/shared src/content`

### Wave 1 · 基础设施

- [x] 1.1 **Faction → Realm LSP 重命名 + 类型扩充 + ArmyId/ArmyTemplate 占位**

  **What to do**:
  - 使用 `lsp_rename` 在 `src/shared/types.ts` 把 `Faction` 重命名为 `Realm`、`FactionId` 为 `RealmId`，让 LSP 自动传播
  - 手工搜索并替换字符串字面量：`grep -r "'faction_"` → 改为 `'realm_'`（**LSP 看不到字符串字面量**——这是 Metis 标记的 critical risk）
  - 添加新的 ID 别名（沿用项目现有 `string` 别名风格，**不是** `OpaqueId<TBrand>` —— 项目并没有该模板）：
    ```typescript
    // 沿用 SiteId/RealmId 同样的 plain string alias 风格
    export type ArmyId = string  // opaque, e.g. 'army_qin_1'
    ```
  - 添加 `ArmyTemplate` 类型（最小占位，让 Realm.initialArmies 可在本任务编译；完整 `Army` runtime 类型在 T1.2 添加）：
    ```typescript
    export interface ArmyTemplate {
      readonly id: ArmyId
      readonly manpower: number
      readonly location: SiteId
    }
    ```
  - 重命名后扩充 `Realm` 接口字段：
    ```typescript
    interface Realm {
      readonly id: RealmId
      readonly displayName: string  // 保留作为简短国号（"秦"）
      readonly fullTitle: string    // 新增（"秦国"）
      readonly color: string
      readonly capital: SiteId      // 新增
      readonly initialSites: readonly SiteId[]  // 新增
      readonly initialArmies: readonly ArmyTemplate[]  // 新增（ArmyTemplate 在本任务一并添加）
      readonly aiPersonality: 'aggressive_random'  // 新增（M1 仅一种）
    }
    ```
  - 同步更新 `src/shared/schemas.ts` 的 schema（FactionSchema → RealmSchema），并加 `ArmyTemplateSchema`
  - 更新 `src/content/m0/sites.json` 的 `factions[]` → `realms[]`，每个对象加 `fullTitle: "红方"/"蓝方"`、`capital: <第一个邑>`、`initialSites: [<所有该方邑>]`、`initialArmies: []`、`aiPersonality: "aggressive_random"`
  - 同步更新 `initialOwnership` 的 RealmId 引用
  - 在 `src/__tests__/banned-deps.test.ts` 或新增测试中加 grep guard：`expect(repoSrc).not.toMatch(/'faction_/)` 防回归

  **Must NOT do**:
  - 不要保留 Faction 别名（`type Faction = Realm`）——会让词汇分裂在 M2+ 持续
  - 不要在重命名同时扩充其他无关字段（traits 等）——只加 M1 必需 6 字段
  - 不要在 src/engine 引入分支逻辑基于 `aiPersonality`/`fullTitle`/`capital`——M1 这些是数据，不是行为开关（per Metis Q-B6 反 slop）
  - 不要修改 `src/content/m0/__tests__/sites.test.ts` 中 testid 期望值（这些 e2e 测试还活着）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: LSP 重命名 + 字段扩充本质是机械化重构，无新算法
  - **Skills**: []
    - 无需特殊 skill

  **Parallelization**:
  - **Can Run In Parallel**: NO（其他 W1 任务依赖此重命名）
  - **Parallel Group**: Wave 1 串行起点（必须先完成）
  - **Blocks**: T1.3, T1.4, T2.4, T2.7
  - **Blocked By**: T0.1

  **References**:

  *Pattern References*:
  - `src/shared/types.ts:49-54` - 现 Faction interface（id/displayName/color）
  - `src/shared/schemas.ts:39-43` - 现 FactionSchema
  - `src/content/m0/sites.json:752-768` - 现 factions[] 结构
  - `src/App.tsx:9-24` - useAllRed 用 displayName === '红' 字符串匹配——本任务后还能编译，但 T2.4 victory 系统会重写它

  *External References*:
  - LSP rename 工具用法：内置 `lsp_rename(filePath, line, character, newName)`

  **WHY Each Reference Matters**:
  - 字符串字面量是 Metis 强调的关键风险：LSP 不会重命名 `'faction_red'`、`'faction_blue'`、`'红'` 这类字面量。必须 grep 全库手工改
  - banned-deps.test.ts 提供了 src 全文扫描的范式，照着加 anti-`'faction_'` guard

  **Acceptance Criteria**:

  - [ ] `grep -r "Faction" src/ --include='*.ts' --include='*.tsx'` 输出仅包含变更前的 git history 标记，无活跃使用
  - [ ] `grep -r "'faction_" src/` 输出为空
  - [ ] `pnpm typecheck` PASS
  - [ ] `pnpm lint` PASS
  - [ ] `pnpm test` 全绿（含 architecture-purity、banned-deps、no-any）

  **QA Scenarios**:

  ```
  Scenario: Faction 标识符在源码中已彻底替换为 Realm
    Tool: Bash (grep + node)
    Preconditions: T1.1 实施完成
    Steps:
      1. 运行 `grep -rn "\\bFaction\\b" src/ --include='*.ts' --include='*.tsx' | grep -v "// " > .sisyphus/evidence/m1-task-1.1-faction-grep.txt`
      2. 断言文件大小为 0 字节（或仅含历史 doc 注释）
    Expected Result: 空输出或仅含明确解释为旧名的注释
    Failure Indicators: 任何活跃 import/export/type usage 仍叫 Faction → LSP rename 不彻底
    Evidence: .sisyphus/evidence/m1-task-1.1-faction-grep.txt

  Scenario: 字符串字面量 'faction_*' 已替换为 'realm_*'
    Tool: Bash
    Preconditions: 同上
    Steps:
      1. 运行 `grep -rn "'faction_" src/ > .sisyphus/evidence/m1-task-1.1-string-grep.txt`
      2. 断言空
    Expected Result: 空文件
    Failure Indicators: 任何 'faction_red'/'faction_blue' 残留
    Evidence: .sisyphus/evidence/m1-task-1.1-string-grep.txt

  Scenario: 全套测试在重命名后仍然通过
    Tool: Bash (vitest + playwright)
    Preconditions: 同上
    Steps:
      1. 运行 `pnpm typecheck && pnpm lint && pnpm test`
      2. 抓取退出码
    Expected Result: 退出码 0
    Failure Indicators: 任何 spec FAIL 或类型错误
    Evidence: .sisyphus/evidence/m1-task-1.1-test-all.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-1.1-faction-grep.txt`
  - [ ] `.sisyphus/evidence/m1-task-1.1-string-grep.txt`
  - [ ] `.sisyphus/evidence/m1-task-1.1-test-all.txt`

  **Commit**: YES (groups with 1)
  - Message: `refactor(types): rename Faction to Realm and expand fields`
  - Files: `src/shared/types.ts`, `src/shared/schemas.ts`, `src/content/m0/sites.json`, `src/__tests__/banned-deps.test.ts`, 所有 LSP 自动改的下游文件
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test`

- [x] 1.2 **Army runtime 类型 / Order / War 共享类型与 schema**

  **What to do**:
  - **注**：`ArmyId` 与 `ArmyTemplate` 已在 T1.1 添加（让 Realm.initialArmies 字段编译过）。本任务**扩充**为完整 runtime Army 模型 + Order + War 类型。
  - 在 `src/shared/types.ts` 添加：
    ```typescript
    // ArmyId / ArmyTemplate 已在 T1.1 引入，这里只新增 ArmyState 与 runtime Army
    export type ArmyState = 'idle' | 'marching' | 'retreating'

    export interface Army {
      readonly id: ArmyId
      readonly realmId: RealmId
      readonly manpower: number
      readonly location: SiteId       // 当前所在邑（无论 state）
      readonly state: ArmyState
      readonly destination: SiteId | null  // marching/retreating 时填，idle 时 null
      readonly ticksRemaining: number  // 0 当 idle；marching/retreating 时倒计
      readonly source: SiteId | null   // retreating 时使用，idle/marching 时 null
    }

    export type OrderType = 'march' | 'declareWarAndMarch'

    export interface Order {
      readonly type: OrderType
      readonly armyId: ArmyId
      readonly targetSiteId: SiteId
    }

    // WarKey 由 T1.7 定义具体格式与工具函数；这里仅声明别名以便类型引用
    export type WarKey = string  // formatted as `${minRealmId}:${maxRealmId}`
    ```
  - 在 `src/shared/schemas.ts` 添加：`ArmySchema`、`ArmyStateSchema`、`OrderSchema`、`OrderTypeSchema`（注：`ArmyTemplateSchema` 已在 T1.1 引入）
  - 在 `src/shared/__tests__/schemas.test.ts` 添加各 schema 的合法/非法用例（每 schema 至少 3 个）

  **Must NOT do**:
  - 不要在 Army 上加 unit_type/morale/experience/supply/commander 字段（M2+）
  - 不要在 Order 上加 priority/timestamp/issuer 字段（YAGNI）
  - 不要让 Army.location 与 destination 同时为 null（idle 时 location 必填）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯类型/schema 添加，无业务逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T1.5、T1.8 并行；T1.7 因复用 RealmId 也可并行）
  - **Parallel Group**: Wave 1 阶段二
  - **Blocks**: T1.3, T2.1, T2.2, T2.3, T2.5
  - **Blocked By**: T1.1（依赖 RealmId、ArmyId、ArmyTemplate）

  **References**:

  *Pattern References*:
  - `src/shared/types.ts:1-9` - 项目使用 `string` plain alias 风格（SiteId/FactionId/Vec2），**不是** `OpaqueId<TBrand>` 模板
  - `src/shared/types.ts:42-47` - Site interface（参照风格 readonly + immutable）
  - `src/shared/schemas.ts:27-37` - SiteSchema 风格

  *External References*:
  - `docs/design/04-systems-military.md` §4.1 - 军团 schema 完整版（M1 子集）

  **WHY Each Reference Matters**:
  - OpaqueId 是项目的核心 ID 模式，新加 ArmyId 必须沿用
  - 设计文档 §4.1 列出了"完整军团"字段——M1 只取最小子集（id/realmId/manpower/location/state/destination/ticksRemaining/source）

  **Acceptance Criteria**:

  - [ ] `pnpm typecheck` PASS
  - [ ] `pnpm lint` PASS
  - [ ] `pnpm test src/shared/__tests__/schemas.test.ts` PASS（≥ 9 个新测试 case，每 schema 3 个）
  - [ ] `Army`、`ArmyId`、`ArmyState`、`ArmyTemplate`、`Order`、`OrderType` 全部从 src/shared/index.ts 导出

  **QA Scenarios**:

  ```
  Scenario: Army schema 接受合法军团并拒绝非法
    Tool: Bash (vitest)
    Preconditions: T1.2 实施完成
    Steps:
      1. 运行 `pnpm test src/shared/__tests__/schemas.test.ts -t "Army"`
      2. 抓取测试输出
    Expected Result: ≥ 6 个 Army 相关 case 全绿（3 合法 + 3 非法）
    Failure Indicators: 任何 case 红，或 schema 接受 manpower < 0
    Evidence: .sisyphus/evidence/m1-task-1.2-army-schema.txt

  Scenario: Order schema 强制 type ∈ {march, declareWarAndMarch}
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 调用 OrderSchema.safeParse({ type: 'invalid', armyId: '...', targetSiteId: '...' })
      2. 断言 .success === false
    Expected Result: 拒绝
    Failure Indicators: 接受未定义 type
    Evidence: .sisyphus/evidence/m1-task-1.2-order-schema.txt

  Scenario: ArmyState 枚举仅含 idle/marching/retreating
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 调用 ArmyStateSchema.safeParse('engaged')
      2. 断言 .success === false（M2+ 状态不允许）
    Expected Result: 拒绝
    Failure Indicators: 接受非 M1 状态值
    Evidence: .sisyphus/evidence/m1-task-1.2-state-enum.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-1.2-army-schema.txt`
  - [ ] `.sisyphus/evidence/m1-task-1.2-order-schema.txt`
  - [ ] `.sisyphus/evidence/m1-task-1.2-state-enum.txt`

  **Commit**: YES (groups with 1)
  - Message: `feat(types): add Army, Order, War shared types and schemas`
  - Files: `src/shared/types.ts`, `src/shared/schemas.ts`, `src/shared/__tests__/schemas.test.ts`, `src/shared/index.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/shared`

- [x] 1.3 **M1DataSchema + WorldSchema 运行时校验**

  **What to do**:
  - 在 `src/shared/schemas.ts` 新建：
    ```typescript
    export const M1DataSchema = z.object({
      edges: z.record(z.string(), MapEdgeSchema),
      sites: z.array(RawSiteSchema),
      realms: z.array(RealmSchema),
      initialOwnership: z.record(z.string(), z.string()),
      // M0 没有的：
      initialArmies: z.array(ArmySchema),  // realm.initialArmies 已含 template，这里是落地后的实例
      initialWars: z.array(z.object({ a: z.string(), b: z.string() })),  // 一般为空
    })

    export type M1Data = z.infer<typeof M1DataSchema>

    export const WorldSchema = z.object({
      sites: z.map(z.string(), SiteSchema),  // runtime sites
      realms: z.map(z.string(), RealmSchema),
      armies: z.map(z.string(), ArmySchema),
      edges: z.map(z.string(), MapEdgeSchema),
      wars: z.map(z.string(), z.literal(true)),  // warKey → true
      playerRealmId: z.string(),
      rngState: z.object({ state: z.number() }),
    })
    ```
  - 在 `src/engine/world/factory.ts` 新建 `createWorldFromM1Data(data: M1Data, seed: number, playerRealmId: RealmId): World` 函数（与现有 `createWorldFromM0Data` 并列）
  - 旧 `createWorldFromM0Data` 保留以便兼容现有 painting 测试（painting 删除前过渡）
  - 在 `src/shared/__tests__/schemas.test.ts` 加 ≥ 5 个 M1DataSchema 用例（合法 + initialOwnership 引用未知 realm 拒绝 + sites 引用未知 edge 拒绝 等）

  **Must NOT do**:
  - 不要在 WorldSchema 中校验 World.events（运行时易变）
  - 不要让 M1DataSchema 兼容 M0Data（不同剧本不同 schema，正是 06-scenarios.md 的设计）
  - 不要在 schema 里塞业务规则校验（如 manpower > 0），数据完整性 > 业务规则

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: schema 与工厂函数都是机械化代码
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO（依赖 T1.1 + T1.2 完成）
  - **Parallel Group**: Wave 1 阶段二
  - **Blocks**: 全部 Wave 2 任务
  - **Blocked By**: T1.1, T1.2

  **References**:

  *Pattern References*:
  - `src/shared/schemas.ts:45-50` - M0DataSchema 现状
  - `src/engine/world/factory.ts:59-110` - createWorldFromM0Data 现状
  - `src/engine/world/__tests__/factory.test.ts:1-72` - 工厂测试范式

  **Acceptance Criteria**:
  - [ ] `pnpm typecheck` PASS
  - [ ] `pnpm test src/shared/__tests__/schemas.test.ts` 含 ≥ 5 个 M1DataSchema case，全绿
  - [ ] `pnpm test src/engine/world/__tests__/factory.test.ts` 含新的 `createWorldFromM1Data` 测试，全绿
  - [ ] WorldSchema 接受合法 World 对象、拒绝缺字段对象

  **QA Scenarios**:

  ```
  Scenario: M1DataSchema 拒绝 initialOwnership 引用未知 realm
    Tool: Bash (vitest)
    Preconditions: T1.3 实施完成
    Steps:
      1. 构造 fixture：realms 含 ['qin']，initialOwnership 含 site_a → 'unknown_realm'
      2. 调用 M1DataSchema.safeParse(fixture)
      3. 断言 .success === false 或后续业务校验失败
    Expected Result: 拒绝（schema 层或工厂层均可）
    Failure Indicators: 接受未知 realm 引用 → 跑通后会运行时崩
    Evidence: .sisyphus/evidence/m1-task-1.3-unknown-realm.txt

  Scenario: createWorldFromM1Data 构建合法 World
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 用 fixture（2 realms × 1 site each + 1 边 + 2 armies）调用 createWorldFromM1Data
      2. 断言 world.realms.size === 2、world.armies.size === 2、world.wars.size === 0
    Expected Result: 全部断言通过
    Failure Indicators: 任何 size 不匹配
    Evidence: .sisyphus/evidence/m1-task-1.3-factory-build.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-1.3-unknown-realm.txt`
  - [ ] `.sisyphus/evidence/m1-task-1.3-factory-build.txt`

  **Commit**: YES (groups with 1)
  - Message: `feat(schemas): introduce M1DataSchema with runtime validation`
  - Files: `src/shared/schemas.ts`, `src/engine/world/factory.ts`, `src/shared/__tests__/schemas.test.ts`, `src/engine/world/__tests__/factory.test.ts`, `src/shared/index.ts`, `src/engine/world/index.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test`

- [x] 1.4 **删除 painting/ 系统 + 阶段链常量 phases/index.ts**

  **What to do**:
  - **删除**整个目录 `src/engine/systems/painting/`（painting.ts + index.ts + __tests__/painting.test.ts）
  - 在 `src/engine/world/factory.ts:108` 把 `phases: [paintingStep]` 改为 `phases: []`（暂时空，T3.1 接线）
  - 新建 `src/engine/phases/index.ts` 暴露阶段名常量：
    ```typescript
    export const PHASE_NAMES = {
      AI_PLAN: 'aiPlan',
      ORDER_APPLY: 'orderApply',
      MARCH: 'march',
      COMBAT: 'combat',
      VICTORY_CHECK: 'victoryCheck',
    } as const

    export const PHASE_ORDER: readonly string[] = [
      PHASE_NAMES.AI_PLAN,
      PHASE_NAMES.ORDER_APPLY,
      PHASE_NAMES.MARCH,
      PHASE_NAMES.COMBAT,
      PHASE_NAMES.VICTORY_CHECK,
    ]
    ```
  - 在 `src/engine/phases/__tests__/index.test.ts` 加 ≥ 3 个测试：常量值正确、PHASE_ORDER 不可变、长度恒定 = 5
  - 删除 `src/__tests__/banned-deps.test.ts` 和 `src/engine/__tests__/architecture-purity.test.ts` 中针对 painting 的引用（如有）
  - 更新 `src/engine/systems/index.ts`（如存在）移除 painting 导出

  **Must NOT do**:
  - 不要把 painting 重命名为 combat——干净删，避免 git history 混淆
  - 不要在 phases/index.ts 里实现具体 step——只是常量声明
  - 不要保留任何 `'faction_red'` / `'faction_blue'` 字符串引用（T1.1 已统一为 'realm_*'）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T1.5/T1.6/T1.7/T1.8 并行）
  - **Parallel Group**: Wave 1 阶段二
  - **Blocks**: T3.1（系统接线）
  - **Blocked By**: T1.1（依赖 Realm 重命名让 factory.ts 类型一致）

  **References**:

  *Pattern References*:
  - `src/engine/systems/painting/painting.ts:1-59` - 完整文件待删
  - `src/engine/systems/painting/__tests__/painting.test.ts:1-136` - 完整测试待删
  - `src/engine/world/factory.ts:108` - phases 数组挂载点
  - `src/shared/types.ts:80-83` - TickPhase 签名（保留，新阶段沿用）

  **Acceptance Criteria**:
  - [ ] `ls src/engine/systems/painting` → 不存在
  - [ ] `grep -r "paintingStep\|painting" src/ --include='*.ts' --include='*.tsx'` → 无活跃引用
  - [ ] `pnpm typecheck` PASS
  - [ ] `pnpm test src/engine/phases` → ≥ 3 测试全绿
  - [ ] `pnpm test src/engine` → 全绿（factory.test.ts 已更新 phases 期望）

  **QA Scenarios**:

  ```
  Scenario: painting 目录已彻底删除
    Tool: Bash
    Preconditions: T1.4 实施完成
    Steps:
      1. 运行 `ls src/engine/systems/painting 2>&1 | tee .sisyphus/evidence/m1-task-1.4-deleted.txt`
      2. 断言输出含 "No such file" 或类似
    Expected Result: 目录不存在
    Failure Indicators: ls 列出文件 → 删除失败
    Evidence: .sisyphus/evidence/m1-task-1.4-deleted.txt

  Scenario: PHASE_ORDER 常量包含全部 5 个阶段名
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 运行 `pnpm test src/engine/phases/__tests__/index.test.ts`
      2. grep 输出含 "5 passed"
    Expected Result: 测试全绿
    Failure Indicators: 任何 case 红
    Evidence: .sisyphus/evidence/m1-task-1.4-phase-order.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-1.4-deleted.txt`
  - [ ] `.sisyphus/evidence/m1-task-1.4-phase-order.txt`

  **Commit**: YES (groups with 1)
  - Message: `chore(engine): delete painting system and add phase chain constants`
  - Files: `src/engine/systems/painting/` (deleted), `src/engine/phases/index.ts` (new), `src/engine/phases/__tests__/index.test.ts` (new), `src/engine/world/factory.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test`

- [x] 1.5 **tools/generate-m1-map.ts 算法生成器**

  **What to do**:
  - 新建 `tools/generate-m1-map.ts`（参考 `tools/generate-m0-map.ts` 风格但参数化 + 8 势力分配逻辑）
  - 关键参数：`N_SITES = 50`, `N_REALMS = 8`, `MAP_WIDTH = 800`, `MAP_HEIGHT = 600`, `SEED = 0xc0ffee`
  - 算法骨架：
    1. d3-delaunay 生成 50 个 Voronoi 多边形 + Lloyd 松弛（沿用 M0 流程）
    2. 切分地图为 5 大区：西（秦）、南（楚）、东（齐）、北（燕）、中（韩/赵/魏/周）
    3. 给每个邑分配 realm 按其重心所在区——周仅占 1-2 邑（中央洛邑附近），其余 ≥5 ≤10
    4. 为每条 edge 计算 `travel_cost = Math.max(1, Math.round(distance(anchor1, anchor2) / 80))`
    5. 验证：BFS 闭包检查（任意 1 邑出发可达全部）；如失败则换 SEED 重试
    6. 输出 `src/content/m1/scenario.json`，含 edges/sites/realms（带 placeholder name）/initialOwnership/initialArmies（每 realm 2 军团：1 在首都、1 在第二邑）/initialWars: []
  - 在 `package.json` 加 `"generate:m1-map": "tsx tools/generate-m1-map.ts"`
  - 在 `tools/README.md` 加章节描述 M1 生成器
  - 在 `tools/__tests__/generate-m1-map.test.ts` 加 invariant 测试（如可单测）；至少：BFS 全连通、8 realm 至少各 5 邑、travel_cost ≥ 1

  **Must NOT do**:
  - 不要在生成器中给邑命名历史名称（T1.6 人工标签）——这里只用 placeholder `site_001..site_050`
  - 不要在 `src/` 中 import d3-delaunay（`banned-deps.test.ts` 守门——只允许在 tools/ 中）
  - 不要让分区比例失衡（不应出现某 realm 1 邑或另一 realm 30 邑）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及多算法（Voronoi/Lloyd/分区/BFS）的协同 + 调参，复杂度中等偏高
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T1.2/T1.4/T1.7/T1.8 并行）
  - **Parallel Group**: Wave 1 阶段 B
  - **Blocks**: T1.6（人工标签依赖此输出）
  - **Blocked By**: T1.1（生成器输出 realms[] 需 RealmId 类型 + Realm.initialArmies 用 ArmyTemplate）

  **References**:

  *Pattern References*:
  - `tools/generate-m0-map.ts:1-228` - 完整 M0 生成器模板（重点 §Voronoi 构造 §Lloyd 松弛 §edge 共享）
  - `tools/generate-m0-map.ts:8` - N_SITES = 5 是 hardcoded 的反模式，本任务必须参数化
  - `src/content/m0/sites.json` - 输出格式参考
  - `docs/design/12-historical-fidelity.md` - 地理红线（秦西/楚南/燕北/齐东不可错）

  **WHY Each Reference Matters**:
  - M0 生成器是 "gold standard"，但 5 邑的 hardcode 必须参数化。Lloyd 松弛参数和共享边算法可直接复用
  - 12-historical-fidelity 的红线是验收硬约束——分区映射不能搞反

  **Acceptance Criteria**:
  - [ ] `pnpm tsx tools/generate-m1-map.ts` 成功输出 `src/content/m1/scenario.json`
  - [ ] 输出 JSON 通过 M1DataSchema.parse 不抛
  - [ ] BFS 邻接闭包测试 PASS（任意 site 出发可达全部）
  - [ ] 8 realm 各 ≥ 5 ≤ 10 邑（除周可 1-2 邑放宽下界）
  - [ ] 所有 edge.travel_cost ≥ 1
  - [ ] `pnpm test tools/__tests__/generate-m1-map.test.ts` PASS

  **QA Scenarios**:

  ```
  Scenario: 生成器输出可被 M1DataSchema 接受
    Tool: Bash (tsx + node)
    Preconditions: T1.5 实施完成
    Steps:
      1. 运行 `pnpm tsx tools/generate-m1-map.ts`
      2. 运行 `node -e "import('./src/shared/schemas.js').then(s => { const d = require('./src/content/m1/scenario.json'); s.M1DataSchema.parse(d); console.log('OK'); })"` （注：实际路径可调）
      3. 抓取输出
    Expected Result: 输出 "OK"，无 ZodError
    Failure Indicators: 任何 ZodError → schema 与生成器失同步
    Evidence: .sisyphus/evidence/m1-task-1.5-generate.txt

  Scenario: BFS 邻接闭包覆盖全图
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 运行 `pnpm test tools/__tests__/generate-m1-map.test.ts -t "adjacency"`
    Expected Result: 测试通过，断言 visited.size === sites.length
    Failure Indicators: 失败 → 出现孤岛
    Evidence: .sisyphus/evidence/m1-task-1.5-bfs.txt

  Scenario: 地理分区方位正确（秦西、楚南、燕北、齐东）
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 运行 `pnpm test tools/__tests__/generate-m1-map.test.ts -t "partition"`
      2. 测试断言：所有 realm_qin 的 site.position.x < MAP_WIDTH * 0.4（西区）
                所有 realm_chu 的 site.position.y > MAP_HEIGHT * 0.6（南区）
                等等
    Expected Result: 全绿
    Failure Indicators: 任何分区错位
    Evidence: .sisyphus/evidence/m1-task-1.5-partition.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-1.5-generate.txt`
  - [ ] `.sisyphus/evidence/m1-task-1.5-bfs.txt`
  - [ ] `.sisyphus/evidence/m1-task-1.5-partition.txt`

  **Commit**: YES (groups with 1)
  - Message: `feat(tools): add M1 map generator with realm assignment`
  - Files: `tools/generate-m1-map.ts`, `tools/__tests__/generate-m1-map.test.ts`, `tools/README.md`, `package.json`, `src/content/m1/scenario.json`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test tools src/shared`

- [x] 1.6 **scenario.json 历史名邑标签 + 用户合规审查**

  **What to do**:
  - 读取 T1.5 生成的 `src/content/m1/scenario.json`，根据 8 势力分区给每个 site 命名为真实历史地名
  - 推荐字典（可参考但用户最终拍板）：
    - 秦：咸阳（首都）、雍、栎阳、栎、汧渭、武功、犬丘、华山、上洛、戎陵
    - 楚：郢（首都）、寿春、陈、巫、黔中、邓、随、鄢、彭城、邾
    - 齐：临淄（首都）、即墨、莒、薛、博、高唐、平阴、阿、郦、鄄
    - 燕：蓟（首都）、辽阳、易、上谷、武阳、襄平、渔阳、雍奴、令支
    - 韩：新郑（首都）、宜阳、阳翟、汝南、阳城、武遂
    - 赵：邯郸（首都）、代、晋阳、中牟、上党、武安、漳水
    - 魏：大梁（首都）、安邑、河西、汾阴、中山、西河
    - 周：洛邑（首都）、王城
  - **关键**：每个 realm 名下数量必须匹配 T1.5 生成的实际 site 数；如生成器给秦 8 邑，从字典前 8 个取
  - 给每个 realm 的 `displayName` 设为单字简称（齐/楚/燕/韩/赵/魏/秦/周），`fullTitle` 设为"齐国/楚国/.../周王室"
  - 给每个 realm 的 `color` 按下表（**M1 计划即配色 source of truth**；hex 值依据 `docs/design/02-map.md` §8.2 "配色系统" 表中的描述性色名"周朱赤、秦玄黑、齐青蓝、楚暗赤、韩橘黄、赵紫青、魏翠绿、燕灰白" 转化为可视化 hex；本表覆盖 02-map.md §8.2 描述名作为代码层 source of truth）：
    - 秦 #1A1A1A（玄黑）
    - 楚 #8B1A1A（暗赤）
    - 齐 #2E5A6E（青蓝）
    - 周 #C8362F（朱赤）
    - 韩 #D8741A（橘黄）
    - 赵 #5B3A6F（紫青）
    - 魏 #4A8B5C（翠绿）
    - 燕 #B0B0B0（灰白）
  - 给每个 realm 的 `capital` 字段设为对应首都的 SiteId
  - **必须**：在任务交付前，写一份 `.sisyphus/evidence/m1-task-1.6-realm-distribution.md` 列出每势力的 site 完整清单（中文名 + 坐标 + ID），让用户人工检查"秦在西、楚在南、燕在北、齐在东"是否方位正确——这是 12-historical-fidelity 红线
  - 用户验收后再 commit

  **Must NOT do**:
  - 不要给 realm 加 `traits[]` 字段——M1 全部 realm 走相同代码路径（per Metis 反 slop）
  - 不要捏造历史地名（每个名都需对应春秋战国时期真实邑）
  - 不要让任何邑跨区错位（如把"洛邑"放到秦区——洛邑是周的首都，必须在中央）
  - 不要在此任务中实现 i18n——所有名字写中文 hardcoded（M0 已是中文，保持一致）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要历史考据 + 内容审查 + 人机协同
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO（依赖 T1.5 输出）
  - **Parallel Group**: Wave 1 阶段三（T1.5 之后）
  - **Blocks**: 全部 Wave 2 任务（无内容则系统无法验证）
  - **Blocked By**: T1.5

  **References**:

  *Pattern References*:
  - `docs/design/02-map.md` §8.2 "配色系统" - 8 势力描述性色名考据来源（朱赤/玄黑/青蓝/暗赤/橘黄/紫青/翠绿/灰白）—— 本计划上面 hex 表是该名称的代码 source of truth
  - `docs/design/03-factions.md` §2.2 "势力的差异化（Factional Identity）" - **仅作为势力名/全称参考**（齐/楚/燕/韩/赵/魏/秦/周 + 国号），**不是**配色表
  - `docs/design/06-scenarios.md` - Realm schema 字段定义
  - `docs/design/12-historical-fidelity.md` - 地理红线（秦西/楚南/燕北/齐东）

  *External References*:
  - 司马迁《史记》卷四〇至卷四五（七国世家）— 验证地名

  **WHY Each Reference Matters**:
  - 02-map.md §8.2 用文字描述了 9 个势力的色彩感（朱赤/玄黑/青蓝...），本任务上方的 hex 表是这些描述性色名的具体落地
  - 03-factions.md §2.2 提供了势力 Identity（如"秦/秦国/嬴姓/西陲蛮夷"等），M1 仅取国号与全称
  - 12-historical-fidelity §"红线"明文：地理错位 = 不可发布

  **Acceptance Criteria**:
  - [ ] `src/content/m1/scenario.json` 中所有 site.name 为合法春秋战国地名（中文）
  - [ ] 8 realm 配色精确匹配 03-factions §2.2 列表
  - [ ] 每 realm 的 `capital` 指向其首都 site 的 ID
  - [ ] `.sisyphus/evidence/m1-task-1.6-realm-distribution.md` 已生成且交用户验收
  - [ ] 用户在审查文件中明确写"approved"或类似确认
  - [ ] M1DataSchema.parse 不抛
  - [ ] `pnpm test src/content/m1` PASS

  **QA Scenarios**:

  ```
  Scenario: 配色严格匹配设计文档
    Tool: Bash (vitest)
    Preconditions: T1.6 完成
    Steps:
      1. 运行 `pnpm test src/content/m1/__tests__/realm-colors.test.ts`
      2. 测试断言：realm_qin.color === '#1A1A1A'，realm_chu.color === '#8B1A1A'，...
    Expected Result: 全绿
    Failure Indicators: 任何 realm 配色偏差
    Evidence: .sisyphus/evidence/m1-task-1.6-colors.txt

  Scenario: 用户人工检查 realm 分布并 approved
    Tool: 人工 + 文件标记
    Preconditions: T1.6 已生成 distribution.md
    Steps:
      1. 用户阅读 `.sisyphus/evidence/m1-task-1.6-realm-distribution.md`
      2. 用户在文件末尾追加 "## Approved by: <date>"
    Expected Result: 文件含 approved 标记
    Failure Indicators: 缺标记 → 任务不可推进到 W2
    Evidence: .sisyphus/evidence/m1-task-1.6-realm-distribution.md（含 approved）
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-1.6-realm-distribution.md`（含用户 approved 标记）
  - [ ] `.sisyphus/evidence/m1-task-1.6-colors.txt`

  **Commit**: YES (groups with 1)
  - Message: `content(m1): hand-author historical site labels for warring states`
  - Files: `src/content/m1/scenario.json`, `src/content/m1/__tests__/realm-colors.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm test src/content/m1`

- [x] 1.7 **warKey 工具 + wars 数据结构**

  **What to do**:
  - **注**：`WarKey` 别名已在 T1.2 添加（`type WarKey = string`）。本任务实现工具函数与单测。
  - 在 `src/engine/wars/` 新建模块（注：在 src/engine/ 下，因为它是引擎工具）：
    - `src/engine/wars/index.ts` 暴露 `warKey`、`isAtWar`、`declareWar`
    - `src/engine/wars/wars.ts` 实现：
      ```typescript
      export function warKey(a: RealmId, b: RealmId): WarKey {
        if (a === b) throw new Error('Realm cannot be at war with itself')
        return [a, b].sort().join(':')
      }

      export function isAtWar(wars: ReadonlyMap<WarKey, true>, a: RealmId, b: RealmId): boolean {
        if (a === b) return false
        return wars.has(warKey(a, b))
      }

      export function declareWar(wars: ReadonlyMap<WarKey, true>, a: RealmId, b: RealmId): ReadonlyMap<WarKey, true> {
        const key = warKey(a, b)
        if (wars.has(key)) return wars
        const next = new Map(wars)
        next.set(key, true)
        return next
      }
      ```
  - 在 `src/engine/wars/__tests__/wars.test.ts` 加 ≥ 8 个测试：
    - warKey 对称性（warKey('qin','han') === warKey('han','qin')）
    - warKey 自身相等抛异常
    - isAtWar 默认 false
    - declareWar 后 isAtWar true
    - declareWar 幂等（重复声明不影响 size）
    - 多对战争互不影响
    - 不可变（输入 wars 不被修改）

  **Must NOT do**:
  - 不要把 wars 实现放在 src/shared（业务逻辑属于引擎）
  - 不要给 War 加 declaredOn/expires/casusBelli 字段（M2+）
  - 不要让 declareWar 直接修改 input wars Map（必须返回新 Map）
  - 不要为 warKey 用 hash function——简单字符串排序就够了

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T1.5、T1.8 并行）
  - **Parallel Group**: Wave 1 阶段二
  - **Blocks**: T2.2、T2.3、T2.5（行军/AI/orders 都需查 wars）
  - **Blocked By**: T1.1（warKey 签名引用 RealmId 类型；T1.7 在 T1.2 之后或并行均可，因仅依赖 T1.1 暴露的 RealmId）

  **References**:

  *Pattern References*:
  - `src/engine/random/helpers.ts:1-32` - 引擎工具模块结构（pure function + colocated tests）
  - `src/engine/random/__tests__/random.test.ts:1-73` - 引擎工具测试范式

  **Acceptance Criteria**:
  - [ ] `pnpm typecheck` PASS
  - [ ] `pnpm test src/engine/wars` PASS（≥ 8 case）
  - [ ] `pnpm test src/engine/__tests__/architecture-purity.test.ts` PASS（新模块不应触发任何禁用 import）

  **QA Scenarios**:

  ```
  Scenario: warKey 对称性
    Tool: Bash (vitest)
    Preconditions: T1.7 完成
    Steps:
      1. 运行 `pnpm test src/engine/wars/__tests__/wars.test.ts -t "symmetry"`
    Expected Result: warKey('qin','han') === warKey('han','qin')
    Failure Indicators: 不等 → key 函数有 bug，wars 集合会重复存储
    Evidence: .sisyphus/evidence/m1-task-1.7-symmetry.txt

  Scenario: declareWar 幂等
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 调用 declareWar(empty, 'qin', 'han')，size === 1
      2. 调用 declareWar(result, 'qin', 'han')，size 仍为 1
    Expected Result: 都成立
    Failure Indicators: size === 2 → 重复存储
    Evidence: .sisyphus/evidence/m1-task-1.7-idempotent.txt

  Scenario: declareWar 不修改输入
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 创建 wars Map，size === 0
      2. 调用 declareWar
      3. 断言原 wars.size === 0（未被修改）
    Expected Result: 原对象未被修改
    Failure Indicators: 原 size === 1 → 副作用泄漏
    Evidence: .sisyphus/evidence/m1-task-1.7-immutable.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-1.7-symmetry.txt`
  - [ ] `.sisyphus/evidence/m1-task-1.7-idempotent.txt`
  - [ ] `.sisyphus/evidence/m1-task-1.7-immutable.txt`

  **Commit**: YES (groups with 1)
  - Message: `feat(types): add warKey utility and wars data structure`
  - Files: `src/shared/types.ts`, `src/engine/wars/index.ts`, `src/engine/wars/wars.ts`, `src/engine/wars/__tests__/wars.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/engine/wars`

- [x] 1.8 **BottomBar 组件骨架**

  **What to do**:
  - 新建 `src/ui/components/BottomBar/`（目录 + index.ts + BottomBar.tsx + BottomBar.module.css + __tests__/bottom-bar.test.tsx）
  - 渲染 8 个按钮：王宫 / 军事 / 外交 / 内政 / 经济 / 文化 / 谍报 / 人才
  - 仅"王宫"和"军事"启用（onClick 触发 store 状态切换）；其他 6 个 `disabled` + `aria-disabled` + 灰色 CSS
  - 加 testid：`data-testid="bottom-bar-wanggong"`、`data-testid="bottom-bar-junshi"`、`data-testid="bottom-bar-waijiao"`、...每个按钮一个
  - 在 `src/App.tsx` 把 BottomBar 加到主屏幕底部（参考 09-ux-ui §2.5 布局）
  - 在 component test 验证：8 按钮渲染、仅 2 启用、点击启用按钮触发 store action（用 mock store）

  **Must NOT do**:
  - 不要在此任务接 store 实际逻辑（store 改动在 T2.7）——仅 UI 占位
  - 不要给禁用按钮加 onClick handler（无障碍：disabled 应彻底拒收事件）
  - 不要在此任务实现 hotkey（1-8 切换面板——M2+）
  - 不要使用 styled-components 或 CSS-in-JS（项目用 CSS Modules，参考 TopBar.module.css）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T1.2/T1.4/T1.5/T1.7 并行）
  - **Parallel Group**: Wave 1 阶段二
  - **Blocks**: 全部 Wave 3 UI 任务（panels 通过 BottomBar 触发）
  - **Blocked By**: 无

  **References**:

  *Pattern References*:
  - `src/ui/components/TopBar/TopBar.tsx:1-33` - 组件结构范式
  - `src/ui/components/TopBar/TopBar.module.css:1-end` - CSS Modules 范式
  - `src/ui/components/TimeControlBar/TimeControlBar.tsx:1-65` - 按钮组 + testid 范式
  - `docs/design/09-ux-ui.md` §2.5 - 底栏 8 入口设计

  **Acceptance Criteria**:
  - [ ] `pnpm test src/ui/components/BottomBar` PASS（≥ 4 case：渲染、按钮数量、启用状态、点击 stub）
  - [ ] BottomBar 在 `src/App.tsx` 中渲染（grep 可见 `<BottomBar />`）
  - [ ] 8 个 testid 全部存在（用 Playwright 简单 smoke：之后由 W4 e2e 详细测）

  **QA Scenarios**:

  ```
  Scenario: 8 按钮全部渲染，仅 2 启用
    Tool: Bash (vitest with @testing-library/react)
    Preconditions: T1.8 完成
    Steps:
      1. 运行 `pnpm test src/ui/components/BottomBar/__tests__/bottom-bar.test.tsx`
      2. grep 输出含 "8 buttons" 或类似断言
    Expected Result: 测试断言 buttons.length === 8 + enabled.length === 2 全绿
    Failure Indicators: 数量不对
    Evidence: .sisyphus/evidence/m1-task-1.8-buttons.txt

  Scenario: BottomBar testid 在浏览器中可见
    Tool: Playwright (skill: playwright)
    Preconditions: 同上 + `pnpm dev` 已运行
    Steps:
      1. Playwright navigate to http://localhost:5173
      2. expect(page.locator('[data-testid="bottom-bar-wanggong"]')).toBeVisible()
      3. expect(page.locator('[data-testid="bottom-bar-junshi"]')).toBeVisible()
      4. expect(page.locator('[data-testid="bottom-bar-waijiao"]')).toBeDisabled()
    Expected Result: 全部断言通过
    Failure Indicators: 任何 testid 不可见或启用状态错误
    Evidence: .sisyphus/evidence/m1-task-1.8-bottombar.png
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-1.8-buttons.txt`
  - [ ] `.sisyphus/evidence/m1-task-1.8-bottombar.png`

  **Commit**: YES (groups with 1)
  - Message: `feat(ui): add BottomBar component scaffold`
  - Files: `src/ui/components/BottomBar/`, `src/App.tsx`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/ui`

### Wave 2 · 核心系统

- [x] 2.1 **combat 系统 + 瞬时结算 + 单测**

  **What to do**:
  - 新建 `src/engine/systems/combat/` 目录
  - 实现 `combat.ts`：
    ```typescript
    import type { Army, Site, World, RNGState, GameEvent } from '~/shared/types'

    export interface CombatResult {
      readonly winner: 'attacker' | 'defender'
      readonly attackerLoss: number
      readonly defenderLoss: number
    }

    export function resolveCombat(
      attacker: Army,
      defenders: readonly Army[]  // 该邑上所有该邑 owner 的军团
    ): CombatResult {
      const defenderManpower = defenders.reduce((s, a) => s + a.manpower, 0)
      const defenderEffective = Math.ceil(defenderManpower * 1.3)

      if (attacker.manpower > defenderEffective) {
        return {
          winner: 'attacker',
          attackerLoss: Math.floor(defenderManpower * 0.5),
          defenderLoss: defenderManpower,
        }
      } else {
        return {
          winner: 'defender',
          attackerLoss: Math.floor(attacker.manpower * 0.3),
          defenderLoss: 0,  // M1 简化：守方败方算"未消耗"
        }
      }
    }

    export function combatStep(world: World, _rng: RNGState): {
      world: World
      nextRng: RNGState
      events: readonly GameEvent[]
    } {
      // 遍历 marching 状态、ticksRemaining === 0 的军团
      // 对每个，找其 destination 上的所有 owner 军团，调用 resolveCombat
      // 应用减员、转换状态（攻方胜：location = destination, state = idle, destination = null）
      // 攻方败：state = retreating, destination = source, ticksRemaining = travel_cost(destination → source 反路径)
      // 同邑无 owner 军团 → 直接占领（无战斗，无减员）
      // 返回 events: BattleResolved / SiteConquered / ArmyDestroyed
    }
    ```
  - 在 `src/engine/systems/combat/__tests__/combat.test.ts` 写表格驱动测试 ≥ 12 case：
    - 攻 1000 vs 守 500（×1.3 = 650），1000 > 650 → 攻胜，攻损 250、守损 500
    - 攻 500 vs 守 500（×1.3 = 650），500 < 650 → 守胜，攻损 150（floor 0.3）、守损 0
    - 攻 1000 vs 守 0（空邑）→ 攻直接占领，攻损 0、守损 0
    - 攻 700 vs 守 500（×1.3 = 650），700 > 650 → 攻胜，攻损 250、守损 500
    - 边界：攻 651 vs 守 500（×1.3 = 650），攻胜
    - 边界：攻 650 vs 守 500（攻 == 守 effective），守胜（严格 >）
    - 多军团守：攻 2000 vs 两守军共 1500（×1.3 = 1950），攻胜，攻损 750、两守军被消灭
    - 攻方手下败回头路：状态 = retreating，destination = source，ticksRemaining 正确
    - 攻败时 source 无效（如未设）→ 抛 invariant
    - 多军团守减员按比例（M1 简化：全部消灭）

  **Must NOT do**:
  - 不要引入兵种/地形/将领修正（per roadmap §4.3）
  - 不要让 combatStep 修改非战场邑（限定影响范围）
  - 不要让 resolveCombat 依赖 RNG（M1 战斗确定性）
  - 不要在 combat.ts 中 import react/zustand/document（architecture-purity 守门）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 战斗算法的边界条件多，TDD 表格驱动需要细致边界用例
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T2.2-T2.7 并行）
  - **Parallel Group**: Wave 2
  - **Blocks**: T3.1
  - **Blocked By**: T1.1（Realm 类型）、T1.2（Army 类型）

  **References**:

  *Pattern References*:
  - `src/engine/systems/painting/painting.ts:1-59` - phase step 函数签名（已删，但 git 历史可查）
  - `src/shared/types.ts:80-83` - TickPhase 签名
  - `src/engine/random/__tests__/random.test.ts:1-73` - 表格驱动测试范式

  *External References*:
  - `docs/design/04-systems-military.md` §7.2 - 野战结算原始设计（M1 简化版）

  **WHY Each Reference Matters**:
  - TickPhase 签名 `(world, rng) => { world, nextRng, events }` 是阶段链合约，必须严格遵守
  - 04-systems-military 是设计的 full vision，但 M1 仅取"双方兵力对比"——其他全部 OUT

  **Acceptance Criteria**:
  - [ ] `pnpm test src/engine/systems/combat` 全绿，≥ 12 case
  - [ ] `resolveCombat(attacker_1000, [defender_500])` 返回攻胜、攻损 250、守损 500
  - [ ] `resolveCombat(attacker_500, [defender_500])` 返回守胜、攻损 150
  - [ ] `combatStep` 不修改非战斗 site/army
  - [ ] `pnpm test src/engine/__tests__/architecture-purity.test.ts` PASS（combat.ts 无禁用 import）

  **QA Scenarios**:

  ```
  Scenario: 攻方兵力 > 守方 ×1.3 → 攻胜，攻损 = 守 ×0.5（floor）
    Tool: Bash (vitest)
    Preconditions: T2.1 完成
    Steps:
      1. 运行 `pnpm test src/engine/systems/combat/__tests__/combat.test.ts -t "attacker wins"`
      2. 抓取输出含具体数字
    Expected Result: 1000 vs 500 → attackerLoss === 250, defenderLoss === 500
    Failure Indicators: 数字不匹配 → 公式错
    Evidence: .sisyphus/evidence/m1-task-2.1-attacker-wins.txt

  Scenario: 攻方兵力 == 守方 ×1.3 → 严格 > 判定，守胜
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 运行 `pnpm test ... -t "tie defender"`
      2. 断言 winner === 'defender'
    Expected Result: 等值时守胜（边界正确）
    Failure Indicators: 接受 === 为攻胜
    Evidence: .sisyphus/evidence/m1-task-2.1-tie.txt

  Scenario: 空邑直接占领无战斗
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 运行 `pnpm test ... -t "empty site"`
      2. 断言 attackerLoss === 0
    Expected Result: 攻方零损失
    Failure Indicators: 任何减员
    Evidence: .sisyphus/evidence/m1-task-2.1-empty.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-2.1-attacker-wins.txt`
  - [ ] `.sisyphus/evidence/m1-task-2.1-tie.txt`
  - [ ] `.sisyphus/evidence/m1-task-2.1-empty.txt`

  **Commit**: YES (groups with 2)
  - Message: `feat(engine/combat): instant combat resolution with defender bonus`
  - Files: `src/engine/systems/combat/`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/engine`

- [x] 2.2 **march 系统 + travel_cost 推进 + 单测**

  **What to do**:
  - 新建 `src/engine/systems/march/`：march.ts + index.ts + __tests__/march.test.ts
  - 实现 `marchStep(world, rng)`：
    - 遍历所有 `state === 'marching'` 或 `state === 'retreating'` 的军团
    - `ticksRemaining -= 1`
    - 当 `ticksRemaining === 0`：
      - marching 完成 → 留在 location（待 combatStep 处理碰撞），state 变 'idle' 或保持 'marching' 等 combatStep 决定（建议保持 marching 让 combat 接管）。**实现细节由本任务决定**：建议在 marchStep 末把 `ticksRemaining=0` 的 marching 军团 location 暂未变更（仍为 source），由 combatStep 读 destination 判断；combatStep 完成后更新 location
      - retreating 完成 → location = destination（即 source），state = 'idle'，destination = null, source = null
  - 实现工具：`computeMarchTicks(edge: MapEdge, speedFactor: number = 1): number`，返回 `Math.max(1, Math.ceil(edge.travel_cost / speedFactor))`
  - 测试 ≥ 8 case：
    - 启动 march：state='marching', destination=B, ticksRemaining=edge.travel_cost
    - 1 tick 后 ticksRemaining 减 1
    - travel_cost === 3 时，3 tick 后 ticksRemaining === 0
    - retreating 同样按 ticks 倒计
    - retreating 完成后 location = source、state = idle、destination = null
    - idle 军团 marchStep 不变
    - 多军团并发推进互不影响
    - speedFactor === 2 时 ticks 减半（向上取整）

  **Must NOT do**:
  - 不要在 marchStep 中处理战斗逻辑（属于 combatStep 职责）
  - 不要让 marchStep 改变 idle 军团状态
  - 不要忽略 retreating——它和 marching 用同一倒计逻辑
  - 不要让 ticksRemaining 变负

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T2.1/T2.3-T2.7 并行）
  - **Parallel Group**: Wave 2
  - **Blocks**: T3.1
  - **Blocked By**: T0.1（travel_cost）、T1.2（Army 类型）、T1.7（wars 工具——退却时可能要清 wars 状态？M1 不清，wars 永久）

  **References**:

  *Pattern References*:
  - `src/engine/clock/clock.ts:35-58` - tick advance 模式
  - `src/shared/types.ts:80-83` - TickPhase 签名

  **Acceptance Criteria**:
  - [ ] `pnpm test src/engine/systems/march` 全绿，≥ 8 case
  - [ ] travel_cost = 3 + speedFactor = 1 → 3 tick 抵达
  - [ ] retreating 抵达后 state = idle, location = source, destination/source = null
  - [ ] idle 军团不被 marchStep 改动

  **QA Scenarios**:

  ```
  Scenario: 行军 tick 数等于 travel_cost
    Tool: Bash (vitest)
    Preconditions: T2.2 完成
    Steps:
      1. 运行 `pnpm test src/engine/systems/march/__tests__/march.test.ts -t "travel_cost"`
      2. 测试构造 travel_cost=3 边、attacker 启动 march、连续 3 次调 marchStep
      3. 断言第 3 次后 ticksRemaining === 0
    Expected Result: ticks 精确递减
    Failure Indicators: 偏差 → 倒计逻辑错
    Evidence: .sisyphus/evidence/m1-task-2.2-tick-count.txt

  Scenario: 退却抵达后状态归零
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 测试构造 retreating 军团
      2. 推进到 ticksRemaining === 0
      3. 调用 marchStep
      4. 断言 state === 'idle'、location === source、destination === null
    Expected Result: 全部断言通过
    Failure Indicators: state 仍为 retreating 或 location 未更新
    Evidence: .sisyphus/evidence/m1-task-2.2-retreat-arrival.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-2.2-tick-count.txt`
  - [ ] `.sisyphus/evidence/m1-task-2.2-retreat-arrival.txt`

  **Commit**: YES (groups with 2)
  - Message: `feat(engine/march): march system based on travel_cost`
  - Files: `src/engine/systems/march/`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/engine`

- [x] 2.3 **ai 系统 + 80/20 决策 + 邻邑过滤 + 确定性测试**

  **What to do**:
  - 新建 `src/engine/systems/ai/`：ai.ts + index.ts + __tests__/ai.test.ts
  - 实现 `aiPlanStep(world, rng)`：
    - 仅当 `tick % 3 === 0`（每月）执行——可以让调用方判断或在内部判断（建议在内部，phase 调用频率为每 tick）
    - 遍历所有非玩家 realm
    - 对每 realm，调用 `pickRandom([0,1])` 得到一个 `[0..1)` 浮点数
    - 若 < 0.2：尝试发起攻击：
      1. 找该 realm 所有 idle 军团
      2. 找该 realm 所有 site 的邻邑（排除自己拥有的）= 候选目标
      3. 进一步过滤：候选目标必须**至少有一个该 realm 的 idle 军团相邻**（即该 idle 军团驻扎在直接相邻的己方邑）
      4. 若候选为空，跳过
      5. 用 RNG 随机选一目标 + 一个相邻的 idle 军团
      6. 如尚未对该目标 realm 宣战 → 调用 declareWar
      7. 给该军团下达 march order：state='marching'、destination=target、ticksRemaining=travel_cost
    - 返回 events: AIDeclaredWar / AIDispatchedArmy
  - 测试 ≥ 10 case，**重点是确定性**：
    - 同 seed + 同 world → 同 AI 输出（运行 2 次 diff 应为空）
    - tick % 3 !== 0 时 AI 不动作
    - 80/20 概率：seed=42 + 100 ticks，统计 AI 动作率约 20%（±5%）
    - 玩家 realm 不参与 AI 决策
    - 0 idle 军团时跳过
    - 无邻接敌邑时跳过
    - declareWar 仅在首次发起对该 realm 的攻击时调用
    - 多 realm 并发不互相影响
    - rng state 必须 thread-through

  **Must NOT do**:
  - 不要让 AI 看 World.events（信息隔离）
  - 不要给不同 realm 加不同 personality 行为（per Metis 反 slop）
  - 不要让 AI 跨水域/山地/关隘——M1 仅依靠 adjacency
  - 不要在 AI 中实现长程导航（仅 1 跳邻接）
  - 不要修改非己方军团

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 涉及 RNG 确定性 + 多重过滤 + 概率分布断言
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T2.1/T2.2/T2.4-T2.7 并行）
  - **Parallel Group**: Wave 2
  - **Blocks**: T3.1
  - **Blocked By**: T1.2（Army）、T1.7（wars 工具）

  **References**:

  *Pattern References*:
  - `src/engine/random/helpers.ts:1-32` - RNG helpers（必须复用，不要新写 PRNG）
  - `src/engine/random/__tests__/random.test.ts` - 确定性测试范式
  - `src/engine/wars/wars.ts` - declareWar 接口

  **Acceptance Criteria**:
  - [ ] `pnpm test src/engine/systems/ai` 全绿，≥ 10 case
  - [ ] 同 seed 同 world，aiPlanStep 输出相同 World（深比较 sites/armies/wars）
  - [ ] 100 tick × 7 AI realm = 700 决策机会，约 140 ± 35 次"动作"（20% ± 5%）
  - [ ] AI 不会选择无邻邑的目标（孤岛检测）
  - [ ] `pnpm test src/engine/__tests__/architecture-purity.test.ts` PASS

  **QA Scenarios**:

  ```
  Scenario: 同 seed 决定性
    Tool: Bash (vitest)
    Preconditions: T2.3 完成
    Steps:
      1. 运行 `pnpm test src/engine/systems/ai/__tests__/ai.test.ts -t "deterministic"`
      2. 测试构造 fixture，seed=42 + 1000 tick run，记录 AI 动作流
      3. 重置 + 同 seed + 同 world，再 run，diff 两次记录
    Expected Result: diff 为空
    Failure Indicators: 任何 diff → RNG 漏 thread
    Evidence: .sisyphus/evidence/m1-task-2.3-deterministic.txt

  Scenario: AI 仅攻击邻接目标
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 测试 fixture：realm A 有 site_1、其相邻有 site_2(B)、site_3(B)，远离的 site_99(B)
      2. 运行 1000 tick AI
      3. 抓取所有 AI 发出的 order，断言 destination ∈ {site_2, site_3}（不含 site_99）
    Expected Result: 全部 order destination 在邻接集
    Failure Indicators: 任何长程订单
    Evidence: .sisyphus/evidence/m1-task-2.3-adjacency.txt

  Scenario: 80/20 概率分布约略对齐
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. 测试 fixture：8 realm × 100 tick × tick%3==0
      2. 统计 actionCount / totalRolls
      3. 断言 0.15 ≤ ratio ≤ 0.25
    Expected Result: 比例在区间内
    Failure Indicators: 严重偏移
    Evidence: .sisyphus/evidence/m1-task-2.3-distribution.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-2.3-deterministic.txt`
  - [ ] `.sisyphus/evidence/m1-task-2.3-adjacency.txt`
  - [ ] `.sisyphus/evidence/m1-task-2.3-distribution.txt`

  **Commit**: YES (groups with 2)
  - Message: `feat(engine/ai): 80/20 random aggression AI`
  - Files: `src/engine/systems/ai/`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/engine`

- [x] 2.4 **victory 系统 + 胜利检测**

  **What to do**:
  - 新建 `src/engine/systems/victory/`：victory.ts + index.ts + __tests__/victory.test.ts
  - 实现 `victoryCheckStep(world, rng)`：
    - 检查所有 site 的 ownerId 是否都等于 `world.playerRealmId`
    - 若是 → 在 events 中添加 `{ type: 'victoryAchieved', realmId: playerRealmId }`
    - 不修改 world（仅检测）
  - 实现工具：`isVictorious(world: World): boolean`
  - 测试 ≥ 5 case：
    - 全部己方 → true
    - 一邑非己 → false
    - 全部非己 → false
    - 0 邑（边界，不应发生）→ false
    - 多次调用幂等

  **Must NOT do**:
  - 不要在 victory 系统中修改 world.sites（仅检测）
  - 不要在 M1 实现"消灭其他 7 realm"或"占首都"等替代条件（per Q13 决策：仅占满全图）
  - 不要把 demo banner UI 逻辑放在引擎层

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T3.1
  - **Blocked By**: T1.1（playerRealmId 字段需在 World 上）

  **References**:

  *Pattern References*:
  - `src/App.tsx:9-24` - 现有 useAllRed 逻辑（被 T3.6/T3.5 重写）

  **Acceptance Criteria**:
  - [ ] `pnpm test src/engine/systems/victory` 全绿，≥ 5 case
  - [ ] `isVictorious(world)` 在玩家占满时返回 true，其他情况 false

  **QA Scenarios**:

  ```
  Scenario: 玩家占满返回 true
    Tool: Bash (vitest)
    Preconditions: T2.4 完成
    Steps:
      1. fixture: 5 site，全部 ownerId = 'realm_qin'，playerRealmId = 'realm_qin'
      2. 调用 isVictorious
    Expected Result: true
    Failure Indicators: false
    Evidence: .sisyphus/evidence/m1-task-2.4-all-mine.txt

  Scenario: 一邑非己返回 false
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. fixture: 5 site，4 site = realm_qin、1 site = realm_han
      2. 调用 isVictorious
    Expected Result: false
    Failure Indicators: true
    Evidence: .sisyphus/evidence/m1-task-2.4-one-other.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-2.4-all-mine.txt`
  - [ ] `.sisyphus/evidence/m1-task-2.4-one-other.txt`

  **Commit**: YES (groups with 2)
  - Message: `feat(engine/victory): player ownership victory check`
  - Files: `src/engine/systems/victory/`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/engine`

- [x] 2.5 **orders 系统 + 玩家命令应用**

  **What to do**:
  - 新建 `src/engine/systems/orders/`：orders.ts + index.ts + __tests__/orders.test.ts
  - 实现 `applyOrder(world, order): { world, events }`：
    - 检查 order.armyId 存在 + 该军团 state === 'idle' + 该军团 location 与 order.targetSiteId 是邻接
    - 若 OrderType === 'declareWarAndMarch'：调用 wars.declareWar，随后下达 march
    - 若 OrderType === 'march'：要求 wars 中已有该 realm vs 目标 realm 战争状态；若否则 reject（返回 events: 'orderRejected'）
    - 否则：把军团 state = marching, destination = targetSiteId, ticksRemaining = edge.travel_cost, source = location
    - 返回 { world: updated, events: [orderApplied] 或 [orderRejected] }
  - 实现 `orderApplyStep(world, rng)`：从 store 拉取 pending orders 队列、逐个 apply。**注意**：因为 orders 来自 UI（Zustand store），引擎层不直接读 store，而是通过 raf-driver 在每 tick 把 pendingOrders 注入。**最简方案**：让 orders 队列驻留在 World.pendingOrders（M1 增字段）；UI 通过 store action 把 order push 进 World.pendingOrders。orderApplyStep 消费并清空。
  - **重要**：`World.pendingOrders: readonly Order[]` 字段需要在 T1.1 或本任务时加入 World 类型；在本任务做更合理（紧密相关）
  - 测试 ≥ 8 case：
    - march order 应用后军团状态正确
    - declareWarAndMarch 应用后 wars 含目标对、军团 marching
    - 已宣战的对方再 march（不带 declareWar）合法
    - 未宣战的对方 march 被拒
    - 非 idle 军团下 order 被拒
    - 非邻接 target 被拒
    - 不存在 armyId 被拒
    - 多 order 顺序应用

  **Must NOT do**:
  - 不要让引擎直接读 Zustand store（违反层墙）
  - 不要让 order 跨多边路径（M1 仅 1 跳邻接）
  - 不要让 order 立即抵达（必须走 ticksRemaining 倒计）
  - 不要在 order 上加 priority/timestamp/issuer

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及 World 字段扩充、wars 协同、状态转换多 case
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T3.1
  - **Blocked By**: T1.2（Order 类型）、T1.7（wars 工具）

  **References**:

  *Pattern References*:
  - `src/engine/systems/painting/painting.ts:1-59`（git 历史）- step 函数模板
  - `src/engine/wars/wars.ts` - declareWar 接口

  **Acceptance Criteria**:
  - [ ] `pnpm test src/engine/systems/orders` 全绿，≥ 8 case
  - [ ] World 类型扩充 `pendingOrders: readonly Order[]`
  - [ ] 非邻接 target 被拒，order events 含 'orderRejected' 类型

  **QA Scenarios**:

  ```
  Scenario: declareWarAndMarch 同时建立战争与启动 march
    Tool: Bash (vitest)
    Preconditions: T2.5 完成
    Steps:
      1. fixture: realm A、realm B、A 的军团 idle 在 site_a、site_a 与 site_b 邻接（site_b 属 B）
      2. 提交 order { type: 'declareWarAndMarch', armyId: army_a1, targetSiteId: site_b }
      3. 调用 applyOrder
    Expected Result: world.wars 含 warKey(A,B)；army_a1.state === 'marching'，destination === site_b
    Failure Indicators: wars 未建立或军团未启动
    Evidence: .sisyphus/evidence/m1-task-2.5-declare-and-march.txt

  Scenario: 非邻接 target 被拒
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. fixture: army_a1 在 site_a，order target = site_far（非邻接）
      2. 调用 applyOrder
    Expected Result: events 含 orderRejected，army 状态未变
    Failure Indicators: army 启动 march
    Evidence: .sisyphus/evidence/m1-task-2.5-rejected.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-2.5-declare-and-march.txt`
  - [ ] `.sisyphus/evidence/m1-task-2.5-rejected.txt`

  **Commit**: YES (groups with 2)
  - Message: `feat(engine/orders): player order application system`
  - Files: `src/engine/systems/orders/`, `src/shared/types.ts`（扩充 World）
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/engine src/shared`

- [x] 2.6 **MapCanvas 点击/右键命中测试**

  **What to do**:
  - 在 `src/rendering/map/MapCanvas.tsx` 增加 `onClick` 与 `onContextMenu` 处理：
    - 计算鼠标点 + canvas 边界 → world 坐标
    - 用 point-in-polygon 测试找出击中的 site
    - 单击 site → 触发 store action `selectSite(siteId)` 或 `selectArmy`（如果该 site 上有玩家军团）
    - 右键 site → 触发 store action `openContextMenu({ siteId, x, y })`
  - 实现工具 `pointInPolygon(point, polygon): boolean` 在 `src/rendering/map/hit-test.ts`
  - 测试：
    - `src/rendering/map/__tests__/hit-test.test.ts`：边角/内部/外部 case ≥ 6
    - `src/rendering/map/__tests__/map-canvas.test.tsx`：单击 + 右键 mock dispatch action

  **Must NOT do**:
  - 不要做拖框选 / 多选（per scope OUT）
  - 不要在 canvas 外部点击触发命中（边界检查）
  - 不要在引擎层使用 hit-test（仅 rendering 层）
  - 不要使用第三方 polygon 库——pointInPolygon 用经典射线法即可

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: rendering + 数学几何 + DOM 事件
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T3.2（context menu UI）、T3.7（军团图标点击）
  - **Blocked By**: 无（独立于其他 W2）

  **References**:

  *Pattern References*:
  - `src/rendering/map/MapCanvas.tsx:1-139` - canvas 现状
  - `src/rendering/map/tile-cache.ts:15-66` - 边界遍历范例
  - `src/shared/types.ts:42-47` - Site.polygon 类型

  *External References*:
  - 射线法 point-in-polygon：https://en.wikipedia.org/wiki/Point_in_polygon#Ray_casting_algorithm

  **Acceptance Criteria**:
  - [ ] `pnpm test src/rendering/map/__tests__/hit-test.test.ts` ≥ 6 case 全绿
  - [ ] `pnpm test src/rendering/map/__tests__/map-canvas.test.tsx` 含单击/右键 dispatch 测试
  - [ ] 50 邑随机点击采样不漏检

  **QA Scenarios**:

  ```
  Scenario: 点击 site 中心命中
    Tool: Bash (vitest)
    Preconditions: T2.6 完成
    Steps:
      1. fixture: 简单四边形 site
      2. pointInPolygon(中心点) → true
      3. pointInPolygon(角外点) → false
    Expected Result: 内 true、外 false
    Failure Indicators: 反向
    Evidence: .sisyphus/evidence/m1-task-2.6-hit-test.txt

  Scenario: 右键触发 openContextMenu
    Tool: Bash (vitest with @testing-library/user-event)
    Preconditions: 同上 + mocked store
    Steps:
      1. render <MapCanvas />
      2. fire right-click 事件 at coords
      3. 断言 mock store openContextMenu 被调用，参数含 siteId
    Expected Result: dispatched
    Failure Indicators: 未调用
    Evidence: .sisyphus/evidence/m1-task-2.6-rightclick.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-2.6-hit-test.txt`
  - [ ] `.sisyphus/evidence/m1-task-2.6-rightclick.txt`

  **Commit**: YES (groups with 2)
  - Message: `feat(rendering): add point-in-polygon hit test for sites`
  - Files: `src/rendering/map/MapCanvas.tsx`, `src/rendering/map/hit-test.ts`, `src/rendering/map/__tests__/hit-test.test.ts`, `src/rendering/map/__tests__/map-canvas.test.tsx`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/rendering`

- [x] 2.7 **ui store 扩充：selectedArmyId / contextMenu / playerRealmId**

  **What to do**:
  - 在 `src/ui/store/game-store.ts` 扩充 store：
    ```typescript
    interface GameStoreState {
      // 现有字段...
      readonly playerRealmId: RealmId
      readonly selectedArmyId: ArmyId | null
      readonly contextMenu: { siteId: SiteId; x: number; y: number } | null
      readonly activePanel: 'wanggong' | 'junshi' | null
      readonly transientBanner: { text: string; createdAt: number } | null
    }

    // 新 actions:
    // - selectArmy(armyId)
    // - clearSelection()
    // - openContextMenu({ siteId, x, y })
    // - closeContextMenu()
    // - setActivePanel(panel)
    // - issueOrder(order)  // 推 World.pendingOrders
    // - showBanner(text)   // 自动 N 秒后清
    ```
  - 在 `src/ui/store/selectors.ts` 加：`selectSelectedArmy`、`selectContextMenu`、`selectActivePanel`、`selectPlayerRealm`、`selectTransientBanner`、`selectAllPlayerArmies`、`selectIdlePlayerArmies`
  - 在 `src/ui/store/__tests__/store.test.ts` 加 ≥ 8 个新测试

  **Must NOT do**:
  - 不要让 store 直接执行业务规则（如战斗结算）——只做状态托管
  - 不要在 store 里持有 Date 对象 / 浏览器 API 引用（保持可序列化）
  - 不要让 store 重置 World（World 由引擎工厂管理）
  - 不要在 transientBanner 里用 setTimeout 自动清——让 selector 比对 createdAt + 当前 tick 决定是否显示（保持纯）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T3.* 全部
  - **Blocked By**: T1.1（RealmId 类型）

  **References**:

  *Pattern References*:
  - `src/ui/store/game-store.ts:11-76` - 现 store 结构
  - `src/ui/store/selectors.ts:1-41` - selector 风格

  **Acceptance Criteria**:
  - [ ] `pnpm test src/ui/store` 全绿，≥ 8 个新 case
  - [ ] selectArmy 后 selectSelectedArmy 返回正确军团
  - [ ] openContextMenu 后 selectContextMenu 返回坐标
  - [ ] issueOrder 后 World.pendingOrders 包含该 order

  **QA Scenarios**:

  ```
  Scenario: 选中军团后 selector 返回该军团
    Tool: Bash (vitest)
    Preconditions: T2.7 完成
    Steps:
      1. store.selectArmy('army_qin_1')
      2. selectSelectedArmy(state) === army 对象
    Expected Result: 返回正确对象
    Failure Indicators: null 或 错误对象
    Evidence: .sisyphus/evidence/m1-task-2.7-select-army.txt

  Scenario: openContextMenu 与 closeContextMenu
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. store.openContextMenu({ siteId, x: 100, y: 200 })
      2. selectContextMenu === { siteId, x: 100, y: 200 }
      3. store.closeContextMenu()
      4. selectContextMenu === null
    Expected Result: 全部断言通过
    Failure Indicators: 状态未清
    Evidence: .sisyphus/evidence/m1-task-2.7-context-menu.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-2.7-select-army.txt`
  - [ ] `.sisyphus/evidence/m1-task-2.7-context-menu.txt`

  **Commit**: YES (groups with 2)
  - Message: `feat(ui/store): add selectedArmyId, contextMenu, playerRealmId`
  - Files: `src/ui/store/game-store.ts`, `src/ui/store/selectors.ts`, `src/ui/store/__tests__/store.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/ui`

### Wave 3 · 集成与 UI

- [x] 3.1 **阶段链接线到 factory.ts + raf-driver 串联**

  **What to do**:
  - 在 `src/engine/world/factory.ts` 把 `phases: []` 改为 `phases: [aiPlanStep, orderApplyStep, marchStep, combatStep, victoryCheckStep]`（顺序严格匹配 PHASE_ORDER）
  - 修改 `createWorldFromM1Data` 使用 M1 阶段链；`createWorldFromM0Data` 保留旧空 phases（向后兼容，但已无 painting）
  - 在 `src/engine/clock/clock.ts` 确保 phases 数组按顺序运行、events 累计、rng 顺序穿透
  - 在 `src/engine/__tests__/architecture-purity.test.ts` 确认新阶段不破坏纯度
  - 在 `src/engine/world/__tests__/factory.test.ts` 加 phase 链测试：fixture run 1 tick → 检查 events 顺序符合 PHASE_ORDER
  - 在 `src/engine/clock/__tests__/clock.test.ts` 加 phase 顺序测试
  - 在 `src/ui/store/raf-driver.ts` 检查无需改动（已透明跑 phases）
  - 在 `src/main.tsx` 切换：从 `createWorldFromM0Data(m0Data, seed)` 改为 `createWorldFromM1Data(m1Data, seed, 'realm_qin')`（玩家硬编码秦）
  - import M1 数据：`import m1Data from './content/m1/scenario.json'`

  **Must NOT do**:
  - 不要修改 phase 顺序（会破坏战斗发生在 march 之后的语义）
  - 不要保留 paintingStep 的引用（已删）
  - 不要让 clock 跳过任何 phase（`for...of` 全跑）
  - 不要在 main.tsx 直接 import M0 数据（M1 已替代）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 集成测试 + 顺序敏感性 + 跨文件修改
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO（依赖 W2 全部完成）
  - **Parallel Group**: Wave 3 关键路径
  - **Blocks**: 全部 W4 e2e
  - **Blocked By**: T2.1, T2.2, T2.3, T2.4, T2.5

  **References**:

  *Pattern References*:
  - `src/engine/world/factory.ts:108` - phases 数组挂载点
  - `src/engine/clock/clock.ts:35-58` - phase 运行
  - `src/main.tsx` - 应用入口

  **Acceptance Criteria**:
  - [ ] `pnpm typecheck` PASS
  - [ ] `pnpm test src/engine` 全绿
  - [ ] `pnpm dev` 启动后页面无错（控制台 + 网络）
  - [ ] phase 顺序通过 unit test 锁定（aiPlan → orderApply → march → combat → victoryCheck）

  **QA Scenarios**:

  ```
  Scenario: phase 顺序锁定
    Tool: Bash (vitest)
    Preconditions: T3.1 完成
    Steps:
      1. 运行 `pnpm test src/engine/world/__tests__/factory.test.ts -t "phase order"`
      2. 测试构造可观察的 fixture（每 phase 推 events.type=phaseId）
      3. 1 tick 后 events 顺序 === PHASE_ORDER
    Expected Result: 顺序匹配
    Failure Indicators: 任何 phase 顺序错或缺
    Evidence: .sisyphus/evidence/m1-task-3.1-phase-order.txt

  Scenario: dev 服务无错启动
    Tool: Playwright (skill: playwright)
    Preconditions: T3.1 完成
    Steps:
      1. 启动 `pnpm dev` (后台)
      2. Playwright open http://localhost:5173
      3. 监听 console.error，断言无错
      4. 截图
    Expected Result: 页面渲染地图（50 邑），底栏可见，无控制台错误
    Failure Indicators: 任何 console.error 或 white screen
    Evidence: .sisyphus/evidence/m1-task-3.1-dev-screen.png
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-3.1-phase-order.txt`
  - [ ] `.sisyphus/evidence/m1-task-3.1-dev-screen.png`

  **Commit**: YES (groups with 3)
  - Message: `feat(engine): wire phase chain into factory and raf-driver`
  - Files: `src/engine/world/factory.ts`, `src/engine/clock/clock.ts`（如改）, `src/main.tsx`, `src/engine/world/__tests__/factory.test.ts`, `src/engine/clock/__tests__/clock.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test`

- [x] 3.2 **SiteContextMenu 右键菜单组件**

  **What to do**:
  - 新建 `src/ui/components/SiteContextMenu/`：index.ts + SiteContextMenu.tsx + module.css + __tests__/
  - 监听 store.contextMenu，在指定 (x, y) 位置渲染浮层
  - 菜单项条件渲染：
    - 若 site.ownerId === playerRealmId → 显示"驻军详情"（M1 占位灰显，仅描述未来用法）
    - 若 site.ownerId !== playerRealmId 且玩家有相邻 idle 军团：
      - 若已宣战 → 显示"进军 →"+ 子菜单选军团
      - 若未宣战 → 显示"宣战并进军 →"+ 子菜单选军团
    - 若玩家无相邻 idle 军团 → 显示"无空闲军团"灰色占位
  - 点击菜单项 → store.issueOrder(order) + store.closeContextMenu()
  - 点击外部 → close
  - testid: `data-testid="site-context-menu"`、`data-testid="menu-march"`、`data-testid="menu-declare-war"`、`data-testid="menu-army-{armyId}"`

  **Must NOT do**:
  - 不要在 menu 里显示 site 完整详情（M2+）
  - 不要支持 hover 触发子菜单（M1 仅 click）
  - 不要支持热键

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 浮层 + 条件渲染 + CSS 定位
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T3.3-T3.7 并行）
  - **Parallel Group**: Wave 3
  - **Blocks**: W4-T4.1, T4.2
  - **Blocked By**: T2.6, T2.7

  **References**:

  *Pattern References*:
  - `src/ui/components/TopBar/TopBar.tsx:1-33` - 组件结构
  - `docs/design/09-ux-ui.md` §2.2 - 右键菜单设计

  **Acceptance Criteria**:
  - [ ] `pnpm test src/ui/components/SiteContextMenu` ≥ 5 case 全绿
  - [ ] 浮层位置正确（不超出 viewport）
  - [ ] 玩家无 idle 军团时菜单显示灰色占位

  **QA Scenarios**:

  ```
  Scenario: 右键己方邑显示驻军详情灰显
    Tool: Bash (vitest with @testing-library)
    Preconditions: T3.2 完成
    Steps:
      1. mock store: contextMenu = { siteId: site_player, x: 100, y: 100 }，site_player.ownerId === playerRealmId
      2. render <SiteContextMenu />
      3. 断言菜单含 "驻军详情" disabled
    Expected Result: 渲染正确
    Failure Indicators: 显示"进军"按钮（错误条件）
    Evidence: .sisyphus/evidence/m1-task-3.2-own-site.txt

  Scenario: 右键已宣战敌邑显示进军选项
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. mock state: wars 含 (qin, han)、site_han.owner = realm_han、玩家有 idle 军团相邻
      2. render
      3. 断言含 testid "menu-march"
    Expected Result: 进军菜单可见
    Failure Indicators: 显示"宣战并进军"
    Evidence: .sisyphus/evidence/m1-task-3.2-march.txt

  Scenario: 浏览器右键完整流程
    Tool: Playwright (skill: playwright)
    Preconditions: T3.2 完成
    Steps:
      1. dev 服务启动
      2. Playwright right-click on enemy site
      3. 断言 [data-testid="site-context-menu"] visible
      4. 截图
    Expected Result: 菜单显示
    Failure Indicators: 不可见
    Evidence: .sisyphus/evidence/m1-task-3.2-rightclick.png
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-3.2-own-site.txt`
  - [ ] `.sisyphus/evidence/m1-task-3.2-march.txt`
  - [ ] `.sisyphus/evidence/m1-task-3.2-rightclick.png`

  **Commit**: YES (groups with 3)
  - Message: `feat(ui): SiteContextMenu component`
  - Files: `src/ui/components/SiteContextMenu/`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/ui`

- [x] 3.3 **ArmyListPanel 军事面板**

  **What to do**:
  - 新建 `src/ui/components/ArmyListPanel/`
  - 仅当 `selectActivePanel(state) === 'junshi'` 时渲染
  - 显示玩家所有军团：id、所在邑、兵力、状态（idle/marching/retreating）、目标邑（如有）、ticksRemaining
  - 点击军团行 → store.selectArmy(armyId)
  - 选中军团高亮（CSS 边框）
  - testid: `data-testid="army-list-panel"`、`data-testid="army-row-{armyId}"`

  **Must NOT do**:
  - 不要显示其他 realm 军团（仅自己）
  - 不要在面板中加征兵/解散按钮（M1 OUT）
  - 不要做拖拽排序

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: W4
  - **Blocked By**: T2.7

  **References**:

  *Pattern References*:
  - `src/ui/components/TimeControlBar/TimeControlBar.tsx:1-65` - 列表式 UI
  - `docs/design/09-ux-ui.md` §4.2 - 军事面板设计

  **Acceptance Criteria**:
  - [ ] `pnpm test src/ui/components/ArmyListPanel` ≥ 4 case 全绿
  - [ ] 仅 activePanel === 'junshi' 时渲染
  - [ ] 16 军团 × 8 realm，仅显示玩家 2 军团

  **QA Scenarios**:

  ```
  Scenario: 仅显示玩家军团
    Tool: Bash (vitest)
    Preconditions: T3.3 完成
    Steps:
      1. mock store: armies 含 16 个，2 是玩家秦
      2. render
      3. 断言 rows.length === 2
    Expected Result: 仅 2 行
    Failure Indicators: 显示其他 realm 军团
    Evidence: .sisyphus/evidence/m1-task-3.3-army-rows.txt

  Scenario: 点击军团行选中
    Tool: Bash (vitest)
    Preconditions: 同上
    Steps:
      1. render
      2. fire click on army-row-army_qin_1
      3. 断言 store.selectedArmyId === 'army_qin_1'
    Expected Result: 已选中
    Failure Indicators: 未变
    Evidence: .sisyphus/evidence/m1-task-3.3-click.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-3.3-army-rows.txt`
  - [ ] `.sisyphus/evidence/m1-task-3.3-click.txt`

  **Commit**: YES (groups with 3)
  - Message: `feat(ui): ArmyListPanel military panel`
  - Files: `src/ui/components/ArmyListPanel/`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/ui`

- [x] 3.4 **RealmOverviewPanel 王宫面板**

  **What to do**:
  - 新建 `src/ui/components/RealmOverviewPanel/`
  - 仅当 `activePanel === 'wanggong'` 时渲染
  - 显示玩家 realm 总览：
    - 国号 + 全称（"秦 / 秦国"）
    - 首都邑名（"咸阳"）
    - 当前所有邑数 / 全图邑总数（"8 / 50"）
    - 总兵力（所有军团 manpower 求和）
    - 军团数（idle / marching / retreating 分类计数）
    - 当前敌对国数（wars 中含 player 的对数）
  - 配色取自 realm.color（CSS variable）
  - testid: `data-testid="realm-overview-panel"`、`data-testid="realm-name"`、`data-testid="realm-sites-count"`、`data-testid="realm-total-manpower"`

  **Must NOT do**:
  - 不要显示君主/人才/政令/外交等（M1 OUT）
  - 不要做趋势图（M2+）
  - 不要在此面板加按钮（信息只读）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: W4
  - **Blocked By**: T2.7

  **References**:

  *Pattern References*:
  - `docs/design/09-ux-ui.md` §4.1 - 王宫面板设计

  **Acceptance Criteria**:
  - [ ] `pnpm test src/ui/components/RealmOverviewPanel` ≥ 4 case 全绿
  - [ ] 6 个统计数字正确（用受控 fixture）
  - [ ] CSS 主色 = realm.color

  **QA Scenarios**:

  ```
  Scenario: 总兵力 = 所有军团 manpower 求和
    Tool: Bash (vitest)
    Preconditions: T3.4 完成
    Steps:
      1. mock state: 玩家 2 军团，manpower 5000 + 3000
      2. render
      3. 断言 [data-testid="realm-total-manpower"] textContent === '8000'
    Expected Result: 8000
    Failure Indicators: 错误数
    Evidence: .sisyphus/evidence/m1-task-3.4-manpower.txt

  Scenario: 实时跟随 store 更新
    Tool: Playwright (skill: playwright)
    Preconditions: T3.4 完成
    Steps:
      1. dev 启动
      2. 点击 王宫 按钮
      3. 截图初始
      4. 等待 5 倍速 30 秒
      5. 截图后续（数字应有变化——若 AI 攻打了玩家邑）
    Expected Result: 数字至少在 site count 上有变化
    Failure Indicators: 静态不变 → store 未连接
    Evidence: .sisyphus/evidence/m1-task-3.4-realtime.png
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-3.4-manpower.txt`
  - [ ] `.sisyphus/evidence/m1-task-3.4-realtime.png`

  **Commit**: YES (groups with 3)
  - Message: `feat(ui): RealmOverviewPanel realm overview`
  - Files: `src/ui/components/RealmOverviewPanel/`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/ui`

- [x] 3.5 **EventBanner 极简事件横幅**

  **What to do**:
  - 新建 `src/ui/components/EventBanner/`
  - 监听 store.transientBanner，渲染屏幕上沿短暂横幅（3 秒后自动隐藏）
  - 触发场景（在 store 监听 World.events，自动 dispatch showBanner）：
    - 战斗胜利（玩家进攻成功）："秦军占领了 XX 邑"
    - 战斗失败（玩家进攻失败）："秦军在 XX 邑战败，正退回 YY"
    - 玩家邑被占领："XX 国占领了我邑 YY"
    - 玩家宣战："秦国向 XX 国宣战"
    - AI 宣战玩家："XX 国向我宣战"
    - 胜利："江山一统！"（同时 demo banner 显示）
  - testid: `data-testid="event-banner"`
  - 保留 M0 demo-complete banner（参 T3.5 与 T3.6）：当胜利时同时显示 transient banner + 持久 demo-complete

  **Must NOT do**:
  - 不要做 L1-L4 完整通知系统（per scope OUT）
  - 不要做声音（M1 OUT）
  - 不要做事件历史日志面板（M2+）
  - 不要堆叠多 banner（M1 仅显示最新一条）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: W4
  - **Blocked By**: T2.7

  **Acceptance Criteria**:
  - [ ] `pnpm test src/ui/components/EventBanner` ≥ 5 case 全绿
  - [ ] showBanner 后 3 秒自动消失（用 fake timers 测）
  - [ ] 玩家相关事件触发横幅，AI vs AI 事件不触发（噪音过滤）

  **QA Scenarios**:

  ```
  Scenario: 玩家占领触发横幅
    Tool: Bash (vitest)
    Preconditions: T3.5 完成
    Steps:
      1. mock store events: { type: 'siteConquered', byRealm: 'realm_qin', siteName: '宜阳' }
      2. render
      3. 断言 banner textContent 含 '宜阳'
    Expected Result: 显示
    Failure Indicators: 不显示
    Evidence: .sisyphus/evidence/m1-task-3.5-banner.txt

  Scenario: 3 秒后自动消失
    Tool: Bash (vitest with vi.useFakeTimers)
    Preconditions: 同上
    Steps:
      1. showBanner('test')
      2. 断言 visible
      3. vi.advanceTimersByTime(3001)
      4. 断言 not visible
    Expected Result: 消失
    Failure Indicators: 仍显示
    Evidence: .sisyphus/evidence/m1-task-3.5-fade.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-3.5-banner.txt`
  - [ ] `.sisyphus/evidence/m1-task-3.5-fade.txt`

  **Commit**: YES (groups with 3)
  - Message: `feat(ui): EventBanner transient notification`
  - Files: `src/ui/components/EventBanner/`, `src/ui/store/game-store.ts`（绑定 events → banner）
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/ui`

- [x] 3.6 **TopBar 加国号 + 总兵显示 + 重写胜利 hook**

  **What to do**:
  - 修改 `src/ui/components/TopBar/TopBar.tsx`：
    - 加国号显示（左侧）：玩家 realm 的 displayName + fullTitle，配色背景 = realm.color
    - 加总兵显示：所有玩家军团 manpower 求和（带"总兵 N"前缀）
    - 保留现有 date/speed/tick
  - 修改 `src/App.tsx`：
    - 删除 `useAllRed` hook
    - 新增 `useVictory` hook：基于 selector `selectIsVictorious`（来自 victory 系统）
    - 当 victory 时显示 banner：text 改为"江山一统"，**保留 `data-testid="demo-complete"` 不变**（per Metis Q-B4 防 e2e churn）
    - 修改 `src/App.module.css` 的 banner 样式（如需）
  - 测试更新：`src/ui/components/TopBar/__tests__/top-bar.test.tsx` 加国号 + 总兵断言

  **Must NOT do**:
  - 不要改 demo-complete testid（M0 e2e 依赖）
  - 不要在 TopBar 加 民望/威望/国库（M1 OUT，只加国号 + 总兵）
  - 不要让 useVictory 用字符串匹配（用 RealmId）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: W4
  - **Blocked By**: T2.7

  **References**:

  *Pattern References*:
  - `src/App.tsx:9-24` - 现 useAllRed hook（待替换）
  - `src/ui/components/TopBar/TopBar.tsx:1-33` - TopBar 现状

  **Acceptance Criteria**:
  - [ ] TopBar 显示"秦 / 秦国"+ 总兵
  - [ ] 玩家占满全图 → demo-complete banner 显示，文字"江山一统"
  - [ ] e2e/visual.spec.ts、e2e/func.spec.ts、e2e/deliverable.spec.ts 仍 PASS（testid 保留）

  **QA Scenarios**:

  ```
  Scenario: TopBar 显示国号
    Tool: Bash (vitest)
    Preconditions: T3.6 完成
    Steps:
      1. mock store: playerRealm = 秦
      2. render <TopBar />
      3. 断言 textContent 含 '秦' 和 '秦国'
    Expected Result: 显示
    Failure Indicators: 不显示
    Evidence: .sisyphus/evidence/m1-task-3.6-topbar.txt

  Scenario: 胜利时 banner 显示江山一统
    Tool: Playwright (skill: playwright)
    Preconditions: T3.6 完成
    Steps:
      1. test fixture: 玩家占满
      2. dev start
      3. 等待 victory event
      4. 断言 [data-testid="demo-complete"] textContent 含 '江山一统'
    Expected Result: 显示
    Failure Indicators: 文字仍为 '演示完成'
    Evidence: .sisyphus/evidence/m1-task-3.6-victory.png
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-3.6-topbar.txt`
  - [ ] `.sisyphus/evidence/m1-task-3.6-victory.png`

  **Commit**: YES (groups with 3)
  - Message: `feat(ui): TopBar realm name and total manpower`
  - Files: `src/ui/components/TopBar/TopBar.tsx`, `src/ui/components/TopBar/TopBar.module.css`, `src/ui/components/TopBar/__tests__/top-bar.test.tsx`, `src/App.tsx`, `src/App.module.css`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test`

- [ ] 3.7 **MapCanvas 军团图标渲染层 + 选中高亮**

  **What to do**:
  - 在 `src/rendering/map/MapCanvas.tsx` 加新的 draw 阶段：
    - 在涂色完成后，遍历 World.armies
    - 对每个军团绘制小圆点（半径 6-10px）+ 兵力数字（文本居中）
    - 颜色 = realm.color
    - marching/retreating 状态下：圆点画在 source 与 destination 中点（按 ticksRemaining / totalTicks 插值）
    - 选中军团 (selectedArmyId) → 加 2px 金色描边
  - 实现 `drawArmies(ctx, armies, sites, edges, realms, selectedArmyId)` 函数
  - 测试：
    - `src/rendering/map/__tests__/army-render.test.ts` 用 mock canvas 验证 drawArmies 调用次数 = armies.length
    - 选中军团时 stroke 调用更多
  - 视觉验证靠 W4 e2e 截图

  **Must NOT do**:
  - 不要做军团动画补间（M2+）
  - 不要在 canvas 外渲染军团 DOM（保持单一渲染管线）
  - 不要把军团数据从 store 直接拉——通过 props（保持组件解耦）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: W4
  - **Blocked By**: T2.7

  **References**:

  *Pattern References*:
  - `src/rendering/map/MapCanvas.tsx:73-106` - drawMap 流程
  - `src/rendering/map/tile-cache.ts:123-146` - canvas API 用法

  **Acceptance Criteria**:
  - [ ] `pnpm test src/rendering/map/__tests__/army-render.test.ts` ≥ 4 case 全绿
  - [ ] 选中军团时金色描边可见（视觉测试 W4）
  - [ ] 16 军团并发渲染不掉帧（FPS ≥ 30）

  **QA Scenarios**:

  ```
  Scenario: 军团绘制次数等于军团数
    Tool: Bash (vitest with mock canvas)
    Preconditions: T3.7 完成
    Steps:
      1. mock CanvasRenderingContext2D, spy on arc
      2. drawArmies 调用，传入 16 军团
      3. 断言 arc 调用次数 ≥ 16
    Expected Result: 调用足够次
    Failure Indicators: 漏画
    Evidence: .sisyphus/evidence/m1-task-3.7-render-count.txt

  Scenario: 浏览器视觉验证
    Tool: Playwright (skill: playwright)
    Preconditions: T3.7 完成
    Steps:
      1. dev start
      2. 截图初始
      3. 视觉对比基线（baseline png）
    Expected Result: 16 军团可见
    Failure Indicators: 截图无圆点
    Evidence: .sisyphus/evidence/m1-task-3.7-visual.png
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-3.7-render-count.txt`
  - [ ] `.sisyphus/evidence/m1-task-3.7-visual.png`

  **Commit**: YES (groups with 3)
  - Message: `feat(rendering): army icons layer and selection highlight`
  - Files: `src/rendering/map/MapCanvas.tsx`, `src/rendering/map/army-render.ts`, `src/rendering/map/__tests__/army-render.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/rendering`

### Wave 4 · 端到端验证

- [ ] 4.1 **e2e m1-context-menu.spec.ts**

  **What to do**:
  - 新建 `e2e/m1-context-menu.spec.ts`
  - 场景：
    1. 启动 dev → page open
    2. 选中玩家 idle 军团（点击军事面板的军团行 OR 直接点击地图上的军团圆点）
    3. 右键玩家邑 → 期望菜单显示"驻军详情"灰色
    4. 右键已宣战邻邑 → 期望菜单显示"进军 → [军团子菜单]"
    5. 右键未宣战邻邑 → 期望菜单显示"宣战并进军 → [军团子菜单]"
    6. 右键非邻邑 → 期望菜单显示"无可达军团"灰色
    7. 点击外部 → 菜单关闭
  - 截图每个状态作为证据

  **Must NOT do**:
  - 不要 mock store——必须用真实 dev 启动
  - 不要使用 fake timers——使用 Playwright `waitForSelector` 等待
  - 不要让 spec 依赖具体邑名（用 testid 寻址）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要协调启动 dev、Playwright 操作、视觉验证
  - **Skills**: ["playwright"]

  **Parallelization**:
  - **Can Run In Parallel**: YES（W4 内 4 spec 互不冲突）
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: T3.* 全部

  **References**:

  *Pattern References*:
  - `e2e/control.spec.ts:1-20` - e2e 模板（pause 测试）
  - `e2e/deliverable.spec.ts:1-56` - testid 寻址范式
  - `playwright.config.ts:1-end` - 配置

  **Acceptance Criteria**:
  - [ ] `pnpm test:e2e e2e/m1-context-menu.spec.ts` PASS
  - [ ] 7 个场景截图齐全
  - [ ] 无 flaky（连跑 3 次都过）

  **QA Scenarios**:

  ```
  Scenario: 完整右键菜单四态测试
    Tool: Playwright (skill: playwright)
    Preconditions: T4.1 实施完成
    Steps:
      1. 运行 `pnpm test:e2e e2e/m1-context-menu.spec.ts`
      2. 抓取 stdout
    Expected Result: 全部断言通过、退出码 0
    Failure Indicators: 任何 timeout/assertion fail
    Evidence: .sisyphus/evidence/m1-task-4.1-e2e.txt + 7 张截图
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-4.1-e2e.txt`
  - [ ] `.sisyphus/evidence/m1-task-4.1-state-{1..7}.png`

  **Commit**: YES (groups with 4)
  - Message: `test(e2e): m1 context menu interaction`
  - Files: `e2e/m1-context-menu.spec.ts`
  - Pre-commit: `pnpm typecheck && pnpm test:e2e e2e/m1-context-menu.spec.ts`

- [ ] 4.2 **e2e m1-march-conquest.spec.ts**

  **What to do**:
  - 新建 `e2e/m1-march-conquest.spec.ts`
  - 完整玩家征伐路径（脚本驱动）：
    1. dev 启动 → 选中秦的某 idle 军团
    2. 右键宣战邻邑（韩国某 site）→ 选"宣战并进军 → 该军团"
    3. 验证：menu 关闭、event banner 显示"秦国向韩国宣战"、军团状态变 marching
    4. 加速 5x → 等 travel_cost tick（约 N 秒壁钟）
    5. 验证：抵达后该 site 颜色变玄黑（秦色）、event banner 显示"秦军占领了 XX 邑"、军团状态变 idle
    6. 截图 before/after

  **Must NOT do**:
  - 不要在测试中跳 tick（用 5x 真实时间）
  - 不要硬编码邑 ID——通过命令查询玩家邻接邑
  - 不要在测试中 mock 引擎

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: ["playwright"]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: T3.* 全部

  **Acceptance Criteria**:
  - [ ] `pnpm test:e2e e2e/m1-march-conquest.spec.ts` PASS
  - [ ] before/after 截图视觉对比验证占领（颜色改变）
  - [ ] 测试时间 ≤ 60 秒（基于 travel_cost = 3）

  **QA Scenarios**:

  ```
  Scenario: 完整宣战-行军-占领流程
    Tool: Playwright (skill: playwright)
    Preconditions: T4.2 完成
    Steps:
      1. 运行 `pnpm test:e2e e2e/m1-march-conquest.spec.ts`
    Expected Result: 测试通过，after 截图显示 site 已变秦色
    Failure Indicators: 占领未发生
    Evidence: .sisyphus/evidence/m1-task-4.2-conquest.txt + before/after.png
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-4.2-conquest.txt`
  - [ ] `.sisyphus/evidence/m1-task-4.2-before.png`
  - [ ] `.sisyphus/evidence/m1-task-4.2-after.png`

  **Commit**: YES (groups with 4)
  - Message: `test(e2e): m1 march and conquest path`
  - Files: `e2e/m1-march-conquest.spec.ts`
  - Pre-commit: `pnpm test:e2e e2e/m1-march-conquest.spec.ts`

- [ ] 4.3 **e2e m1-ai-behavior.spec.ts**

  **What to do**:
  - 新建 `e2e/m1-ai-behavior.spec.ts`
  - 验证 AI 行为可观察：
    1. dev 启动 → 加速 5x
    2. 等待 60 秒壁钟（约 360 tick）
    3. 通过 console.log 或 page.evaluate 抓取 World.events 数组
    4. 断言：events 中至少有 5 个 type === 'aiDispatchedArmy' 或 'aiDeclaredWar'
    5. 断言：所有 AI 发送的军团 destination 都是邻接（非长程）—— 通过 page.evaluate 取 World 状态验证
    6. 截图地图最终状态（应有彩色斑驳，证 AI 攻打过）

  **Must NOT do**:
  - 不要通过 fake AI 测——必须用真实运行
  - 不要 sleep 过久（≤ 90 秒壁钟）
  - 不要把 AI 内部决策日志泄露到生产 build（dev only）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: ["playwright"]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: T3.* 全部

  **Acceptance Criteria**:
  - [ ] `pnpm test:e2e e2e/m1-ai-behavior.spec.ts` PASS
  - [ ] 60 秒壁钟内 ≥ 5 AI 动作可观察
  - [ ] 所有 AI 订单 destination 是 source 邻接

  **QA Scenarios**:

  ```
  Scenario: AI 在 60 秒壁钟内多次发起攻击
    Tool: Playwright (skill: playwright)
    Preconditions: T4.3 完成
    Steps:
      1. 运行 `pnpm test:e2e e2e/m1-ai-behavior.spec.ts`
    Expected Result: events 含 ≥ 5 个 AI 动作
    Failure Indicators: < 5 → AI 太懒，调参
    Evidence: .sisyphus/evidence/m1-task-4.3-ai-events.txt + map.png
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-4.3-ai-events.txt`
  - [ ] `.sisyphus/evidence/m1-task-4.3-map.png`

  **Commit**: YES (groups with 4)
  - Message: `test(e2e): m1 AI behavior observability`
  - Files: `e2e/m1-ai-behavior.spec.ts`
  - Pre-commit: `pnpm test:e2e e2e/m1-ai-behavior.spec.ts`

- [ ] 4.4 **e2e m1-30min-playthrough + m1-victory（关键交付）**

  **What to do**:
  - 新建 **两个 spec**：
    - `e2e/m1-30min-playthrough.spec.ts`：
      1. dev 启动 → 加速 5x
      2. 等待 6 分钟壁钟（5x × 6min = 30 game-min ≈ 360 ticks ≈ 30 旬，约 1 年游戏时间）
      3. 期间每 30 秒 page.evaluate 取 FPS 与异常计数
      4. 断言：全程无 console.error、FPS ≥ 30
      5. 加速时间不应让任何 phase 超过 50ms（埋监控）
    - `e2e/m1-victory.spec.ts`：
      1. dev 启动 + 特殊"victory fixture"（用 URL 参数 ?fixture=near-victory，让玩家开局就拥有 49/50 邑，仅剩 1 邑被周占）
      2. 选中玩家相邻军团 → 右键最后 1 邑 → 宣战并进军
      3. 等待抵达 + 战斗
      4. 断言 `[data-testid="demo-complete"]` visible，textContent 含 "江山一统"
      5. 截图

  **Must NOT do**:
  - 不要让 30min spec 跑 actual 30 min（用 5x = 6 min 壁钟）
  - 不要让 victory spec 用 mock 跳过战斗——必须真实跑
  - 不要跳过 e2e flaky 重试（playwright.config 的 retries 默认即可）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: ["playwright"]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: T3.* 全部

  **References**:

  *Pattern References*:
  - `e2e/deliverable.spec.ts:43-55` - 35 秒 after-30s 测试模式
  - `e2e/visual.spec.ts:1-113` - 视觉验证范式
  - `playwright.config.ts:1-end` - timeout 配置

  **Acceptance Criteria**:
  - [ ] `pnpm test:e2e e2e/m1-30min-playthrough.spec.ts` PASS（6 分钟壁钟内 0 错）
  - [ ] `pnpm test:e2e e2e/m1-victory.spec.ts` PASS（江山一统横幅）
  - [ ] FPS 全程 ≥ 30（埋点取样证据保存）

  **QA Scenarios**:

  ```
  Scenario: 30 分钟回放无掉帧无错
    Tool: Playwright (skill: playwright)
    Preconditions: T4.4 完成
    Steps:
      1. 运行 `pnpm test:e2e e2e/m1-30min-playthrough.spec.ts`
      2. 抓取 stdout 与 FPS 取样
    Expected Result: 测试通过 + FPS samples 全 ≥ 30
    Failure Indicators: 任何 FPS 取样 < 30
    Evidence: .sisyphus/evidence/m1-task-4.4-30min.txt + fps-samples.json

  Scenario: 江山一统横幅显示
    Tool: Playwright (skill: playwright)
    Preconditions: T4.4 完成
    Steps:
      1. 运行 `pnpm test:e2e e2e/m1-victory.spec.ts`
      2. 抓取 stdout
    Expected Result: 测试通过、最终截图显示横幅
    Failure Indicators: 横幅不显示或文字错
    Evidence: .sisyphus/evidence/m1-task-4.4-victory.txt + victory.png
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/m1-task-4.4-30min.txt`
  - [ ] `.sisyphus/evidence/m1-task-4.4-fps-samples.json`
  - [ ] `.sisyphus/evidence/m1-task-4.4-victory.txt`
  - [ ] `.sisyphus/evidence/m1-task-4.4-victory.png`

  **Commit**: YES (groups with 4)
  - Message: `test(e2e): m1 30-min playthrough and victory`
  - Files: `e2e/m1-30min-playthrough.spec.ts`, `e2e/m1-victory.spec.ts`, `src/main.tsx`（如需 ?fixture URL 参数支持）
  - Pre-commit: `pnpm test:e2e e2e/m1-30min-playthrough.spec.ts e2e/m1-victory.spec.ts`

---

## Final Verification Wave (在所有实施任务后 · 强制)

> 4 个审查代理并行运行。**所有**必须通过。然后呈现给用户并获得明确"okay"才算完成。
>
> **不要**在审查后自动推进。在收到用户明确"okay"前，**绝不**勾选 F1-F4 或宣告"完成"。
> 拒绝或用户反馈 → 修复 → 重新运行 → 再次呈现 → 等待 okay。

- [ ] F1. **计划合规审计** — `oracle`
  逐句通读本计划。对每条 "Must Have"：验证实现存在（read 文件/curl 端点/run 命令）。对每条 "Must NOT Have"：搜索代码库中是否有禁用模式 — 如发现，列出 file:line 拒绝。检查 `.sisyphus/evidence/` 中证据文件齐备。比对交付物与计划。
  输出格式：`Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **代码质量审查** — `unspecified-high`
  运行 `pnpm typecheck` + `pnpm lint` + `pnpm test`。审查所有变更文件：`as any`/`@ts-ignore`、空 catch、生产代码 console.log（事件横幅除外）、注释代码、未使用 import。检测 AI slop：过度注释、过度抽象、泛型命名（data/result/item/temp）。
  输出：`Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **真实手工 QA 执行** — `unspecified-high`（+ `playwright` skill）
  从干净状态开始。手工执行**每个任务的每个 QA scenario**——遵循确切步骤、捕获证据。测试跨任务集成（多系统协同，不是孤立）。测试边缘场景：选中军团-切换势力、退却中目标被占、AI 与玩家同 tick 攻击同邑。证据保存到 `.sisyphus/evidence/m1-final-qa/`。
  输出：`Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **范围保真度检查** — `deep`
  对每个任务：read "What to do"，read 实际 git diff（git log/diff）。1:1 比对——规范中的全部都被构建了吗（无遗漏）？规范之外的有被构建吗（无蔓延）？检查 "Must NOT do" 合规性。检测跨任务污染：T-N 接触了 T-M 的文件吗？标记未归属变更。
  输出：`Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

> 每个任务完成后立即提交。每个 wave 内任务之间互相独立，无 wave 内冲突。

- W0-T0.1: `feat(map): add travel_cost field to MapEdge`
- W1-T1.1: `refactor(types): rename Faction to Realm and expand fields`
- W1-T1.2: `feat(types): add Army, Order, War shared types and schemas`
- W1-T1.3: `feat(schemas): introduce M1DataSchema with runtime validation`
- W1-T1.4: `chore(engine): delete painting system and add phase chain constants`
- W1-T1.5: `feat(tools): add M1 map generator with realm assignment`
- W1-T1.6: `content(m1): hand-author historical site labels for warring states`
- W1-T1.7: `feat(types): add warKey utility and wars data structure`
- W1-T1.8: `feat(ui): add BottomBar component scaffold`
- W2-T2.1: `feat(engine/combat): instant combat resolution with defender bonus`
- W2-T2.2: `feat(engine/march): march system based on travel_cost`
- W2-T2.3: `feat(engine/ai): 80/20 random aggression AI`
- W2-T2.4: `feat(engine/victory): player ownership victory check`
- W2-T2.5: `feat(engine/orders): player order application system`
- W2-T2.6: `feat(rendering): add point-in-polygon hit test for sites`
- W2-T2.7: `feat(ui/store): add selectedArmyId, contextMenu, playerRealmId`
- W3-T3.1: `feat(engine): wire phase chain into factory and raf-driver`
- W3-T3.2: `feat(ui): SiteContextMenu component`
- W3-T3.3: `feat(ui): ArmyListPanel military panel`
- W3-T3.4: `feat(ui): RealmOverviewPanel realm overview`
- W3-T3.5: `feat(ui): EventBanner transient notification`
- W3-T3.6: `feat(ui): TopBar realm name and total manpower`
- W3-T3.7: `feat(rendering): army icons layer and selection highlight`
- W4-T4.1: `test(e2e): m1 context menu interaction`
- W4-T4.2: `test(e2e): m1 march and conquest path`
- W4-T4.3: `test(e2e): m1 AI behavior observability`
- W4-T4.4: `test(e2e): m1 30-min playthrough and victory`

提交规范：常规 commit + scope（map/types/engine/ui/rendering/tools/content/test）。每提交前必须 pass `pnpm typecheck && pnpm lint && pnpm test`。

---

## Success Criteria

### 验证命令

```bash
# 静态守门
pnpm typecheck                                           # 期望：0 errors
pnpm lint                                                # 期望：0 warnings
pnpm test                                                # 期望：~40 spec all pass

# 架构守门（必须通过，否则代表层墙被破坏）
pnpm test src/__tests__/banned-deps.test.ts              # 期望：PASS
pnpm test src/__tests__/no-any.test.ts                   # 期望：PASS
pnpm test src/engine/__tests__/architecture-purity.test.ts # 期望：PASS

# 系统单测
pnpm test src/engine/systems/combat                      # 期望：≥10 table-driven scenarios pass
pnpm test src/engine/systems/march                       # 期望：行军 tick 数精确匹配
pnpm test src/engine/systems/ai                          # 期望：seed=42 确定性快照通过
pnpm test src/engine/systems/victory                     # 期望：占满全图 → 触发；任意一邑非己 → 不触发
pnpm test src/engine/phases                              # 期望：阶段顺序常量正确
pnpm test src/shared                                     # 期望：M1DataSchema 接受合法/拒绝非法

# 内容守门
pnpm test src/content/m1                                 # 期望：邻接图闭包（BFS 全连通）+ 8 国分布正确

# E2E
pnpm test:e2e e2e/m1-context-menu.spec.ts                # 期望：右键菜单显示+点击进军生效
pnpm test:e2e e2e/m1-march-conquest.spec.ts              # 期望：完整征伐流程
pnpm test:e2e e2e/m1-ai-behavior.spec.ts                 # 期望：AI 决策可观察
pnpm test:e2e e2e/m1-30min-playthrough.spec.ts           # 期望：5 倍速 6 分钟壁钟无错无 FPS<30
pnpm test:e2e e2e/m1-victory.spec.ts                     # 期望：[data-testid="demo-complete"] 显示"江山一统"

# 完整套餐
pnpm test:all                                            # 期望：typecheck+lint+vitest+e2e 全绿
pnpm build                                               # 期望：dist/ 输出无错
```

### 最终清单

- [ ] 所有 "Must Have" 存在并可验证
- [ ] 所有 "Must NOT Have" 在代码库中不存在（grep 验证）
- [ ] `pnpm test:all` 全绿
- [ ] 5 个新 e2e spec 全部通过
- [ ] 30 分钟回放无掉帧（FPS ≥ 30 全程）
- [ ] 用户手工玩通一局，达到江山一统
- [ ] `boulder.json` `active_plan` 已切换为 `m1-core-loop.md`
- [ ] 所有 27 个任务的 commit 都在 git log 中
- [ ] F1-F4 四个审查全部 APPROVE
- [ ] 用户明确表态"okay"后才算计划完成
