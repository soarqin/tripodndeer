# M0 · 引擎雏形（Engine Prototype）

## TL;DR

> **Quick Summary**: 搭建鼎鹿（Tripod & Deer）项目的最小可行引擎雏形——让 5 块不规则色块在地图上随时间演变，验证 Engine / Rendering / UI 三层架构契约可工作。
>
> **Deliverables**:
> - 可运行的 Vite + React + TypeScript 项目脚手架（pnpm + ESLint + Prettier + 严格 TS）
> - Engine 层：时钟（5 档速度）、PRNG（Mulberry32）、Tick phase 数组、涂色系统、游戏日期算术
> - Rendering 层：Canvas 单层多边形渲染（不规则边缘 + 势力色填充）
> - UI 层：顶栏（日期 + 速度 + Tick 数）+ 时间控制条（暂停 + 5 档速度按钮）
> - 5 个抽象邑（site_1..site_5）的硬编码 JSON（不规则 polygon + adjacency）
> - 一次性开发工具脚本（`tools/generate-m0-map.ts`）生成不规则多边形
> - Vitest 双环境配置（engine = node, ui = jsdom）+ 关键路径测试
> - Playwright E2E + 视频/截图作为人工评审材料
>
> **Estimated Effort**: Medium（路线图估算 4–6 周；本计划拆为 14 个独立任务）
> **Parallel Execution**: YES — 4 波并行
> **Critical Path**: T1 → T6 → T8 → T9 → T12 → F1-F4 → 用户最终 Go/No-Go

---

## Context

### Original Request
用户原话："参考 11-roadmap.md 的 M0 引擎雏形，编写 M0 的计划"

来源：[`docs/design/11-roadmap.md`](../../docs/design/11-roadmap.md) §3 · M0 章节。

### Interview Summary

**用户决策（已确认）**：
| 决策点 | 用户选择 | 影响 |
|------|--------|------|
| 5 邑数据风格 | 纯演示抽象命名（site_1..site_5），但要求不规则多边形边缘 | 需引入 polygon 顶点数据契约 + 一次性生成工具 |
| 涂色规则 | 单向红吞蓝（每 N tick 红色随机吞噬一个相邻蓝） | 涂色系统是 M0 唯一的 Tick phase |
| 测试基础设施 | 搭建 Vitest + 关键路径测试 | Engine 必须可在 node 环境单独测试 |
| 目录结构粒度 | 仅 M0 实际需要的子目录 | 不为未来子系统创建空目录 |
| 顶栏内容 | 日期 + 速度档 + Tick 数 | 调试可视化 + 演示信息 |
| 注释语言 | 中文注释，标识符英文 | 与设计文档语境一致 |

**关键设计文档参考**：
- [`docs/design/11-roadmap.md`](../../docs/design/11-roadmap.md) §3（M0 范围与验收）
- [`docs/design/10-tech.md`](../../docs/design/10-tech.md) §1.1（技术选型）、§2（分层）、§3（Engine）、§5（Schema）、§8（项目结构）、§10（测试）、§11（工程纪律）
- [`docs/design/01-core-loop.md`](../../docs/design/01-core-loop.md) §2.2（时间速度档位与 Tick 间隔）
- [`docs/design/02-map.md`](../../docs/design/02-map.md) §3（邻接图）、§4（涂色与控制度）、§4.4（涂色过渡动画）

### Metis Review

**Metis 识别的关键架构债务（已全部纳入 directive，详见 §Work Objectives）**：
- ❗ **Faction 用 opaque ID 而非 color literal**：`ownerId: 'faction_red' | 'faction_blue'` + factions 表查色，避免 M1 大规模重写（迁移成本 1-2 天 → 30 分钟）
- ❗ **PRNG 状态在 WorldState**：不能放在 module-level 闭包，否则 M11 存档系统会断档
- ❗ **Tick phases 数组形状从第一天**：M0 仅 1 phase，但形状是 `phases: Array<(world,rng) => world>`，M1 可直接插入新 phase
- ❗ **Tick 返回 `{world, events: []}`**：M0 events 为空数组占位，M1 需要 hook
- ❗ **deltaMs cap**：防止 tab-backgrounded 后 RAF 累积时间触发"死亡螺旋"
- ❗ **游戏日期算术独立模块**：旬→月→季→年→纪 carry + BC 日期处理（无零年），是 pure 模块
- ❗ **engine 层零 UI 依赖**：通过 ESLint 规则 + Vitest 测试双重保障
- ❗ **Zod schema 在加载时强制校验**：不仅是 TS 类型，避免 JSON 错误隐式接受

**Metis 建议的验收标准重构**（路线图原文不可被 agent 验证，已重写为可验证形式，详见 §Verification Strategy）

---

## Work Objectives

### Core Objective
搭建一个最小可行引擎雏形，验证"时钟 → 模拟推进 → Canvas 重绘 → UI 反馈"的完整数据流，并建立 M1+ 不可破坏的架构契约（分层、PRNG 在 World、Tick phase 数组、Faction opaque ID）。

### Concrete Deliverables

| # | 交付物 | 路径 |
|---|------|------|
| D1 | Vite + React + TS 项目脚手架 | `package.json`, `vite.config.ts`, `tsconfig.json`, `.eslintrc.cjs`, `.prettierrc` |
| D2 | M0 邑数据（5 个不规则多边形 + 邻接） | `src/content/m0/sites.json` |
| D3 | M0 一次性数据生成工具 | `tools/generate-m0-map.ts` |
| D4 | Engine 层 | `src/engine/{clock,world,random,date,systems/painting}/` |
| D5 | Rendering 层 | `src/rendering/map/` |
| D6 | UI 层 | `src/ui/{components,store}/` |
| D7 | 共享类型 | `src/shared/` |
| D8 | Vitest 双环境配置 + 关键路径测试 | `vitest.config.ts`, `src/**/*.test.ts` |
| D9 | Playwright E2E 测试 + 视频/截图 | `e2e/`, `artifacts/` |
| D10 | 入口与启动 | `src/main.tsx`, `index.html`, `README.md` |

### Definition of Done

执行完所有任务后：
- `pnpm install && pnpm dev` 启动开发服务器，浏览器看到 5 块不规则色块在变化
- `pnpm test` 全部 Vitest 通过
- `pnpm test:e2e` 全部 Playwright 通过，artifacts 目录含 video + 3 张 screenshot
- `pnpm typecheck` 零错误
- `pnpm lint` 零警告
- `pnpm build` 生产构建成功
- 所有 §Verification Strategy 中的 QA-* 标准通过
- 人工评审：观看 `artifacts/m0-demo.webm`，主创团队 Go/No-Go 评审通过

### Must Have（不可砍）

- ✅ Vite + React + TypeScript（strict）项目脚手架
- ✅ Canvas 渲染 5 个不规则多边形邑
- ✅ 时钟系统（暂停 + 5 档速度，Tick=旬）
- ✅ 涂色系统（每 N tick 红吞蓝相邻）
- ✅ 顶栏（日期 + 速度档 + Tick 数）
- ✅ 时间控制条（暂停 + 1x/2x/3x/4x/5x 按钮）
- ✅ Engine / Rendering / UI 三层目录契约
- ✅ Faction opaque ID（不是 color literal）
- ✅ PRNG 状态在 WorldState
- ✅ Tick phases 数组形状（即使只有 1 个 phase）
- ✅ deltaMs cap 防 tab-background 死亡螺旋
- ✅ 游戏日期算术独立纯模块（含 BC 处理）
- ✅ Zod schema 加载时强制校验
- ✅ 双环境 Vitest（engine=node, ui=jsdom）
- ✅ Engine 层零 UI 依赖（自动化检查）
- ✅ 涂色 0.3s 颜色过渡（per `02-map.md §4.4`，让"feel"可被人眼观察）

### Must NOT Have（守住边界）

**M1+ 实体（绝不引入）**：
- ❌ Realm / Faction（除 opaque ID 占位字符串外，没有任何实体）
- ❌ Province / Region / 任何空间层级（仅 Site）
- ❌ Character / Army / Pass / 任何子系统实体

**M1+ Site 属性（绝不添加）**：
- ❌ `terrain`, `defense_value`, `population_base`, `economy`
- ❌ `cultural`, `historical_owner`, `type`（capital/边塞 等）
- ❌ 邻接边属性（`travel_cost`, `strategic_pass`, `type`）

**M1+ UI（绝不引入）**：
- ❌ 缩放、平移、地图模式切换
- ❌ Site hit-test、hover 效果、点击交互
- ❌ 通知系统、事件日志、Chronicle、自动暂停
- ❌ 季节系统、关隘可视化
- ❌ 任何子系统面板（军事/外交/内政等）

**持久化（绝不引入）**：
- ❌ IndexedDB / Dexie / 任何存档
- ❌ i18n（react-i18next 等）—— 硬编码 ~5 个中文字符串

**抽象层（绝不"为未来灵活"）**：
- ❌ 插件系统、DI 容器、event bus、observer 基础设施
- ❌ 泛型 `EntityRegistry<T>`、visitor pattern for tick phases
- ❌ Web Worker、OffscreenCanvas（M9 再考虑）
- ❌ 对象池、memoization、空间索引（M12 再考虑）

**画布效果（绝不抛光）**：
- ❌ 反走样设置、阴影、渐变、hover 高亮、双层边框
- ❌ 粒子效果、屏幕震动

**工具链膨胀（绝不引入）**：
- ❌ Husky、lint-staged、commitlint、semantic-release
- ❌ Bundle analyzer、PWA manifest、Service Worker
- ❌ 多环境配置（.env.production 等）

**禁用依赖列表**（除 `10-tech.md §1.1` 锁定栈外）：
- ❌ `date-fns`, `dayjs`, `moment` —— 自己写 30 行日期算术
- ❌ `lodash`, `immutable`, `rxjs`
- ❌ `react-i18next`, `i18next`
- ✅ `d3-delaunay` —— 仅允许在 `tools/`（devDependencies），运行时 `src/` 永不导入

**TS 工程纪律**（per `10-tech.md §11.2`）：
- ❌ `any`, `@ts-ignore`, `@ts-expect-error`（违者 lint 报错）
- ❌ 函数体 > 50 行（除非业务必要 + 注释）

---

## Verification Strategy

> **零人工干预原则** —— 所有验收都由 agent 执行，人工只做最终 Go/No-Go 评审视频/截图。
> 每个 task 都包含具体的 QA Scenario（见 §TODOs 各 task 的 QA Scenarios 字段）。
> 这里给出**总体验证矩阵**，task 内 QA 是矩阵的具体执行。

### Test Decision
- **Infrastructure exists**: NO（项目从零开始）
- **Automated tests**: YES (Tests-after for each task)
- **Framework**: Vitest（单元/集成）+ Playwright（E2E）
- **环境策略**：Vitest 双环境—— `environment: 'node'` for `src/engine/**` 测试，`environment: 'jsdom'` for `src/ui/**` 测试

### QA Policy

每个 task 必须包含 agent 可执行的 QA Scenarios。证据保存到 `.sisyphus/evidence/task-{N}-{slug}.{ext}`。

- **前端/UI**：Playwright（启动 dev server → 操作 → 断言 DOM/Canvas → 截图）
- **CLI/工具**：Bash（运行 `pnpm` 命令 → 断言 exit code + 输出）
- **Engine 纯函数**：Vitest（在 Node 环境运行，不需要浏览器）
- **架构契约**：Vitest 自定义测试（扫描源文件，检查依赖与禁用模式）

### 关键验证矩阵（取代路线图原始模糊验收标准）

| ID | 类别 | 验证方法 | 通过条件 |
|----|------|--------|---------|
| QA-PERF-1 | 性能 | Playwright 60s 5x-speed 跑，监听 console.error | 0 个 error 级别消息 |
| QA-PERF-2 | 性能 | Vitest 跑 1000 次 worldStep，记 perf.now delta | p99 < 1ms |
| QA-PERF-3 | 性能 | React Profiler 包 TopBar/MapCanvas，手动 +1 tick | 各组件 render 次数 ≤ 1 |
| QA-DELIVERABLE-1 | 交付 | Playwright 检查所有 data-testid 选择器 | 全部找到 + 3 张截图保存 |
| QA-DELIVERABLE-2 | 交付 | Playwright video 录制 35s+ | `artifacts/m0-demo.webm` 存在 |
| QA-FUNC-1 | 功能 | 5x speed 跑 90s，每秒查询 red 站点数 | 90s 内 count 达到 5 |
| QA-FUNC-2 | 功能 | 单元测试：red 仅有不相邻蓝邻居，跑 100 次 paintingStep | 仅相邻 blue 翻红 |
| QA-FUNC-3 | 功能 | 单元测试：red 无 blue 邻居 | paintingStep 返回相同 world |
| QA-FUNC-4 | 功能 | 单元测试：所有 site 全红 | paintingStep 返回相同 world |
| QA-CONTROL-1 | 控制 | Playwright：3x→pause→等待 5s | tick 数停止增长 |
| QA-CONTROL-2 | 控制 | Playwright：每档速度等待 5s 测 ticksFired | \|实际-期望\|/期望 ≤ 25% |
| QA-CONTROL-3 | 控制 | Vitest mock perf.now：1x speed 中途切 5x | tick 计数符合 rescaling 规则 |
| QA-DETERMINISM-1 | 确定性 | Vitest：相同 seed 跑 20 ticks 两次 | (tick, paintedSiteId) 列表完全相等 |
| QA-DETERMINISM-2 | 确定性 | Vitest：seed=12345 vs seed=67890 跑 20 ticks | 两列表不相等（sanity） |
| QA-ARCH-1 | 架构 | 扫描 `src/engine/**/*.ts` 的 import | 零 react/react-dom/zustand/dom 引用 |
| QA-ARCH-2 | 架构 | 检查 vitest 配置 | engine 测试 environment='node' |
| QA-ARCH-3 | 架构 | 检查 WorldState 类型 + 模块层无可变 RNG | World 含 `rngState`（seed+counter）字段；engine 模块无 module-level PRNG 状态 |
| QA-ARCH-4 | 架构 | 解析 package.json | 禁用依赖一个不在；d3-delaunay 仅 dev |
| QA-ARCH-5 | 架构 | 扫描 src/ + tsconfig | 零 any/@ts-ignore，strict: true |

### 人工 Go/No-Go 评审（OUT-OF-AGENT GATE）

> 这是路线图 §10.3 规定的**人类最终关卡**。Agent 只负责生成评审材料：
> - `artifacts/m0-demo.webm`：35s+ 完整演示视频
> - `artifacts/m0-{initial,paused,after-30s}.png`：3 张关键状态截图
> - 主创团队观看 → 回答："这就是我们想要的手感吗？"
> - 答 YES → M0 PASS；答 NO → 创建 M0.1 修订计划。

---

## Execution Strategy

### Parallel Execution Waves

> 5–8 tasks/wave 目标。Wave 1 = 全部独立基础任务（最大并发）。

```
Wave 1 (立即启动 — 6 个独立基础任务):
├── T1: 项目脚手架（package.json + Vite + TS strict + ESLint + Prettier） [quick]
├── T2: 共享类型与 Zod schema（Site / WorldState / FactionId / GameDate） [quick]
├── T3: PRNG 模块（Mulberry32 纯函数 + 状态在外部） [quick]
├── T4: 游戏日期算术（tickToGameDate + Chinese 格式化 + BC 处理） [quick]
├── T5: M0 地图数据生成工具（tools/generate-m0-map.ts，timebox 4h） [unspecified-low]
└── T11: 架构强制规则（ESLint no-restricted-imports + 测试） [quick]

Wave 2 (Wave 1 完成后 — 引擎核心 4 任务，内部 micro-order):
├── T6: 时钟（advanceClock 纯函数 + Tick phases 数组）[deep] ← 依赖 T2, T3
├── T7: 涂色系统（paintingStep 纯函数 + 邻接判定）[deep] ← 依赖 T2, T3
├── T8: WorldState 工厂 + 加载 m0 数据 + Zod 校验 [quick] ← 依赖 T2, T5, **T7**（需要 paintingStep）
└── T9: Zustand store 桥接（订阅式更新）[unspecified-high] ← 依赖 T2, T6, T7, T8

Wave 2 micro-ordering:
  - T6 与 T7 完全并行（无相互依赖）
  - T8 可与 T6/T7 并行启动（占位 phases:[]），但完成需等 T7
  - T9 必须等 T6/T7/T8 全部完成（桥接所有 engine 核心）

Wave 3 (Wave 2 完成后 — 表现层 3 任务):
├── T10: Canvas 地图渲染（多边形 + 颜色过渡 0.3s） [visual-engineering] ← 依赖 T2, T9
├── T12: 顶栏（日期 + 速度 + Tick 数显示） [visual-engineering] ← 依赖 T4, T9
└── T13: 时间控制条（暂停 + 5 档速度按钮） [visual-engineering] ← 依赖 T6, T9

Wave 4 (Wave 3 完成后 — 集成与验证):
├── T14: 应用入口与组装（main.tsx + App.tsx + index.html） [quick] ← 依赖 T6, T9, T10, T12, T13
└── T15: E2E 与交付物（Playwright + video + 截图 + 全 QA 矩阵） [unspecified-high] ← 依赖 T14

Wave FINAL (T15 完成后 — 4 路并行评审 → 用户 Go/No-Go):
├── F1: 计划合规审计（oracle）
├── F2: 代码质量审查（unspecified-high）
├── F3: 真实手工 QA 执行（unspecified-high + playwright）
└── F4: 范围保真度检查（deep）
→ 4 路 APPROVE → 呈现给用户 → 等待主创"Go" → 标记 M0 完成

Critical Path: T1 → T6 → T9 → T10/T12/T13 → T14 → T15 → F1-F4 → 用户 okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1 项目脚手架 | — | T6, T7, T8, T9, T10, T11, T12, T13, T14, T15 | 1 |
| T2 类型 + Zod schema | — | T6, T7, T8, T9, T10 | 1 |
| T3 PRNG | — | T6, T7 | 1 |
| T4 游戏日期算术 | — | T12 | 1 |
| T5 地图数据生成工具 | — | T8 | 1 |
| T11 架构强制规则 | — | T15（验证） | 1 |
| T6 时钟 | T1, T2, T3 | T13, T14 | 2 |
| T7 涂色系统 | T1, T2, T3 | T14 | 2 |
| T8 WorldState 工厂 | T1, T2, T5, T7 | T9 | 2 |
| T9 Zustand store | T1, T2, T6, T7, T8 | T10, T12, T13, T14 | 2 |
| T10 Canvas 渲染 | T1, T2, T9 | T14 | 3 |
| T12 顶栏 | T1, T4, T9 | T14 | 3 |
| T13 时间控制条 | T1, T6, T9 | T14 | 3 |
| T14 应用入口与组装 | T1, T6, T9, T10, T12, T13 | T15 | 4 |
| T15 E2E + 交付物 | 全部 T1-T14 | F1-F4 | 4 |

### Agent Dispatch Summary

| Wave | 任务数 | 派遣方案 |
|------|------|--------|
| 1 | 6 | T1 → `quick` · T2 → `quick` · T3 → `quick` · T4 → `quick` · T5 → `unspecified-low` · T11 → `quick` |
| 2 | 4 | T6 → `deep` · T7 → `deep` · T8 → `quick` · T9 → `unspecified-high` |
| 3 | 3 | T10 → `visual-engineering` · T12 → `visual-engineering` · T13 → `visual-engineering` |
| 4 | 2 | T14 → `quick` · T15 → `unspecified-high` |
| FINAL | 4 | F1 → `oracle` · F2 → `unspecified-high` · F3 → `unspecified-high` + skill `playwright` · F4 → `deep` |

---

## TODOs

- [x] 1. **项目脚手架（Vite + React + TS strict + Lint pipeline）**

  **What to do**:
  - `pnpm init` 创建 `package.json`，name = `tripodndeer`，private = true
  - 添加锁定依赖（运行时）：`react@^18.3`, `react-dom@^18.3`, `zustand@^4.5`, `immer@^10`, `zod@^3.23`
  - 添加锁定 devDependencies：`typescript@^5.4`, `vite@^5`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `prettier`, `eslint-config-prettier`, `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@playwright/test`
  - 配置 `tsconfig.json`：`strict: true`, `noUncheckedIndexedAccess: true`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `paths: { "@/*": ["src/*"] }`
  - 配置 `vite.config.ts`：plugin-react，alias `@` → `src`
  - 配置 `.eslintrc.cjs`：extends typescript-eslint recommended + react/react-hooks + prettier；rules：禁 `any`, 禁 `@ts-ignore`/`@ts-expect-error`，max-lines-per-function: 50（warn）
  - 配置 `.prettierrc`：单引号、无分号、80 字符行宽（与设计文档语境一致）
  - 配置 `index.html`：title="鼎鹿 · Tripod and Deer · M0"，引用 `/src/main.tsx`
  - 创建空目录占位（仅 M0 用到的）：`src/{engine,rendering,ui,content,shared}/`，每个放一个 `.gitkeep`
  - `package.json` scripts：`dev`, `build`, `preview`, `typecheck`(tsc --noEmit), `lint`, `lint:fix`, `format`, `test`, `test:ui`, `test:e2e`
  - **创建占位 `src/main.tsx`**（最小可运行内容，让 dev/build 立即可通过）：
    ```tsx
    import { StrictMode } from 'react'
    import { createRoot } from 'react-dom/client'
    // 占位入口 — T14 将替换为完整应用（顶栏 + Canvas + 时间控制条）
    const root = document.getElementById('root')
    if (!root) throw new Error('Root element #root not found')
    createRoot(root).render(<StrictMode><div>Tripod and Deer · M0 (scaffolding)</div></StrictMode>)
    ```
    T14 会完全重写此文件为最终应用入口。T1 仅提供"占位"，让脚手架自洽，dev/build 验收可立即通过。
  - 配置 `vitest.config.ts`：基础配置（默认 `environment: 'node'`；T11 会增加 overrides 让 `src/ui/**` 用 jsdom）
  - 创建 `README.md` 项目骨架，说明 M0 范围

  **Must NOT do**:
  - ❌ 引入禁用依赖：`date-fns`, `dayjs`, `moment`, `lodash`, `immutable`, `rxjs`, `react-i18next`
  - ❌ 设置 Husky / lint-staged / commitlint / semantic-release
  - ❌ 添加 PWA / Service Worker / Bundle analyzer
  - ❌ 创建 `engine/systems/military|diplomacy|economy|culture|intelligence/` 任何子系统占位目录
  - ❌ 创建 `persistence/` 目录（M0 不存档）
  - ❌ 创建 `localization/` 目录（M0 硬编码中文）
  - ❌ 写任何 `as any` 或忽略指令

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯配置工作，逐行复制 + 调试，无需深度推理
  - **Skills**: 无
    - 不需要专项技能；标准 Node 工程化即可

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与 T2/T3/T4/T5/T11 并行）
  - **Blocks**: T6, T7, T8, T9, T10, T11, T12, T13, T14, T15
  - **Blocked By**: None（可立即启动）

  **References**:

  **Pattern References**:
  - `docs/design/10-tech.md` §1.1 "总览"表 - 整套技术栈与版本
  - `docs/design/10-tech.md` §8 "项目结构草案" - 目录层次（仅取 M0 用到的）
  - `docs/design/10-tech.md` §11.1 "命名" - 文件名 kebab-case，标识符 camelCase/PascalCase
  - `docs/design/10-tech.md` §11.2 "代码风格" - 严禁 any/@ts-ignore + 函数 ≤50 行

  **External References**:
  - Vite 官方 React 模板：https://vitejs.dev/guide/#scaffolding-your-first-vite-project
  - TypeScript strict 选项：https://www.typescriptlang.org/tsconfig#strict
  - typescript-eslint v7+ 配置：https://typescript-eslint.io/getting-started

  **WHY Each Reference Matters**:
  - `10-tech.md §1.1` 是技术栈唯一权威来源。锁定的依赖与版本不能改，否则 M1+ 的设计假设会破坏。
  - `10-tech.md §11.2` 提供禁用模式 list，配置 ESLint 必须落地这些规则，否则 F2 评审会拒绝。
  - 现有项目目录仅有 `docs/`，不要影响它。

  **Acceptance Criteria**:
  - [ ] `pnpm install` 退出 0，无 peer warning
  - [ ] `pnpm typecheck` 退出 0
  - [ ] `pnpm lint` 退出 0
  - [ ] `pnpm dev` 启动 dev server，浏览器打开 http://localhost:5173 显示空白 React 页面（仅根 div）
  - [ ] `pnpm build` 退出 0，生成 `dist/`

  **QA Scenarios**:

  ```
  Scenario: 项目脚手架可正确启动
    Tool: Bash
    Preconditions: 项目根目录为空（仅 docs/ + .sisyphus/）
    Steps:
      1. cd C:\Projects\tripodndeer
      2. pnpm install（退出码必须 = 0）
      3. pnpm typecheck（退出码必须 = 0）
      4. pnpm lint（退出码必须 = 0）
      5. pnpm build（退出码必须 = 0，dist/index.html 存在）
    Expected Result: 全部 5 步退出 0；dist/ 存在
    Failure Indicators: 任一命令非 0 退出；any/@ts-ignore 检测出现；peer warning 出现
    Evidence: .sisyphus/evidence/task-1-scaffold-build.txt（pnpm 输出全捕获）

  Scenario: 禁用依赖未引入
    Tool: Bash
    Preconditions: T1 完成
    Steps:
      1. node -e "const p=require('./package.json'); const banned=['date-fns','dayjs','moment','lodash','immutable','rxjs','react-i18next','i18next']; const all={...p.dependencies,...p.devDependencies}; const found=banned.filter(b=>all[b]); console.log(JSON.stringify(found))"
      2. 输出必须为 "[]"
    Expected Result: 空数组
    Failure Indicators: 含任何禁用依赖
    Evidence: .sisyphus/evidence/task-1-banned-deps.json
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-1-scaffold-build.txt` - pnpm 命令完整输出
  - [ ] `.sisyphus/evidence/task-1-banned-deps.json` - 禁用依赖检测结果
  - [ ] `.sisyphus/evidence/task-1-tsconfig.json` - 最终 tsconfig.json 副本

  **Commit**: YES
  - Message: `chore(scaffold): init Vite + React + TS strict + lint pipeline`
  - Files: `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `index.html`, `README.md`, `src/main.tsx`（占位）, `src/**/.gitkeep`
  - Pre-commit: `pnpm typecheck && pnpm lint`

- [x] 2. **共享类型与 Zod schema（Site / WorldState / FactionId / GameDate）**

  **What to do**:
  - 在 `src/shared/types.ts` 定义类型（仅类型，不含运行时校验）：
    - `type SiteId = string`（如 `'site_1'`）
    - `type FactionId = string`（如 `'faction_red'`、`'faction_blue'`）—— **opaque ID，绝不用 `'red' | 'blue'` 字面量类型**
    - `type Vec2 = readonly [number, number]`
    - `type Polygon = readonly Vec2[]`
    - **关注点分离**：`RawSite`（content/JSON 形态，无 ownerId）vs `Site`（运行时形态，含 ownerId）
      - `interface RawSite { id: SiteId; name: string; position: Vec2; polygon: Polygon; adjacency: readonly SiteId[] }`
      - `interface Site extends RawSite { ownerId: FactionId | null }`（运行时由 factory 派发 initialOwnership 填入）
    - `interface Faction { id: FactionId; displayName: string; color: string }`（color 是 CSS 颜色字符串如 `'#dc2626'`）
    - `interface GameDate { yearBC: number; season: 'spring' | 'summer' | 'autumn' | 'winter'; month: 1 | 2 | 3; xun: 'shang' | 'zhong' | 'xia' }`
    - `interface RNGState { seed: number; counter: number }`（Mulberry32 可序列化状态）
    - `type TickPhase = (world: World, rng: RNGState) => { world: World; nextRng: RNGState; events: GameEvent[] }`
    - `interface GameEvent { type: string; payload: unknown }`（M0 events 数组永远空，但 hook 必须在）
    - `type SpeedTier = 'pause' | '1x' | '2x' | '3x' | '4x' | '5x'`
    - `interface World { date: GameDate; tick: number; sites: ReadonlyMap<SiteId, Site>; factions: ReadonlyMap<FactionId, Faction>; rngState: RNGState; phases: readonly TickPhase[] }`
      - **注意**：`World` 的 `rngState` 字段直接命名为 `rngState`（含 seed + counter），与 `10-tech.md §3.3` 的设计文档约定一致。`rngState.seed` 即"种子"，`rngState.counter` 即"当前推进位置"。QA-ARCH-3 检查 World 含 `rngState` 字段（不是分离的 `rngSeed` + `rngState`）。
  - 在 `src/shared/schemas.ts` 定义 Zod schema（用于运行时校验加载的 JSON）：
    - `SiteIdSchema`, `FactionIdSchema`, `Vec2Schema`, `PolygonSchema`
    - `RawSiteSchema`（**对应 sites.json 的 raw site 形态，无 ownerId**）
    - `SiteSchema`（运行时 Site，含 ownerId；factory 内部使用，而非加载校验）
    - `FactionSchema`
    - `M0DataSchema`（**对应 sites.json 根结构**，root：`{ sites: RawSiteSchema[]; factions: FactionSchema[]; initialOwnership: z.record(z.string(), FactionIdSchema) }`）
    - 加载流程：`loadM0Data() → M0DataSchema.parse(json) → factory 派发 initialOwnership 派生运行时 Site`
  - 在 `src/shared/constants.ts` 定义常量：
    - `TICK_INTERVAL_MS: Record<SpeedTier, number>`（pause: Infinity, 1x: 5000, 2x: 2500, 3x: 1500, 4x: 800, 5x: 400 —— 来自 `01-core-loop.md §2.2`）
    - `MAX_DELTA_MS: 100`（防止 tab-background 死亡螺旋）
    - `PAINT_INTERVAL_TICKS: 3`（每 3 个 tick 触发一次 painting，可由 URL `?paintInterval=N` 覆盖）
    - `INITIAL_DATE: GameDate = { yearBC: 453, season: 'spring', month: 1, xun: 'shang' }`（来自 `README.md` 起点：公元前 453 年三家分晋）
  - 导出 barrel `src/shared/index.ts`

  **Must NOT do**:
  - ❌ 添加 Site 字段：`terrain`, `defense_value`, `population_base`, `economy`, `cultural`, `historical_owner`, `type`
  - ❌ 添加邻接边属性：`adjacency` 仅是 `SiteId[]`，不是 `{ from, to, type, travel_cost }[]`
  - ❌ 引入 `Realm`, `Province`, `Region`, `Character`, `Army`, `Pass` 任何实体
  - ❌ 给 `FactionId` 用字面量联合类型 `'faction_red' | 'faction_blue'` —— 必须保持 opaque `string`
  - ❌ 用 `Site['ownerId']: 'red' | 'blue'`（color literal）—— 必须 `FactionId | null`
  - ❌ 写 `any`、`@ts-ignore`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯类型设计，已有清晰规格，照实声明即可
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T6, T7, T8, T9, T10
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `docs/design/10-tech.md` §3.3 "状态结构（World State）" - WorldState 接口模板
  - `docs/design/10-tech.md` §3.4 "RNG 与确定性" - 单一 PRNG 状态在 WorldState
  - `docs/design/02-map.md` §2.2 "邑（Site）的属性" - Site 接口模板（M0 取最小子集）
  - `docs/design/02-map.md` §3.2 "邻接边的属性" - 邻接边模型（M0 简化为 SiteId[]）
  - `docs/design/01-core-loop.md` §2.1 时间单位（旬/月/季/年）→ GameDate 结构
  - `docs/design/01-core-loop.md` §2.2 时间速度档位 → SpeedTier + TICK_INTERVAL_MS
  - `docs/design/10-tech.md` §5.2 "Schema 校验" - 加载阶段 Zod 强制

  **External References**:
  - Zod 文档：https://zod.dev/?id=basic-usage（schema 定义语法）
  - TypeScript readonly tuple：https://www.typescriptlang.org/docs/handbook/2/objects.html#readonly-tuples

  **WHY Each Reference Matters**:
  - `10-tech.md §3.3` 是 WorldState 的"远期蓝图"，M0 必须用其**子集**而不能违背其结构（否则 M1 重写整个 World）
  - `02-map.md §2.2` 列出 Site 全字段，M0 必须**只取**下列 6 个：id/name/position/polygon/adjacency/ownerId。其他字段是 M1+ scope。
  - Metis 强烈建议 `FactionId` 用 opaque string + factions 表，避免 M1 大规模 refactor。

  **Acceptance Criteria**:
  - [ ] `pnpm typecheck` 通过
  - [ ] 单元测试 `src/shared/__tests__/schemas.test.ts`：
    - 有效 m0 数据通过 `M0DataSchema.parse()` 不抛
    - 缺字段、错类型、无效坐标各 1 个测试用例 schema 拒绝（throws ZodError）
  - [ ] 类型检查测试：`expectType<SiteId>('site_1' as SiteId)` 等可编译
  - [ ] FactionId 是 opaque string（编译时 `'faction_red' as FactionId` 与 `'arbitrary_string' as FactionId` 都合法）

  **QA Scenarios**:

  ```
  Scenario: Schema 接受合法数据
    Tool: Vitest (Node)
    Preconditions: T2 完成
    Steps:
      1. import { M0DataSchema } from '@/shared/schemas'
      2. 构造 fixture：5 个 site + 2 个 faction + initialOwnership
      3. 调用 M0DataSchema.parse(fixture) —— 不抛出
    Expected Result: 返回类型化对象，所有字段类型正确
    Evidence: .sisyphus/evidence/task-2-schema-valid.txt（vitest 输出）

  Scenario: Schema 拒绝缺字段数据
    Tool: Vitest (Node)
    Preconditions: T2 完成
    Steps:
      1. 构造缺 polygon 字段的 site
      2. 调用 M0DataSchema.parse() 期望 throw
      3. 捕获 ZodError，断言 path 包含 'polygon'
    Expected Result: ZodError throws，路径正确指向 'sites.0.polygon'
    Evidence: .sisyphus/evidence/task-2-schema-reject.txt

  Scenario: 没有禁用 Site 字段
    Tool: Bash (grep)
    Preconditions: T2 完成
    Steps:
      1. 在 src/shared/types.ts 中搜索：terrain|defense_value|population_base|economy|cultural|historical_owner（regex）
    Expected Result: 零匹配
    Failure Indicators: 任何字段出现
    Evidence: .sisyphus/evidence/task-2-no-banned-fields.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-2-schema-valid.txt`
  - [ ] `.sisyphus/evidence/task-2-schema-reject.txt`
  - [ ] `.sisyphus/evidence/task-2-no-banned-fields.txt`

  **Commit**: YES
  - Message: `feat(shared): add Site / World / Faction Zod schemas and types`
  - Files: `src/shared/types.ts`, `src/shared/schemas.ts`, `src/shared/constants.ts`, `src/shared/index.ts`, `src/shared/__tests__/schemas.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/shared`

- [x] 3. **PRNG 模块（Mulberry32 纯函数 + 状态序列化）**

  **What to do**:
  - 在 `src/engine/random/mulberry32.ts` 实现 Mulberry32 算法（10 行核心代码）：
    - `function nextRng(state: RNGState): { value: number; nextState: RNGState }`
    - `value` 是 [0, 1) 的浮点数
    - `nextState.counter = state.counter + 1`，`seed` 不变
  - 在 `src/engine/random/helpers.ts` 实现派生函数（仍为纯函数）：
    - `nextInt(state, min, max): { value, nextState }` —— 返回 [min, max] 整数
    - `pickRandom<T>(state, arr): { value: T | undefined, nextState }` —— 数组随机取一项
    - `createInitialRng(seed: number): RNGState` —— 工厂
  - 导出 barrel `src/engine/random/index.ts`
  - **关键**：不暴露任何 module-level 可变状态（per Metis directive）。所有函数都是 `(state) => result + nextState` 形式。

  **Must NOT do**:
  - ❌ 在 module 层定义 `let currentState: RNGState` —— **绝对禁止**
  - ❌ 使用 `Math.random()` —— 不可复现
  - ❌ 引入 `seedrandom` 或类似库 —— 自己写 Mulberry32 仅 10 行
  - ❌ 让函数有副作用（mutate input、console.log、IO）
  - ❌ 在测试中 mock global 状态

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 算法明确，纯函数实现简单
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T6, T7
  - **Blocked By**: None（不依赖 T2 的类型，自己定义 RNGState 接口；T2 完成后类型从 shared/types 替换 import 即可，开发顺序无强依赖）

  > 实际并发安全提示：T3 与 T2 都会创建 `RNGState` 类型。约定：T3 实现时使用 `import type { RNGState } from '@/shared/types'`，T2 必须先合并；如果 T3 抢跑，临时本地定义并在 T2 合并后改 import。这通过 git rebase/lint 保障。

  **References**:

  **Pattern References**:
  - `docs/design/10-tech.md` §3.4 "RNG 与确定性" - 单一 PRNG（Mulberry32）+ 状态在 WorldState

  **External References**:
  - Mulberry32 算法（公认最简优秀的 32-bit PRNG）：
    https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
  - 算法核心 4 行：
    ```
    function mulberry32(a) {
      return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      }
    }
    ```
  - 我们的纯函数版本：用 `state.seed + state.counter` 作为算法输入，而不是闭包累积。

  **WHY Each Reference Matters**:
  - 设计文档明确指定 Mulberry32（不是 xoshiro 或 PCG），保持一致性。
  - 纯函数化是 Metis 的硬要求 —— 状态必须显式流动，不能藏在闭包。

  **Acceptance Criteria**:
  - [ ] `nextRng({seed: 42, counter: 0})` 返回确定值（用相同输入测两次结果完全相等）
  - [ ] 1000 次 `nextRng` 后 `counter === 1000`
  - [ ] 不同 seed 生成不同序列
  - [ ] `nextInt(state, 0, 9)` 返回 [0, 9] 整数（跑 10000 次断言所有值都在范围内）
  - [ ] `pickRandom(state, [])` 返回 `value: undefined`，`pickRandom(state, [a])` 返回 `a`
  - [ ] 模块层无可变状态（grep `let |var ` 在 mulberry32.ts 应仅出现在函数体内）

  **QA Scenarios**:

  ```
  Scenario: PRNG 确定性
    Tool: Vitest (Node)
    Steps:
      1. const r1 = nextRng({seed: 42, counter: 0})
      2. const r2 = nextRng({seed: 42, counter: 0})
      3. assert r1.value === r2.value
      4. assert r1.nextState === { seed: 42, counter: 1 }（deep equal）
    Expected Result: 两次调用结果完全相同
    Evidence: .sisyphus/evidence/task-3-determinism.txt

  Scenario: PRNG 状态推进
    Tool: Vitest (Node)
    Steps:
      1. let state = { seed: 42, counter: 0 }
      2. for i in 0..1000: state = nextRng(state).nextState
      3. assert state.counter === 1000
    Expected Result: counter 严格 +1
    Evidence: .sisyphus/evidence/task-3-counter.txt

  Scenario: 不同 seed 产出不同序列
    Tool: Vitest (Node)
    Steps:
      1. seq1 = 取 seed=42 前 20 个值
      2. seq2 = 取 seed=99 前 20 个值
      3. assert !deepEqual(seq1, seq2)
    Expected Result: 序列不同（sanity check）
    Evidence: .sisyphus/evidence/task-3-different-seeds.txt

  Scenario: 模块层无可变状态
    Tool: Bash (grep)
    Steps:
      1. 在 src/engine/random/*.ts 文件层面（非函数内）搜索 `^(let|var) `
    Expected Result: 零匹配
    Failure Indicators: 任何模块级 let/var 出现
    Evidence: .sisyphus/evidence/task-3-no-module-state.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-3-determinism.txt`
  - [ ] `.sisyphus/evidence/task-3-counter.txt`
  - [ ] `.sisyphus/evidence/task-3-different-seeds.txt`
  - [ ] `.sisyphus/evidence/task-3-no-module-state.txt`

  **Commit**: YES
  - Message: `feat(engine/random): add Mulberry32 PRNG with state-on-WorldState`
  - Files: `src/engine/random/mulberry32.ts`, `src/engine/random/helpers.ts`, `src/engine/random/index.ts`, `src/engine/random/__tests__/*.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/engine/random`

- [x] 4. **游戏日期算术（tickToGameDate + Chinese 格式化 + BC 处理）**

  **What to do**:
  - 在 `src/engine/date/calendar.ts` 实现纯函数：
    - `function addOneTick(date: GameDate): GameDate` —— 推进一旬，处理 旬→月、月→季、季→年 的进位
      - 旬序：上 → 中 → 下 → 下个月的上
      - 月序：每季 3 个月（春=1,2,3 / 夏=4,5,6 / 秋=7,8,9 / 冬=10,11,12 —— 但我们用 GameDate 的 `season` + `month: 1|2|3` 子月而不是 1-12 月，简化）
      - 季序：春 → 夏 → 秋 → 冬 → 下一年春
      - 年序：BC 年减 1（公元前 453 → 公元前 452 → ... → 公元前 1 → 公元 1，跳过零年）
    - `function tickToGameDate(tick: number, initial: GameDate): GameDate` —— 从 tick=0（initial）开始累加
    - `function formatGameDate(date: GameDate): string` —— 输出"公元前 453 年 春 上旬"格式
      - season → "春/夏/秋/冬"
      - month → 不直接显示，用 xun 表达（一季 3 月 × 3 旬 = 9 旬，但 GameDate.month 是季内子月 1-3）
      - xun → "上旬/中旬/下旬"
      - BC 年 → "公元前 N 年"；若未来扩展到 AD → "公元 N 年"
  - 在 `src/engine/date/__tests__/calendar.test.ts` 写表驱动测试：
    - 输入 `INITIAL_DATE` + 0 tick → "公元前 453 年 春 上旬"
    - + 1 tick → "公元前 453 年 春 上旬"... 等等，需要确定一旬+1 后的字段值
    - 起点 + 9 tick = 跨季（春 → 夏）
    - 起点 + 36 tick = 跨年（公元前 453 → 公元前 452）
    - 跨 BC/AD：从公元前 1 年某季 + 跨年 tick → 公元 1 年（不是公元 0）—— M0 不会触发但要测
  - 模块导出 barrel `src/engine/date/index.ts`

  **Must NOT do**:
  - ❌ 引入 `date-fns`、`dayjs`、`moment`、`luxon` 等任何日期库
  - ❌ 用 JavaScript `Date` 对象（公元 1970 之前 BC 处理不可靠）
  - ❌ 让 `addOneTick` 修改入参（必须返回新对象）
  - ❌ 让 `formatGameDate` 在数字小时使用 toLocaleString（不可控环境差异）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯算术 + 字符串格式化，约 80 行代码 + 表驱动测试
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T12（顶栏需要 formatGameDate）
  - **Blocked By**: None（自带类型定义；T2 合并后改 import 即可）

  **References**:

  **Pattern References**:
  - `docs/design/01-core-loop.md` §2.1 "时间单位" - 旬/月/季/年 层次
  - `docs/design/README.md` 一页纸总览 - 起点公元前 453 年三家分晋
  - `docs/design/09-ux-ui.md` §2.1 顶栏的"年/月/旬"显示需求

  **External References**:
  - 公元前/公元年份处理（无零年）：https://en.wikipedia.org/wiki/Year_zero
  - 中国古代旬制：上/中/下旬（10 天为一旬）

  **WHY Each Reference Matters**:
  - 起点 453 BC 是设计硬约束（来自 README 一页纸），M0 顶栏第一个显示就是它。
  - "无零年"是历史上的真实约定，虽然 M0 不会触发跨 BC/AD（演示几分钟内年份变化很慢），但 hook 必须在以免 M5+ 后期处理时挖坑。

  **Acceptance Criteria**:
  - [ ] tick=0 + INITIAL_DATE → 输出 "公元前 453 年 春 上旬"
  - [ ] tick=1 → "公元前 453 年 春 中旬"
  - [ ] tick=2 → "公元前 453 年 春 下旬"
  - [ ] tick=3 → "公元前 453 年 春" 第二月 上旬（具体格式按实现决定，但季节仍为春）
  - [ ] tick=9 → 跨季到夏（"公元前 453 年 夏 上旬"）
  - [ ] tick=36 → 跨年到公元前 452 年（"公元前 452 年 春 上旬"）
  - [ ] BC→AD 跨界测试：构造 GameDate { yearBC: 1 } + 跨年 → yearBC 变成 -1（即 AD 1）
  - [ ] addOneTick 不 mutate 入参（input deep equals input after call）
  - [ ] 全部测试用例通过

  **QA Scenarios**:

  ```
  Scenario: 表驱动日期推进正确
    Tool: Vitest (Node)
    Steps:
      1. const cases = [
           [0, '公元前 453 年 春 上旬'],
           [1, '公元前 453 年 春 中旬'],
           [9, '公元前 453 年 夏 上旬'],
           [36, '公元前 452 年 春 上旬'],
         ]
      2. for [ticks, expected] of cases:
           const date = tickToGameDate(ticks, INITIAL_DATE)
           assert formatGameDate(date) === expected
    Expected Result: 全部 case 通过
    Evidence: .sisyphus/evidence/task-4-date-table.txt

  Scenario: 不可变性
    Tool: Vitest (Node)
    Steps:
      1. const original = { ...INITIAL_DATE }
      2. const next = addOneTick(original)
      3. assert deepEqual(original, INITIAL_DATE)（原对象未被修改）
      4. assert next !== original（返回新对象）
    Expected Result: 输入未变，输出是新对象
    Evidence: .sisyphus/evidence/task-4-immutable.txt

  Scenario: BC/AD 跨界（无零年）
    Tool: Vitest (Node)
    Steps:
      1. 构造 GameDate { yearBC: 1, season: 'winter', month: 3, xun: 'xia' }
      2. 调用 addOneTick → 期望 { yearBC: -1, season: 'spring', ... }（约定：负数表 AD）
      3. 或选择策略 yearBC: 0 表示 AD 1（约定一致即可）
    Expected Result: 跨界处理符合实现约定，且测试用例覆盖
    Evidence: .sisyphus/evidence/task-4-bc-ad.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-4-date-table.txt`
  - [ ] `.sisyphus/evidence/task-4-immutable.txt`
  - [ ] `.sisyphus/evidence/task-4-bc-ad.txt`

  **Commit**: YES
  - Message: `feat(engine/date): add tickToGameDate with BC + Chinese formatting`
  - Files: `src/engine/date/calendar.ts`, `src/engine/date/index.ts`, `src/engine/date/__tests__/calendar.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/engine/date`

- [x] 5. **M0 地图数据生成工具（一次性脚本，timebox 4h）**

  **What to do**:
  - 在 `tools/generate-m0-map.ts` 写一次性脚本，以下任一方案：
    - **方案 A（推荐）**：使用 `d3-delaunay`（仅在 devDependencies）
      - 在画布尺寸 800×600 内随机摆放 5 个种子点（不重叠，最小间距）
      - 计算 Voronoi 单元
      - 对每条单元边添加噪声扰动（在原边上插入 3-5 个中间点 + 法向小幅偏移）产生不规则边缘
      - 输出每个邑的 polygon 顶点列表
      - 推导邻接：Voronoi 共享边即邻接（输出几何邻接 + 与手工预期对比）
    - **方案 B（兜底，时间超 4h 切换到 B）**：手工预设 5 个不规则多边形
      - 直接在脚本里硬编码 5 组 polygon 顶点（不依赖 d3-delaunay）
      - 邻接关系手工声明
  - 输出到 `src/content/m0/sites.json`（JSON，符合 T2 的 `M0DataSchema`）：
    ```json
    {
      "sites": [
        { "id": "site_1", "name": "邑甲", "position": [x, y], "polygon": [[x1,y1], ...], "adjacency": ["site_2", "site_3"] }
      ],
      "factions": [
        { "id": "faction_red", "displayName": "红", "color": "#dc2626" },
        { "id": "faction_blue", "displayName": "蓝", "color": "#2563eb" }
      ],
      "initialOwnership": {
        "site_1": "faction_red",
        "site_2": "faction_blue",
        "site_3": "faction_blue",
        "site_4": "faction_blue",
        "site_5": "faction_blue"
      }
    }
    ```
  - 在 `package.json` 添加 script：`"generate:m0-map": "tsx tools/generate-m0-map.ts"`
  - 添加 `tsx` 到 devDependencies
  - 脚本运行后产物提交 git；运行时 `src/` **永远不**导入 `d3-delaunay`
  - 在 `tools/README.md` 解释脚本用法 + 产物路径 + 何时重跑（一般不重跑）

  **Must NOT do**:
  - ❌ 在 `src/` 任何文件 `import 'd3-delaunay'`（只允许 `tools/` 用）
  - ❌ 让运行时动态生成多边形（必须是静态 JSON）
  - ❌ 让 5 块 polygon 几何上重叠（视觉错乱）
  - ❌ 让 polygon 太规则（必须有不规则边缘，体现"模拟真实地图"）
  - ❌ 超时不切换：4 小时方案 A 实现不下来，必须切换方案 B

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 一次性工具脚本，产出 JSON。需要点几何/算法判断，但不复杂；允许失败降级
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T8（WorldState 加载 m0 数据）
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `docs/design/02-map.md` §2.2 "邑（Site）的属性" - polygon + adjacency（M0 取最小子集）
  - `docs/design/02-map.md` §3.1 "为什么用图，不用网格" - 邻接图原则
  - `docs/design/10-tech.md` §1.2 "关键不选的" - 不用 PixiJS / WebGL，证明 Canvas 原生即可

  **External References**:
  - d3-delaunay 文档：https://github.com/d3/d3-delaunay
  - Voronoi 几何邻接（共享边）算法说明

  **WHY Each Reference Matters**:
  - `02-map.md §3` 邻接图模型决定 M0 数据契约必须含 `adjacency: SiteId[]`，T7 涂色系统依赖此。
  - d3-delaunay 是工业级 Voronoi 库，比手写更可靠；但仅限工具场景，运行时无影响。

  **Acceptance Criteria**:
  - [ ] `pnpm generate:m0-map` 退出 0
  - [ ] 输出文件 `src/content/m0/sites.json` 存在
  - [ ] 5 个 site，每个 polygon 至少 6 个顶点（不规则）
  - [ ] 用 T2 的 Zod schema 验证产物：`M0DataSchema.parse(json)` 不抛
  - [ ] adjacency 关系闭合：若 A 列出 B 邻接，B 必列出 A
  - [ ] 至少 1 个邑有 ≥3 邻居（保证连通图）
  - [ ] `src/` 任何文件未 import `d3-delaunay`（QA-ARCH-4 部分）

  **QA Scenarios**:

  ```
  Scenario: 数据文件生成 + Zod 通过
    Tool: Bash + Vitest
    Steps:
      1. 删除 src/content/m0/sites.json
      2. pnpm generate:m0-map
      3. 文件 src/content/m0/sites.json 存在
      4. node -e "const d = require('./src/content/m0/sites.json'); const {M0DataSchema} = await import('./src/shared/schemas.js'); M0DataSchema.parse(d)" —— 不抛
    Expected Result: 文件生成 + schema 校验通过
    Evidence: .sisyphus/evidence/task-5-generate.txt + sites.json 副本

  Scenario: 邻接关系闭合
    Tool: Vitest (Node)
    Steps:
      1. 加载 sites.json
      2. for site in sites:
           for neighbor in site.adjacency:
             const back = sites.find(s => s.id === neighbor)
             assert back.adjacency.includes(site.id)
    Expected Result: 全部闭合
    Failure Indicators: 任何单向邻接
    Evidence: .sisyphus/evidence/task-5-adjacency-closure.txt

  Scenario: src/ 不导入 d3-delaunay
    Tool: Bash (grep)
    Steps:
      1. 在 src/**/*.ts(x) 搜索 'd3-delaunay'
    Expected Result: 零匹配
    Failure Indicators: 任何匹配
    Evidence: .sisyphus/evidence/task-5-d3-isolation.txt

  Scenario: 不规则程度 sanity
    Tool: Vitest (Node)
    Steps:
      1. for polygon in sites.polygons:
           assert polygon.length >= 6 顶点
           计算其凸包，比较凸包顶点数 vs 总顶点数 → 比例 < 0.8（不太规则）
    Expected Result: 所有多边形够"不规则"
    Evidence: .sisyphus/evidence/task-5-irregularity.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-5-generate.txt`
  - [ ] `.sisyphus/evidence/task-5-sites.json`（最终产物副本）
  - [ ] `.sisyphus/evidence/task-5-adjacency-closure.txt`
  - [ ] `.sisyphus/evidence/task-5-d3-isolation.txt`
  - [ ] `.sisyphus/evidence/task-5-irregularity.txt`

  **Commit**: YES
  - Message: `chore(tools): add one-shot map generator producing m0 sites.json`
  - Files: `tools/generate-m0-map.ts`, `tools/README.md`, `src/content/m0/sites.json`, `package.json`（添加 script + d3-delaunay devDep + tsx devDep）
  - Pre-commit: `pnpm typecheck && pnpm lint`

- [x] 11. **架构强制规则（ESLint no-restricted-imports + Engine purity 测试）**

  **What to do**:
  - 编辑 `.eslintrc.cjs`，添加 `overrides` 规则：
    - 对 `src/engine/**/*.ts` 启用 `no-restricted-imports`：禁止 `react`, `react-dom`, `zustand`（zustand 是 UI 层）
    - 对 `src/engine/**/*.ts` 添加自定义 rule：禁止使用 `window`, `document`, `navigator`, `requestAnimationFrame`, `cancelAnimationFrame`, `performance`（这些是浏览器 API）—— 用 `no-restricted-globals` 实现
    - 对 `src/**/*.ts` 全局：禁止 `import 'date-fns'|'dayjs'|'moment'|'lodash'|'immutable'|'rxjs'|'react-i18next'`
  - 编辑 `tsconfig.json`：增加 `"types": []`（防止 `@types/dom` 在 engine 编译被 implicit 引入；如不可行则用 project references 隔离）—— 备选方案：在 engine 目录单独有 tsconfig
  - 创建 `src/engine/__tests__/architecture-purity.test.ts`：
    - 用 `fs` + glob 列出 `src/engine/**/*.ts`
    - 对每个文件正则扫描 `^import .* from ['"](.*)['"]`
    - 断言：所有 import 的源都不属于禁用列表
    - 断言：源文件中无 `window\.`、`document\.`、`globalThis\.window`、`navigator\.`、`requestAnimationFrame` 字面引用
  - 创建 `src/__tests__/banned-deps.test.ts`：
    - 读取 `package.json`，断言 dependencies + devDependencies 不含禁用包（除 `d3-delaunay` 在 devDependencies）
    - 断言 dependencies（运行时）不含 `d3-delaunay`
  - 创建 `src/__tests__/no-any.test.ts`：
    - glob `src/**/*.ts(x)` 排除 `__tests__/`、`*.test.ts`
    - 扫描 `\bas any\b`、`@ts-ignore`、`@ts-expect-error`
    - 断言零匹配

  **Must NOT do**:
  - ❌ 用注释绕过（如 `// eslint-disable-next-line` 跳过 no-restricted-imports）
  - ❌ 在 engine 测试里用 `import { render } from '@testing-library/react'`（engine 测试纯 Node）
  - ❌ 把 zustand 放在 engine 而不是 ui

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: ESLint 规则配置 + 简单字符串扫描测试
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T15（QA-ARCH-* 测试在 T15 集成时跑全套）
  - **Blocked By**: T1（需要 ESLint 配置存在）—— **重要**：T11 实际并发约束 = T1，但 T11 写的是覆盖配置，T1 提供基础配置即可。如果 T1 未先合并，T11 临时单独提交并在 T1 后 rebase。

  **References**:

  **Pattern References**:
  - `docs/design/10-tech.md` §2.1 "关键原则" - Engine 不依赖 UI（"可在 Node.js 跑"）
  - `docs/design/10-tech.md` §11.2 "代码风格" - 严禁 any/@ts-ignore/@ts-expect-error
  - `docs/design/10-tech.md` §1.1 - 锁定依赖列表（任何超出即违规）

  **External References**:
  - ESLint `no-restricted-imports` 文档：https://eslint.org/docs/latest/rules/no-restricted-imports
  - ESLint `no-restricted-globals` 文档：https://eslint.org/docs/latest/rules/no-restricted-globals
  - `@typescript-eslint/no-explicit-any` 文档（推荐补充）：https://typescript-eslint.io/rules/no-explicit-any

  **WHY Each Reference Matters**:
  - 设计文档 §2.1 是 **Engine 层独立性**的核心承诺。M9 要 AI vs AI 自动对战，需要 engine 在 Node 跑。M0 不强制就让 M9 重写不可能。
  - §11.2 是项目工程纪律，违者 F2 拒绝。

  **Acceptance Criteria**:
  - [ ] 故意创建一个 `src/engine/test-fixture-bad.ts` 写 `import React from 'react'` —— `pnpm lint` 报错；删除该文件
  - [ ] `src/engine/__tests__/architecture-purity.test.ts` 通过（当前 engine 文件全部干净）
  - [ ] `src/__tests__/banned-deps.test.ts` 通过
  - [ ] `src/__tests__/no-any.test.ts` 通过
  - [ ] `pnpm lint` 零警告

  **QA Scenarios**:

  ```
  Scenario: ESLint 阻止 engine 引用 react
    Tool: Bash
    Steps:
      1. echo "import React from 'react'; export const x = 1" > src/engine/temp-bad.ts
      2. pnpm lint src/engine/temp-bad.ts —— 期望非 0 退出，输出含 'no-restricted-imports'
      3. rm src/engine/temp-bad.ts
    Expected Result: lint 报错，错误信息明确指向 react import
    Evidence: .sisyphus/evidence/task-11-eslint-blocks-react.txt

  Scenario: Engine 当前完全干净
    Tool: Vitest (Node)
    Steps:
      1. 跑 src/engine/__tests__/architecture-purity.test.ts
    Expected Result: 通过（engine 文件无禁用 import 和 dom 引用）
    Evidence: .sisyphus/evidence/task-11-engine-pure.txt

  Scenario: 禁用依赖检测
    Tool: Vitest (Node)
    Steps:
      1. 跑 src/__tests__/banned-deps.test.ts
    Expected Result: 通过（package.json 无禁用包）
    Evidence: .sisyphus/evidence/task-11-banned-deps.txt

  Scenario: any/@ts-ignore 检测
    Tool: Vitest (Node)
    Steps:
      1. 跑 src/__tests__/no-any.test.ts
    Expected Result: 通过（src 无禁用模式）
    Evidence: .sisyphus/evidence/task-11-no-any.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-11-eslint-blocks-react.txt`
  - [ ] `.sisyphus/evidence/task-11-engine-pure.txt`
  - [ ] `.sisyphus/evidence/task-11-banned-deps.txt`
  - [ ] `.sisyphus/evidence/task-11-no-any.txt`

  **Commit**: YES
  - Message: `chore(arch): add ESLint no-restricted-imports + engine purity test`
  - Files: `.eslintrc.cjs`（更新）, `src/engine/__tests__/architecture-purity.test.ts`, `src/__tests__/banned-deps.test.ts`, `src/__tests__/no-any.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test`

- [x] 6. **时钟（advanceClock 纯函数 + Tick phases 数组）**

  **What to do**:
  - 在 `src/engine/clock/clock.ts` 实现**纯函数 `advanceClock`**：
    - 签名：`(state: ClockState, deltaMs: number, world: World) => { clockState: ClockState, nextWorld: World, events: GameEvent[] }`
    - `interface ClockState { speed: SpeedTier; realTimeAccum: number }`
    - **engine 层不做 deltaMs cap**（engine 是纯函数，信任输入；cap 是 driver 层职责，见 T9）
    - 若 `speed === 'pause'`：直接返回原状态（realTimeAccum 不累加；nextWorld === world；events: []）
    - 否则：`realTimeAccum += deltaMs`；while accumulator ≥ tickInterval：accum -= tickInterval，调用 `runTickPhases(world, world.rngState)` 推进世界（多次循环可在单次调用推进多个 tick）
  - 实现 `runTickPhases(world: World, rng: RNGState): { world, nextRng, events }`：
    - 遍历 `world.phases` 数组，依次调用每个 phase
    - 每个 phase 的输出是下一个 phase 的输入
    - tick 推进后：`world.tick += 1`，`world.date = addOneTick(world.date)`
    - 把 nextRng 写回 `world.rngState`
    - 收集所有 phase 的 events 合并返回
  - 实现 `setSpeed(state: ClockState, speed: SpeedTier): ClockState`：
    - **决策**（rescaling rule）：切速度时**重置 realTimeAccum = 0**（简单可预测，与 Paradox 行为类似）
  - **layered architecture 重要约定**：
    - Engine 层 `advanceClock` 是纯函数，不依赖 RAF、不知道 cap
    - Driver 层（T9 中实现的 raf-driver）负责：调 RAF → 取得 deltaMs → **cap deltaMs 到 `MAX_DELTA_MS` (100ms)** → 调 advanceClock
    - 防 tab-background 死亡螺旋的责任在 driver，不在 engine
    - 这样 engine 单测可以传任意 deltaMs（如 5500ms 测试）；driver 单测验证 cap 行为
  - 在 `src/engine/clock/__tests__/clock.test.ts` 写测试

  **Must NOT do**:
  - ❌ 在 engine 引入 `requestAnimationFrame` 或浏览器 API（违反 T11 ESLint 规则）
  - ❌ 让 phase 函数有 IO 副作用（必须是纯函数）
  - ❌ 在 advanceClock 内部 cap deltaMs（cap 是 driver 职责；engine 必须是诚实的 pure function）
  - ❌ 让 tick 推进过程中再触发 RAF（无限循环风险）
  - ❌ 写 phase 数组之外的"hardcode 调用 paintingStep"逻辑—— phase 数组必须是唯一调用入口

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 时钟逻辑有微妙陷阱（tab-background、speed change 中间态、RAF 时序）；Metis 已识别多个边缘场景，需细致推理
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES（Wave 2 内）
  - **Parallel Group**: Wave 2（与 T7、T8、T9 并行）
  - **Blocks**: T13、T14
  - **Blocked By**: T1（脚手架）, T2（类型）, T3（PRNG）

  **References**:

  **Pattern References**:
  - `docs/design/10-tech.md` §3.1 "时钟（Clock）" - 类骨架（注意：此处仅为参考，要重构为纯函数 + driver）
  - `docs/design/10-tech.md` §3.2 "Tick 阶段（Tick Phases）" - 10 个 phase 列表（M0 仅 1 个）
  - `docs/design/01-core-loop.md` §2.2 "时间速度" - 5 档速度的 ms 间隔表
  - `docs/design/10-tech.md` §4.2 "性能预算" - 5x 速度单 tick ≤ 200ms

  **External References**:
  - RAF 在 tab 失焦时停止：https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame#timestamp_handling

  **WHY Each Reference Matters**:
  - `10-tech.md §3.1` 的 class 设计有 `executeTick` 直接调用 World.runTickPhases —— M0 重构为：纯函数 `runTickPhases(world)` + driver 类负责 RAF。
  - tab-background 死亡螺旋是 Metis 重点警告 —— 必须落地 `MAX_DELTA_MS = 100` cap。
  - `01-core-loop.md` 速度间隔（1x=5s, 5x=0.4s）是硬约束。

  **Acceptance Criteria**:
  - [ ] 暂停时 deltaMs 不累加（多次 advanceClock 后 realTimeAccum=0）
  - [ ] 1x speed (5000ms/tick)，advanceClock 5500ms → 推进 1 tick，accum=500ms（engine 不 cap）
  - [ ] 5x speed (400ms/tick)，advanceClock 1000ms → 推进 2 tick，accum=200ms
  - [ ] 大 deltaMs 测试（验证 engine 信任输入）：5x speed advanceClock 60000ms → 推进 150 tick（QA：engine 自身不限速；driver 层 cap 行为在 T9 验证）
  - [ ] speed change 中：accum 重置为 0
  - [ ] phase 数组遍历：mock 3 个 phase，调用顺序正确，输出链式传递
  - [ ] tick 推进后 world.date 同步更新 + world.rngState 同步推进
  - [ ] M0 只有 1 个 phase（painting），但 phases 数组形式存在

  **QA Scenarios**:

  ```
  Scenario: Pause 不推进
    Tool: Vitest (Node)
    Steps:
      1. const initial = { speed: 'pause', realTimeAccum: 0 }
      2. const next = advanceClock(initial, 10000, world).clockState
    Expected Result: next.realTimeAccum === 0
    Evidence: .sisyphus/evidence/task-6-pause.txt

  Scenario: 1x speed 5500ms 推进 1 tick
    Tool: Vitest (Node)
    Steps:
      1. const result = advanceClock({speed:'1x',realTimeAccum:0}, 5500, world)
      2. assert result.nextWorld.tick === world.tick + 1
      3. assert result.clockState.realTimeAccum === 500
    Expected Result: 推进 1 tick + 累积 500ms
    Evidence: .sisyphus/evidence/task-6-1x-tick.txt

  Scenario: Engine 信任大 deltaMs（不 cap）
    Tool: Vitest (Node)
    Steps:
      1. const result = advanceClock({speed:'5x',realTimeAccum:0}, 60000, world)
      2. assert result.nextWorld.tick - world.tick === 150（60000ms / 400ms = 150 tick）
      3. assert result.clockState.realTimeAccum === 0
    Expected Result: engine 不施加 cap；advance 150 tick
    Note: tab-background 死亡螺旋防护责任在 T9 driver 层；engine 层只负责诚实推进
    Evidence: .sisyphus/evidence/task-6-engine-trusts-input.txt

  Scenario: Phase 数组形态（M0 仅 1 个）
    Tool: Vitest (Node)
    Steps:
      1. const world = { ..., phases: [paintingStep] }
      2. assert Array.isArray(world.phases)
      3. assert world.phases.length === 1
      4. mock 增加一个 fakePhase，验证两个 phase 链式调用
    Expected Result: phases 是数组，可扩展
    Evidence: .sisyphus/evidence/task-6-phase-array.txt

  Scenario: Speed change 重置 accum
    Tool: Vitest (Node)
    Steps:
      1. const before = { speed: '1x', realTimeAccum: 4000 }
      2. const after = setSpeed(before, '5x')
      3. assert after.realTimeAccum === 0
    Expected Result: realTimeAccum 重置
    Evidence: .sisyphus/evidence/task-6-speed-change.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-6-pause.txt`
  - [ ] `.sisyphus/evidence/task-6-1x-tick.txt`
  - [ ] `.sisyphus/evidence/task-6-engine-trusts-input.txt`
  - [ ] `.sisyphus/evidence/task-6-phase-array.txt`
  - [ ] `.sisyphus/evidence/task-6-speed-change.txt`

  **Commit**: YES
  - Message: `feat(engine/clock): add advanceClock pure function with phase array`
  - Files: `src/engine/clock/clock.ts`, `src/engine/clock/index.ts`, `src/engine/clock/__tests__/clock.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/engine/clock`

- [x] 7. **涂色系统（paintingStep 纯函数 + 邻接判定）**

  **What to do**:
  - 在 `src/engine/systems/painting/painting.ts` 实现 `paintingStep` 作为 `TickPhase`：
    - 签名：`(world: World, rng: RNGState) => { world: World; nextRng: RNGState; events: GameEvent[] }`
    - 逻辑：
      1. 检查是否是 painting 触发 tick：`world.tick % PAINT_INTERVAL_TICKS === 0`（也可由 URL 参数覆盖；这是行为参数化的 hook）—— 实际上 painting 是否触发应由 phase 自己决定，每个 phase 有自己的频率
      2. 找出所有"红邻蓝"边：遍历每个 site，若 ownerId === faction_red，遍历其 adjacency，找邻居中 ownerId === faction_blue 的，收集成 (redSite, blueSite) pair 列表
      3. 若 pair 列表为空：返回原 world（no-op），rng 不动；events: []
      4. 否则：用 rng 从 pair 列表随机取一个；把那个 blue site 的 ownerId 改为 faction_red
      5. 返回新 world（用 Immer 不可变更新）+ 推进后的 rng + events: [{type:'painting:siteFlipped', payload:{siteId, fromFaction, toFaction}}]
  - 在 `src/engine/systems/painting/__tests__/painting.test.ts` 写测试覆盖 §QA-FUNC-1..4 + 决定性

  **Must NOT do**:
  - ❌ 引入 Realm/Faction 实体（faction_id 仅是 string）
  - ❌ 用 `Math.random()` —— 必须 `nextRng(rng)`
  - ❌ 直接修改 world.sites（必须 Immer 或新 Map）
  - ❌ 处理"全红后自动重置"—— 行为是 no-op，UI 层显示完成提示（T14 处理）
  - ❌ 引入双向涂色（用户决策为单向红吞蓝）
  - ❌ 让函数依赖 `world.tick % N` 之外的全局状态判定触发

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 涂色逻辑虽简单，但确定性 + 不可变 + 多 edge case（无邻居、全红、单边邻居）需要细致推理
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES（Wave 2 内）
  - **Parallel Group**: Wave 2
  - **Blocks**: T14
  - **Blocked By**: T1, T2, T3

  **References**:

  **Pattern References**:
  - `docs/design/02-map.md` §3.1 "为什么用图，不用网格" - 邻接判定原则
  - `docs/design/02-map.md` §4.1 "归属模型" - ownerId 单一归属（M0 不引入 control_level）
  - `docs/design/10-tech.md` §3.3 "状态结构" - 不可变更新（Immer）

  **External References**:
  - Immer produce：https://immerjs.github.io/immer/produce

  **WHY Each Reference Matters**:
  - 邻接判定必须遵循 `02-map.md §3` 的图模型 —— 与 T2 的 `Site.adjacency: SiteId[]` 契合。
  - Immer 是 10-tech.md §1.1 锁定栈，用 produce 写不可变更新简洁安全。

  **Acceptance Criteria**:
  - [ ] QA-FUNC-1：跑 N 次 paintingStep（N 为安全上限），所有 site 最终全红
  - [ ] QA-FUNC-2：red 仅与不相邻 blue 共存时，flip 不发生（pair 列表为空）—— wait，重新读：red 与 B 不相邻，与 C 相邻，则只 C 翻红。修改：QA-FUNC-2 验证 only adjacency-respecting flips
  - [ ] QA-FUNC-3：red 无任何 blue 邻居 → no-op
  - [ ] QA-FUNC-4：全红 → no-op
  - [ ] 确定性：相同 (world, rng) 输入两次，输出完全相同（deep equal）
  - [ ] 不可变：world.sites map 引用不复用（结构新对象），但未变 site 的引用相同（Immer 优化）
  - [ ] events 数组：flip 发生时长度=1，no-op 时长度=0

  **QA Scenarios**:

  ```
  Scenario: 邻接保护（不相邻蓝免疫）
    Tool: Vitest (Node)
    Preconditions: 构造 world：red=[A], blue=[B(不邻A), C(邻A)]
    Steps:
      1. 跑 paintingStep 100 次（每次用不同 rng counter）
      2. 收集每次哪个 site 翻转（如有）
    Expected Result: 翻转的总是 C，B 永远不翻
    Evidence: .sisyphus/evidence/task-7-adjacency-respect.txt

  Scenario: 无邻居时 no-op
    Tool: Vitest (Node)
    Preconditions: red=[A], blue=[B,C,D,E] 均不邻 A
    Steps:
      1. const result = paintingStep(world, rng)
      2. assert result.world === world OR deep equal（不变）
      3. assert result.events.length === 0
    Expected Result: world 完全不变
    Evidence: .sisyphus/evidence/task-7-no-neighbor-noop.txt

  Scenario: 全红时 no-op
    Tool: Vitest (Node)
    Preconditions: 全部 5 site 都 ownerId = faction_red
    Steps:
      1. paintingStep(world, rng)
    Expected Result: world 不变 + events 空
    Evidence: .sisyphus/evidence/task-7-all-red-noop.txt

  Scenario: 确定性
    Tool: Vitest (Node)
    Steps:
      1. const r1 = paintingStep(world, {seed:42, counter:0})
      2. const r2 = paintingStep(world, {seed:42, counter:0})
      3. assert deepEqual(r1.world, r2.world)
      4. assert r1.events[0].payload.siteId === r2.events[0].payload.siteId
    Expected Result: 两次完全相同
    Evidence: .sisyphus/evidence/task-7-determinism.txt

  Scenario: 全演化收敛（本地 fixture 集成测试）
    Tool: Vitest (Node)
    Preconditions: 测试内手工构造 5-site world fixture（不依赖 T8 的 loadM0Data）
    Steps:
      1. const world = makeFixtureWorld({ sites: 5, edges: [[1,2],[1,3],[2,4],[3,5],[4,5]], initialOwnership: { 1: 'faction_red', 2..5: 'faction_blue' } })
      2. for i in 0..100:
           const r = paintingStep(world, world.rngState)
           world = { ...r.world, rngState: r.nextRng }
      3. count red sites in final world
    Expected Result: 5 个 site 全红（最多 4 次 flip + N 次 no-op）
    Note: 真实 m0 数据集成测试在 T15 E2E 中通过 QA-FUNC-1 覆盖，避免 T7→T8 双向依赖
    Evidence: .sisyphus/evidence/task-7-full-evolution.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-7-adjacency-respect.txt`
  - [ ] `.sisyphus/evidence/task-7-no-neighbor-noop.txt`
  - [ ] `.sisyphus/evidence/task-7-all-red-noop.txt`
  - [ ] `.sisyphus/evidence/task-7-determinism.txt`
  - [ ] `.sisyphus/evidence/task-7-full-evolution.txt`

  **Commit**: YES
  - Message: `feat(engine/painting): add red-eats-blue painting step`
  - Files: `src/engine/systems/painting/painting.ts`, `src/engine/systems/painting/index.ts`, `src/engine/systems/painting/__tests__/painting.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/engine/systems`

- [x] 8. **WorldState 工厂 + 加载 m0 数据 + Zod 校验**

  **What to do**:
  - 在 `src/engine/world/factory.ts` 实现：
    - `createInitialWorld(data: M0Data, seed: number): World`
      1. 用 `M0DataSchema` 重新校验 `data`（即使加载时已校验，工厂里 paranoid check）
      2. **派生运行时 Site**：把 `data.sites: RawSite[]` 转换为 `Site[]`，对每个 RawSite 查 `data.initialOwnership[rawSite.id]` 得到 ownerId（必须是 factions 中的有效 id），合并为 `Site = {...rawSite, ownerId}`
      3. 把 `Site[]` 转 `Map<SiteId, Site>`
      4. 把 `data.factions` 数组转 `Map<FactionId, Faction>`
      5. **校验 ownership 引用完整性**：每个 initialOwnership 的 value 必须存在于 factions map 中；任何 site.id 没有 initialOwnership 时 ownerId = null（M0 规则：初始全部分配）
      6. 构造 `rngState = { seed, counter: 0 }`
      7. 设置 `phases: [paintingStep]`
      8. 返回 World（含 `tick: 0`, `date: INITIAL_DATE`）
    - `loadM0Data(): M0Data` —— 从 `src/content/m0/sites.json` 静态导入并用 `M0DataSchema` 校验
  - 在 `src/engine/world/index.ts` 导出
  - 在 `src/engine/world/__tests__/factory.test.ts` 测试

  **Must NOT do**:
  - ❌ 用 `fetch` 异步加载 sites.json（M0 用静态 import，编译时打包）
  - ❌ 跳过 Zod 校验（必须每次都跑，捕获数据 drift）
  - ❌ 让 createInitialWorld 引入 random number 用 Math.random（用 seed 派生）
  - ❌ 在 world 工厂里写涂色逻辑（painting 是 phase，不属于工厂）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 工厂函数 + JSON 加载 + Zod 校验，模式简单
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES（Wave 2 内，但 T7 必须先完成才能链接 paintingStep）
  - **Parallel Group**: Wave 2（T8 实际启动可在 T2/T5 完成后；但完成需等 T7 export paintingStep）
  - **Blocks**: T9
  - **Blocked By**: T1, T2, T5, **T7**（factory 需要 import paintingStep）
  - **执行策略**：T8 可在 T7 进行中并行启动（先实现 createInitialWorld 的非 phases 部分，phases 字段先留 `[]` 占位）；T7 合并后再补 `phases: [paintingStep]` + 通过测试。这是 Wave 2 内部 micro-ordering。

  **References**:

  **Pattern References**:
  - `docs/design/10-tech.md` §5.1 "剧本加载流程" - 加载 → Zod 校验 → 构建 WorldState
  - `docs/design/10-tech.md` §5.2 "Schema 校验" - 强制校验、不允许宽容加载

  **External References**:
  - Vite 静态 JSON import：https://vitejs.dev/guide/features.html#json
  - Zod parse vs safeParse：https://zod.dev/?id=parse-safeparse

  **WHY Each Reference Matters**:
  - §5.1 是数据加载契约的权威 —— "明确报错"是 hard requirement，不是 nice-to-have。
  - 静态 import 让 sites.json 在编译期解析，运行时无网络依赖。

  **Acceptance Criteria**:
  - [ ] `createInitialWorld(validData, 42)` 返回 World：
    - sites.size === 5
    - factions.size === 2
    - rngState === { seed: 42, counter: 0 }
    - phases.length === 1
    - tick === 0
    - date === INITIAL_DATE
  - [ ] 故意构造无效 data（如 site.ownerId 引用不存在的 faction）→ Zod 抛错，错误消息含 path
  - [ ] `loadM0Data()` 返回的 data 通过 schema

  **QA Scenarios**:

  ```
  Scenario: 工厂构造正确
    Tool: Vitest (Node)
    Steps:
      1. const data = loadM0Data()
      2. const world = createInitialWorld(data, 42)
      3. assert all 关键字段（见 acceptance criteria）
    Expected Result: 全部断言通过
    Evidence: .sisyphus/evidence/task-8-factory-ok.txt

  Scenario: 损坏数据 Zod 拒绝
    Tool: Vitest (Node)
    Steps:
      1. const bad = { ...validData, sites: validData.sites.map(s => ({...s, polygon: undefined})) }
      2. expect(() => createInitialWorld(bad, 42)).toThrow(ZodError)
      3. 检查 ZodError.issues 包含 path 'sites.0.polygon'
    Expected Result: 抛 ZodError，路径明确
    Evidence: .sisyphus/evidence/task-8-zod-reject.txt

  Scenario: ownerId 引用不存在 faction → 拒绝
    Tool: Vitest (Node)
    Steps:
      1. const bad = { ...validData, initialOwnership: { site_1: 'faction_does_not_exist' } }
      2. createInitialWorld(bad, 42) → 应该报错（自定义检查，而非 Zod 默认）
    Expected Result: 抛错，说明 'site_1 references unknown faction faction_does_not_exist'
    Evidence: .sisyphus/evidence/task-8-faction-ref.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-8-factory-ok.txt`
  - [ ] `.sisyphus/evidence/task-8-zod-reject.txt`
  - [ ] `.sisyphus/evidence/task-8-faction-ref.txt`

  **Commit**: YES
  - Message: `feat(engine/world): add WorldState factory loading m0 data with Zod`
  - Files: `src/engine/world/factory.ts`, `src/engine/world/index.ts`, `src/engine/world/__tests__/factory.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/engine/world`

- [x] 9. **Zustand store 桥接（订阅式更新）**

  **What to do**:
  - 在 `src/ui/store/game-store.ts` 创建 Zustand store：
    - State：
      - `world: World`（不可变，每次 tick 替换整个对象）
      - `clockState: ClockState`（speed + realTimeAccum）
      - `events: GameEvent[]`（最近一 tick 的事件，便于 UI 反应）
    - Actions：
      - `tick(deltaMs: number)`：调用 `advanceClock`，原子更新 world + clockState
      - `setSpeed(speed: SpeedTier)`：调用 engine 的 setSpeed
      - `reset()`：M0 调试用
    - 用 Immer middleware 让 actions 可写命令式但实际不可变
  - 在 `src/ui/store/raf-driver.ts` 创建 RAF driver：
    - hook `useRafDriver()`：在 React mount 时启动 RAF 循环，**每帧 cap deltaMs 到 `MAX_DELTA_MS` (100ms)** 后调用 `store.tick(cappedDeltaMs)`，unmount 时停止
    - cap 的目的是防止 tab-background 后 RAF timestamp 跳跃几十秒导致的死亡螺旋
    - `store.tick` 直接传给 engine `advanceClock`（engine 信任输入；driver 已 cap）
    - 提供测试用 helper `applyRafFrame(state, deltaMs)`：纯函数版（接收已 cap 的 deltaMs），便于单测 RAF 行为
  - 在 `src/ui/store/selectors.ts` 定义 fine-grained selectors：
    - `useWorldDate(): GameDate` —— 仅订阅 date
    - `useWorldTick(): number`
    - `useSpeed(): SpeedTier`
    - `useSites(): ReadonlyMap<SiteId, Site>`
    - `useFactions(): ReadonlyMap<FactionId, Faction>`
    - 每个 selector 用 `useShallow` 或 `subscribeWithSelector` 防止过度 re-render
  - 暴露调试 hook：`window.__game = { store, world: () => store.getState().world }`（开发模式 only，便于 Playwright 在测试中读取状态）—— 仅 import.meta.env.DEV
  - 在 `src/ui/store/__tests__/store.test.ts` 写测试（jsdom 环境）

  **Must NOT do**:
  - ❌ 把 zustand 导入到 `src/engine/**`（违反 T11 规则）
  - ❌ 让 store 直接持有 RAF id（driver 应是独立 hook，方便测试）
  - ❌ 让 store 包含业务逻辑（painting 等都是 engine pure functions，store 仅胶水）
  - ❌ 让 selectors 返回新对象引用每次（破坏 React.memo / shallow comparison）
  - ❌ 在生产构建挂 `window.__game`（用 import.meta.env.DEV gate）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Zustand + Immer + RAF driver + selector 优化，跨 engine/ui 桥接，需谨慎处理订阅与重渲染
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T10, T12, T13, T14
  - **Blocked By**: T1, T2, T6, T7, T8

  **References**:

  **Pattern References**:
  - `docs/design/10-tech.md` §1.1 - Zustand + Immer 选型
  - `docs/design/10-tech.md` §3.2 Tick Phase 10 - "数据快照（State Snapshot for UI）" - tick 末状态供 UI 订阅

  **External References**:
  - Zustand + Immer：https://github.com/pmndrs/zustand/blob/main/docs/integrations/immer-middleware.md
  - subscribeWithSelector：https://zustand.docs.pmnd.rs/middlewares/subscribe-with-selector
  - useShallow：https://zustand.docs.pmnd.rs/hooks/use-shallow
  - import.meta.env：https://vitejs.dev/guide/env-and-mode.html

  **WHY Each Reference Matters**:
  - Zustand 选型已锁定（10-tech.md），用其 Immer middleware 处理大状态最优。
  - subscribeWithSelector + useShallow 是 React 渲染优化的标准模式 —— 验证 QA-PERF-3（每 tick re-render ≤ 1）必须依赖此。
  - `window.__game` 是 Playwright E2E 测试读取 world 状态的官方钩子。

  **Acceptance Criteria**:
  - [ ] store.tick(5500) at 1x speed 推进 1 tick：world.tick === 1
  - [ ] store.setSpeed('5x') 后 store.getState().clockState.speed === '5x' 且 realTimeAccum === 0
  - [ ] selectors 各自 fine-grained：mock useStore，调用 useWorldTick 仅在 tick 变化时返回新值
  - [ ] DEV mode：`window.__game` 存在；PROD：不存在（用 vitest 模拟两种环境）
  - [ ] React Profiler 测试（jsdom）：1 个 tick 触发 TopBar/MapCanvas（mock）各 ≤ 1 次 render
  - [ ] **deltaMs cap（防 tab-background 死亡螺旋）**：driver 收到 deltaMs=60000ms 调用 RAF 回调时，传给 store.tick 的 deltaMs 必须是 100ms（cap 后），不是 60000ms
  - [ ] driver 调用 store.tick 时已 cap：5x speed + RAF 回调 deltaMs=60000 → world.tick 推进数 ≤ MAX_DELTA_MS / 400 = 0.25 → 0 tick

  **QA Scenarios**:

  ```
  Scenario: tick 推进世界
    Tool: Vitest (jsdom)
    Steps:
      1. const store = createStore()
      2. store.getState().setSpeed('1x')
      3. store.getState().tick(5500)
      4. assert store.getState().world.tick === 1
    Expected Result: tick 推进 1
    Evidence: .sisyphus/evidence/task-9-store-tick.txt

  Scenario: setSpeed 重置 accum
    Tool: Vitest (jsdom)
    Steps:
      1. ... 推进至 accum>0
      2. store.getState().setSpeed('5x')
      3. assert clockState.realTimeAccum === 0
    Expected Result: accum 归零
    Evidence: .sisyphus/evidence/task-9-set-speed.txt

  Scenario: Selector fine-grained re-render（QA-PERF-3 雏形）
    Tool: Vitest (jsdom) + React Testing Library + React.Profiler
    Steps:
      1. mount <App> with 子组件 <TopBar> <MapCanvas>（用 minimal mocks）
      2. 用 React.Profiler 包它们
      3. 推进 1 tick
      4. 断言 TopBar render 次数 ≤ 1 + MapCanvas render 次数 ≤ 1
    Expected Result: 每个组件 1 次 render
    Evidence: .sisyphus/evidence/task-9-rerender-discipline.txt

  Scenario: window.__game 仅 DEV
    Tool: Vitest (jsdom)
    Steps:
      1. mock import.meta.env.DEV = true → 启动 store → window.__game 存在
      2. mock import.meta.env.DEV = false → window.__game === undefined
    Expected Result: 仅 DEV 暴露
    Evidence: .sisyphus/evidence/task-9-debug-hook.txt

  Scenario: Driver cap 防 tab-background 死亡螺旋
    Tool: Vitest (jsdom)
    Steps:
      1. mock RAF：模拟 timestamp 跳跃（前一帧 t1=0，后一帧 t2=60000，deltaMs=60000）
      2. driver 收到 deltaMs=60000，应 cap 到 100ms 后调 store.tick(100)
      3. 5x speed 下 store.tick(100) 推进 0 tick（100/400=0.25）
      4. 验证 world.tick 没有变成 150
    Expected Result: cap 生效，避免推进 150 tick
    Evidence: .sisyphus/evidence/task-9-driver-cap.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-9-store-tick.txt`
  - [ ] `.sisyphus/evidence/task-9-set-speed.txt`
  - [ ] `.sisyphus/evidence/task-9-rerender-discipline.txt`
  - [ ] `.sisyphus/evidence/task-9-debug-hook.txt`
  - [ ] `.sisyphus/evidence/task-9-driver-cap.txt`

  **Commit**: YES
  - Message: `feat(ui/store): add Zustand store bridging engine to React`
  - Files: `src/ui/store/game-store.ts`, `src/ui/store/raf-driver.ts`, `src/ui/store/selectors.ts`, `src/ui/store/index.ts`, `src/ui/store/__tests__/store.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/ui/store`

- [x] 10. **Canvas 地图渲染（多边形 + 0.3s 颜色过渡）**

  **What to do**:
  - 在 `src/rendering/map/MapCanvas.tsx` 实现 React 组件：
    - props：尺寸（默认 800×600）
    - 用 `useRef<HTMLCanvasElement>` 持有 canvas DOM
    - `useEffect` 初始化：DPR 缩放（`devicePixelRatio`）确保高清；context = `getContext('2d')`
    - 订阅 `useSites()` 和 `useFactions()` —— 仅当变化时重绘
    - 重绘逻辑：`drawSites(ctx, sites, factions, transition)`
      - 清空 canvas（fillRect 米色 #F5EFD9 背景，per `09-ux-ui.md §5.2`）
      - 对每个 site：
        - `ctx.beginPath()`
        - `ctx.moveTo(polygon[0])`，`ctx.lineTo(polygon[i])` for each remaining vertex
        - `ctx.closePath()`
        - `ctx.fillStyle = factions.get(site.ownerId).color`
        - `ctx.fill()`
        - `ctx.strokeStyle = '#1A1A1A'`，`ctx.lineWidth = 1`，`ctx.stroke()`（细黑边帮助分辨）
        - 在多边形质心（centroid）画 site name（`ctx.fillText`，灰色字）
  - **0.3s 颜色过渡**（per `02-map.md §4.4`）：
    - 维护一个 `transitionMap: Map<SiteId, { fromColor, toColor, startMs, durationMs: 300 }>`（组件本地 useRef 状态）
    - 当 site.ownerId 变化时（store 订阅触发），记录 transition 起点
    - 渲染时插值：`progress = clamp01((now - startMs) / durationMs)`，`color = lerpColor(from, to, easeInOut(progress))`
    - **本地 RAF 仅用于视觉过渡动画**：当 transitionMap 非空时，启动一个**仅渲染层用**的 RAF 循环每帧重绘 canvas；transition 全部完成后停止 RAF
    - **关键约束**：此 RAF 仅触发**渲染层**的 redraw，**绝不**调用 store 的 tick 或推进 engine 状态。Engine 推进由 T9 的独立 raf-driver 负责，两者使用各自的 RAF id，互不干扰
    - 实现 `lerpColor(hex1, hex2, t)` 简单 RGB 插值
  - **不要**实现：缩放、平移、hover、点击、地图模式切换、阴影、渐变
  - 在 `src/rendering/map/__tests__/map-canvas.test.tsx` 测试：
    - 用 jsdom + `@testing-library/react` mount 组件
    - 用 mock canvas（jsdom 的 canvas 非真实绘制，但可以验证 ctx method 被调用）
    - 模拟 site ownerId 变化 → 验证 ctx.fill 重新调用

  **Must NOT do**:
  - ❌ 引入 PixiJS / WebGL（per 10-tech.md §1.2 不选）
  - ❌ 添加缩放/平移/拖拽/缩略图（M2+）
  - ❌ 添加 hover 高亮、site 点击交互（M1+）
  - ❌ 添加阴影、渐变、抗锯齿微调（per Must NOT Have）
  - ❌ 让 Canvas DOM 操作泄漏到 engine 层
  - ❌ 用 RAF **驱动 engine tick**（engine 推进只能通过 T9 的 raf-driver；本组件的 RAF 仅渲染插值）
  - ❌ 让本组件的 RAF 调用任何 store action（如 store.tick）—— 仅 setState/redraw
  - ❌ Transition 全部结束后让 RAF 持续空转（必须停止 RAF 释放资源）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Canvas 多边形渲染 + 颜色插值 + DPR 处理是视觉工程标准任务
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES（Wave 3 内）
  - **Parallel Group**: Wave 3
  - **Blocks**: T14
  - **Blocked By**: T1, T2, T9

  **References**:

  **Pattern References**:
  - `docs/design/02-map.md` §4.4 "涂色过渡动画" - 0.3s ease-in 渐变
  - `docs/design/02-map.md` §4.3 "涂色规则" - M0 仅做"稳固归属"实色，不涉及 control_level / contested
  - `docs/design/09-ux-ui.md` §5.2 "配色" - 米色背景 #F5EFD9
  - `docs/design/10-tech.md` §4.1 渲染分层 - M0 仅 Layer 0（背景）+ Layer 2（涂色），跳过 Layer 1（地形）和 Layer 3（单位）

  **External References**:
  - Canvas DPR 缩放：https://web.dev/articles/canvas-hidipi
  - Canvas 多边形 fill：https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fill
  - 颜色 RGB 插值（简单 lerp）

  **WHY Each Reference Matters**:
  - `02-map.md §4.4` 是 Metis 强烈建议的"feel"信号 —— 不要把 0.3s 过渡作为 stretch goal，否则人眼看不清 5x speed 下的变化。
  - DPR 缩放保证不同 DPI 屏幕都清晰；M0 不做也能跑，但是体验差。
  - 渲染分层 `10-tech.md §4.1` 决定 M0 单 Canvas 即可，无需多层组合（M2+ 才需要）。

  **Acceptance Criteria**:
  - [ ] 启动 dev server，浏览器看到 5 块不规则色块（背景米色、polygon 填色、黑细边、中心 site name）
  - [ ] 初始：site_1 红、site_2-5 蓝
  - [ ] tick 推进，site 翻转时颜色 0.3s 平滑过渡（不是瞬间跳变）
  - [ ] DPR=2 屏幕（视网膜）渲染清晰（无模糊）
  - [ ] Canvas 单层，无多层叠加
  - [ ] **本地 RAF 仅当 transition 进行中才运行**：transition 结束后 RAF 停止（用 mock 验证 cancelAnimationFrame 被调用）
  - [ ] **本地 RAF 不调用 store action**：mock store action 监听，验证组件 RAF 循环中零调用

  **QA Scenarios**:

  ```
  Scenario: 初始渲染所有 site
    Tool: Vitest (jsdom) + RTL + canvas mock
    Steps:
      1. mount <MapCanvas /> with mock store containing 5 sites
      2. 触发 useEffect 重绘
      3. 验证 ctx.fill 被调用 5 次（每个 site 一次）
      4. 验证 fillStyle 调用顺序：site_1=red, site_2-5=blue
    Expected Result: 5 次 fill + 颜色正确
    Evidence: .sisyphus/evidence/task-10-initial-render.txt

  Scenario: ownerId 变化触发重绘
    Tool: Vitest (jsdom)
    Steps:
      1. mount + 初始渲染（记录 fill 调用数）
      2. mock store 把 site_2 改为 red
      3. 等待 useEffect 重新触发
      4. 验证 ctx.fill 重新调用，site_2 fillStyle = red
    Expected Result: 重绘发生 + 新颜色应用
    Evidence: .sisyphus/evidence/task-10-rerender-on-change.txt

  Scenario: 真浏览器视觉验证
    Tool: Playwright
    Preconditions: dev server 运行
    Steps:
      1. 导航到 http://localhost:5173
      2. 等待 canvas 渲染完成
      3. 截图 .sisyphus/evidence/task-10-initial.png
      4. 视觉断言：canvas 元素存在 + 不为空白（用 page.evaluate 读 imageData，验证非全白）
    Expected Result: canvas 含彩色像素
    Evidence: .sisyphus/evidence/task-10-initial.png + visual-check.txt

  Scenario: 0.3s 颜色过渡可观察
    Tool: Playwright
    Steps:
      1. 等待第一次 paint（site flip 发生）
      2. 在 flip 发生前后 50ms 各截图
      3. 视觉对比：颜色应"渐变"而非"瞬变"（采样 site 中心像素，确认中间状态颜色不是纯红/纯蓝而是过渡值）
    Expected Result: 中间帧像素颜色为过渡色
    Evidence: .sisyphus/evidence/task-10-transition-{before,mid,after}.png

  Scenario: 本地 RAF 不调用 store action
    Tool: Vitest (jsdom)
    Steps:
      1. mount <MapCanvas /> + mock store with spy on tick/setSpeed actions
      2. 触发 site ownerId 变化 → 进入 transition
      3. 让 RAF 循环跑 5 帧（用 vi.advanceTimersByTime + RAF mock）
      4. assert store.tick.mock.calls.length === 0 + store.setSpeed.mock.calls.length === 0
    Expected Result: 渲染层 RAF 零 store action 调用
    Evidence: .sisyphus/evidence/task-10-raf-isolation.txt

  Scenario: Transition 结束后 RAF 停止
    Tool: Vitest (jsdom) + RAF mock
    Steps:
      1. mock requestAnimationFrame + cancelAnimationFrame，记录调用
      2. 触发 transition（site flip）→ RAF 启动（rafId 被记录）
      3. 推进时间 ≥ 300ms（transition 完成）
      4. assert cancelAnimationFrame 被调用 with 之前的 rafId
      5. assert 后续帧不再调用 requestAnimationFrame
    Expected Result: RAF 正确清理，不空转
    Evidence: .sisyphus/evidence/task-10-raf-cleanup.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-10-initial-render.txt`
  - [ ] `.sisyphus/evidence/task-10-rerender-on-change.txt`
  - [ ] `.sisyphus/evidence/task-10-initial.png`
  - [ ] `.sisyphus/evidence/task-10-transition-*.png`
  - [ ] `.sisyphus/evidence/task-10-raf-isolation.txt`
  - [ ] `.sisyphus/evidence/task-10-raf-cleanup.txt`

  **Commit**: YES
  - Message: `feat(rendering): add Canvas polygon renderer with 0.3s color tween`
  - Files: `src/rendering/map/MapCanvas.tsx`, `src/rendering/map/draw-sites.ts`, `src/rendering/map/lerp-color.ts`, `src/rendering/map/index.ts`, `src/rendering/map/__tests__/*.test.tsx`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/rendering`

- [x] 12. **顶栏（日期 + 速度档 + Tick 数显示）**

  **What to do**:
  - 在 `src/ui/components/TopBar/TopBar.tsx` 实现 React 组件：
    - 订阅 `useWorldDate()`, `useWorldTick()`, `useSpeed()`
    - 渲染单行：`{formatGameDate(date)} | 速度: {speedLabel(speed)} | Tick: {tick}`
    - 例如："公元前 453 年 春 上旬 | 速度: 3x | Tick: 42"
    - 在每个数据片段加 `data-testid` 便于 Playwright：
      - `data-testid="top-bar-date"` for 日期
      - `data-testid="top-bar-speed"` for 速度档
      - `data-testid="top-bar-tick-count"` for tick 数
    - **不**应用古典美术（无字体、配色、纹理）—— M0 用浏览器默认 sans-serif，黑字白底，CSS 仅 padding/margin/border-bottom
    - 文件 `src/ui/components/TopBar/TopBar.module.css` 定义最简样式
  - 实现 helper `speedLabel(speed: SpeedTier): string`：
    - pause → '⏸ 暂停'
    - 1x..5x → '▶ 1x', '▶▶ 2x', ...（per `01-core-loop.md §2.2`）
  - 在 `src/ui/components/TopBar/__tests__/top-bar.test.tsx` 测试

  **Must NOT do**:
  - ❌ 添加资源数字（国库/兵源/民望 等）—— 这些是 M1+ 的内容
  - ❌ 添加古典美术（自定义字体、纹理、思源宋体加载、配色考究）
  - ❌ 让顶栏直接调用 engine（必须通过 store 间接读取）
  - ❌ 在顶栏渲染时做日期格式化以外的计算（pure display）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: React 组件 + selector 订阅 + 简单样式
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: T14
  - **Blocked By**: T1, T4, T9

  **References**:

  **Pattern References**:
  - `docs/design/11-roadmap.md` §3.2 - "顶栏（仅时间显示）"
  - `docs/design/09-ux-ui.md` §2.1 顶栏元素 - M0 取最小子集（仅时间相关）
  - `docs/design/01-core-loop.md` §2.2 - 速度档位标签

  **External References**:
  - React.memo + useShallow（避免顶栏在无关 store 变化时重渲染）

  **WHY Each Reference Matters**:
  - 路线图明确"顶栏（仅时间显示）"—— 不能把其他面板内容塞进去。
  - 速度档标签需匹配 `01-core-loop.md §2.2` 表格，否则与 T13 时间控制条不一致。

  **Acceptance Criteria**:
  - [ ] 渲染显示 "公元前 453 年 春 上旬 | 速度: ⏸ 暂停 | Tick: 0"（initial 状态）
  - [ ] tick 推进时数字更新（断言 DOM 文本变化）
  - [ ] speed 切换时档位标签更新
  - [ ] data-testid 三个选择器 Playwright 可定位
  - [ ] React Profiler：tick 推进 → TopBar render 次数 = 1（不多余 re-render）

  **QA Scenarios**:

  ```
  Scenario: 初始渲染
    Tool: Vitest (jsdom) + RTL
    Steps:
      1. mount <TopBar /> with default world (tick=0, date=INITIAL_DATE, speed=pause)
      2. assert document.querySelector('[data-testid="top-bar-date"]').textContent === '公元前 453 年 春 上旬'
      3. assert testid='top-bar-speed' textContent contains '暂停'
      4. assert testid='top-bar-tick-count' textContent === 'Tick: 0'
    Expected Result: 三段文本正确
    Evidence: .sisyphus/evidence/task-12-initial.txt

  Scenario: 状态变化更新显示
    Tool: Vitest (jsdom) + RTL
    Steps:
      1. mount + 触发 store.setSpeed('3x') + store 推进 tick 至 5
      2. assert speed testid 显示 '3x'
      3. assert tick testid 显示 'Tick: 5'
    Expected Result: 显示同步更新
    Evidence: .sisyphus/evidence/task-12-update.txt

  Scenario: Render 次数限制
    Tool: Vitest + React.Profiler
    Steps:
      1. mount + 包 Profiler
      2. 推进 1 tick
      3. 检查 onRender 回调次数 ≤ 1
    Expected Result: 最多 1 次 render
    Evidence: .sisyphus/evidence/task-12-rerender.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-12-initial.txt`
  - [ ] `.sisyphus/evidence/task-12-update.txt`
  - [ ] `.sisyphus/evidence/task-12-rerender.txt`

  **Commit**: YES
  - Message: `feat(ui): add top bar showing date + speed + tick count`
  - Files: `src/ui/components/TopBar/TopBar.tsx`, `src/ui/components/TopBar/TopBar.module.css`, `src/ui/components/TopBar/index.ts`, `src/ui/components/TopBar/__tests__/top-bar.test.tsx`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/ui/components/TopBar`

- [x] 13. **时间控制条（暂停 + 5 档速度按钮）**

  **What to do**:
  - 在 `src/ui/components/TimeControlBar/TimeControlBar.tsx` 实现：
    - 6 个按钮：⏸ 暂停 / ▶ 1x / ▶▶ 2x / ▶▶▶ 3x / ▶▶▶▶ 4x / ▶▶▶▶▶ 5x
    - 每个按钮：
      - `data-testid="time-control-{pause|1x|2x|3x|4x|5x}"`
      - `aria-label="speed-{name}"` 便于无障碍 + Playwright 选择
      - onClick → 调用 `store.setSpeed(...)`
      - 当前选中速度按钮加 `aria-pressed="true"` + CSS 高亮
    - 简单 flex 横向布局
    - 同样无古典美术，CSS 仅 padding/border/active state
  - 在 `src/ui/components/TimeControlBar/__tests__/time-control-bar.test.tsx` 测试

  **Must NOT do**:
  - ❌ 添加快捷键绑定（Space 暂停、+/- 调速）—— per `09-ux-ui.md §6.2` 是好功能但 M0 仅做按钮
    - 等等：`09-ux-ui.md §6.2` 列出 Space 暂停 + +/- 调速作为基础热键。重新评估：
    - **决策**：Space + +/- 是核心交互便利，**实现** —— 但仅这 3 个键，无其他热键
    - 用 `useEffect` + `window.addEventListener('keydown')` 实现，注意 cleanup
  - ❌ 添加复杂动画（按钮按下震动等）
  - ❌ 让此组件直接调 engine（必须经 store）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: React 按钮组件 + 状态绑定 + 键盘监听
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: T14
  - **Blocked By**: T1, T6, T9

  **References**:

  **Pattern References**:
  - `docs/design/11-roadmap.md` §3.2 - "时间控制条"
  - `docs/design/09-ux-ui.md` §2.5 底栏 - 时间控制条位置
  - `docs/design/09-ux-ui.md` §6.2 默认热键 - Space + +/-
  - `docs/design/01-core-loop.md` §2.2 - 5 档速度标签

  **External References**:
  - aria-pressed：https://www.w3.org/WAI/ARIA/apg/patterns/button/

  **WHY Each Reference Matters**:
  - 路线图明确"时间控制条"是 M0 必有，是验证"暂停哲学"（`01-core-loop.md §3`）的最低交互。
  - aria-pressed 让无障碍 + 测试都易识别当前态。

  **Acceptance Criteria**:
  - [ ] 6 个按钮渲染 + 文本/symbol 正确
  - [ ] 点击 1x 按钮 → store.setSpeed 被调用 + 该按钮高亮
  - [ ] Space 键 → 切换 pause / 上次速度（记忆上次选）
  - [ ] +/- 键 → 上下切档
  - [ ] data-testid 全部正确（6 个）
  - [ ] aria-pressed 仅当前速度为 true

  **QA Scenarios**:

  ```
  Scenario: 按钮渲染齐全
    Tool: Vitest (jsdom) + RTL
    Steps:
      1. mount <TimeControlBar />
      2. assert 6 个 testid 存在
    Expected Result: 6 个按钮
    Evidence: .sisyphus/evidence/task-13-buttons.txt

  Scenario: 点击切换速度
    Tool: Vitest (jsdom)
    Steps:
      1. mount + 默认 pause
      2. fireEvent.click(getByTestId('time-control-3x'))
      3. assert store.getState().clockState.speed === '3x'
      4. assert getByTestId('time-control-3x').getAttribute('aria-pressed') === 'true'
      5. assert getByTestId('time-control-pause').getAttribute('aria-pressed') === 'false'
    Expected Result: 速度切换 + 高亮正确
    Evidence: .sisyphus/evidence/task-13-click.txt

  Scenario: Space 键暂停切换
    Tool: Vitest (jsdom)
    Steps:
      1. mount + 设速度为 3x
      2. fireEvent.keyDown(window, { key: ' ' })
      3. assert speed === 'pause'
      4. fireEvent.keyDown 再按一次
      5. assert speed === '3x'（记忆上次）
    Expected Result: Space 切换正确
    Evidence: .sisyphus/evidence/task-13-space-key.txt

  Scenario: +/- 调档
    Tool: Vitest (jsdom)
    Steps:
      1. mount + 速度 3x
      2. fireEvent.keyDown(window, { key: '+' }) → 4x
      3. fireEvent.keyDown(window, { key: '-' }) → 3x
      4. 测试边界：5x + '+' → 仍 5x（不溢出）
    Expected Result: 调档行为正确 + 边界
    Evidence: .sisyphus/evidence/task-13-plus-minus.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-13-buttons.txt`
  - [ ] `.sisyphus/evidence/task-13-click.txt`
  - [ ] `.sisyphus/evidence/task-13-space-key.txt`
  - [ ] `.sisyphus/evidence/task-13-plus-minus.txt`

  **Commit**: YES
  - Message: `feat(ui): add time control bar with pause + 5 speed buttons`
  - Files: `src/ui/components/TimeControlBar/TimeControlBar.tsx`, `src/ui/components/TimeControlBar/TimeControlBar.module.css`, `src/ui/components/TimeControlBar/index.ts`, `src/ui/components/TimeControlBar/__tests__/time-control-bar.test.tsx`
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test src/ui/components/TimeControlBar`

- [x] 14. **应用入口与组装（重写 main.tsx 占位 + App.tsx + 演示完成提示）**

  **What to do**:
  - **完全重写** T1 创建的占位 `src/main.tsx` 为正式入口（占位仅为脚手架自洽）：
    - `ReactDOM.createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)`
    - 处理 URL 查询参数：`?seed=N` 覆盖默认 seed（默认 42）；`?paintInterval=N` 覆盖默认 PAINT_INTERVAL_TICKS
    - 在 DEV 模式挂 `window.__game = { store, world: () => store.getState().world }`（与 T9 中 store debug hook 形态一致）
  - 在 `src/App.tsx` 组装：
    - 顶层 layout：垂直 `flex` —— TopBar / MapCanvas / TimeControlBar
    - `useRafDriver()` 启动 RAF 驱动
    - 监听 store 中"全红状态"：用 selector 计算 `allRed = sites 全部 ownerId === faction_red`
    - allRed 时，覆盖一个简单 banner："演示完成"（CSS 半透明黑底白字，data-testid="demo-complete"）
  - `index.html` 已在 T1 创建，确认包含：`<div id="root"></div>` + viewport meta + 中文字符集
  - 为 React 18 StrictMode 双调用兼容性做检查（确保 RAF driver 在 cleanup 时停止上次的 raf id）

  **Must NOT do**:
  - ❌ 添加任何额外面板（外交/军事 等）
  - ❌ 添加路由（react-router）
  - ❌ 添加全局 CSS reset 库（用浏览器默认 + 最小重置即可）
  - ❌ 添加错误边界（M0 dev 阶段，错误直接抛出更易调试）
  - ❌ 在生产构建保留 `window.__game`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 组装工作，所有零件都已就位，只是粘合
  - **Skills**: 无

  **Parallelization**:
  - **Can Run In Parallel**: NO（依赖 T6/T9/T10/T12/T13 全部完成）
  - **Parallel Group**: Wave 4
  - **Blocks**: T15
  - **Blocked By**: T1, T6, T9, T10, T12, T13

  **References**:

  **Pattern References**:
  - `docs/design/09-ux-ui.md` §2 主屏幕布局 - M0 取最简（无左右栏）
  - `docs/design/10-tech.md` §2 - 分层组装

  **External References**:
  - React 18 StrictMode 双调用：https://react.dev/reference/react/StrictMode#fixing-bugs-found-by-double-rendering-in-development
  - Vite 环境变量 import.meta.env：https://vitejs.dev/guide/env-and-mode.html

  **WHY Each Reference Matters**:
  - StrictMode 在 dev 双调用 useEffect，RAF driver 必须正确 cleanup 否则会 leak。
  - URL 参数（seed、paintInterval）让 Playwright E2E 可重现性测试更便利。

  **Acceptance Criteria**:
  - [ ] `pnpm dev` 启动后浏览器看到完整 UI（顶栏 + Canvas + 控制条）
  - [ ] 默认 seed=42 加载（URL 无参数时）
  - [ ] `?seed=99` 改变 PRNG 种子，paint 序列不同
  - [ ] `?paintInterval=1` 加快 paint 触发频率
  - [ ] 全红时 demo-complete banner 显示
  - [ ] StrictMode 不导致 RAF leak（mount/unmount 5 次后 RAF id 数维持稳定）

  **QA Scenarios**:

  ```
  Scenario: 完整应用启动
    Tool: Playwright
    Steps:
      1. pnpm dev（在 background 启动）
      2. navigate to http://localhost:5173
      3. 等待 1s
      4. assert 顶栏 testid 都存在
      5. assert canvas 元素存在
      6. assert 6 个时间控制按钮都存在
    Expected Result: 全部组件渲染
    Evidence: .sisyphus/evidence/task-14-app-mount.png

  Scenario: URL 参数 seed 生效
    Tool: Playwright
    Steps:
      1. navigate to http://localhost:5173/?seed=42
      2. window.__game.store.getState().world.rngState.seed
    Expected Result: rngState.seed === 42
    Evidence: .sisyphus/evidence/task-14-seed-param.txt

  Scenario: 全红后显示 demo-complete
    Tool: Playwright
    Steps:
      1. navigate to /?paintInterval=1
      2. click 5x speed
      3. wait for window.__game.store.getState().world.sites 全部 red（poll 每 1s, 最多 30s）
      4. assert document.querySelector('[data-testid="demo-complete"]') 存在 + 可见
    Expected Result: 演示完成提示出现
    Evidence: .sisyphus/evidence/task-14-demo-complete.png

  Scenario: StrictMode 不 leak RAF
    Tool: Playwright（dev 模式自带 StrictMode 双调用）
    Steps:
      1. navigate to /
      2. 反复点击 pause / play 5 次
      3. 用 performance API 测 active RAF 数（可通过 stub 计数 raf id 验证）
    Expected Result: RAF id 数稳定（每次 unmount 都正确 cleanup）
    Evidence: .sisyphus/evidence/task-14-no-raf-leak.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-14-app-mount.png`
  - [ ] `.sisyphus/evidence/task-14-seed-param.txt`
  - [ ] `.sisyphus/evidence/task-14-demo-complete.png`
  - [ ] `.sisyphus/evidence/task-14-no-raf-leak.txt`

  **Commit**: YES
  - Message: `feat(app): wire up engine + rendering + ui in main entry`
  - Files: `src/main.tsx`, `src/App.tsx`, `src/App.module.css`, `index.html`（更新如需）
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test`

- [x] 15. **E2E 测试套件 + 交付物（Playwright video + 截图 + 完整 QA 矩阵）**

  **What to do**:
  - 配置 Playwright（`playwright.config.ts`）：
    - testDir: `e2e/`
    - 启动 webServer：`pnpm dev`，等 ready
    - video: `'on'`（每个测试都录视频，便于人工评审）
    - screenshot: `'on'`
    - artifacts 目录：`artifacts/`
    - 浏览器：chromium（M0 仅测一种）
    - viewport：1280×720（设计文档目标分辨率）
  - 创建 `e2e/` 目录下的测试文件，每个对应一个 QA 类别：
    - `e2e/perf.spec.ts`：QA-PERF-1 (60s 5x无错), QA-PERF-3（用 Profiler 包装）
    - `e2e/deliverable.spec.ts`：QA-DELIVERABLE-1 (testid 全在 + 3 截图), QA-DELIVERABLE-2（视频录制确认）
    - `e2e/func.spec.ts`：QA-FUNC-1（5x 90s 内全红）
    - `e2e/control.spec.ts`：QA-CONTROL-1（pause 停 tick），QA-CONTROL-2（每档速度推进近期望，25% 容差）
  - QA-PERF-2、QA-FUNC-2/3/4、QA-CONTROL-3、QA-DETERMINISM-*、QA-ARCH-* 全部已经在 Vitest 单元测试中实现（T2-T11 各任务的 QA Scenarios）；本任务再做 Vitest 集成确认
  - 创建 `pnpm` scripts：
    - `test:e2e` → `playwright test`
    - `test:e2e:install` → `playwright install chromium`
    - `test:all` → `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`
  - 在 `package.json` 添加 `@playwright/test` devDep
  - 创建 `artifacts/` 目录（gitignored）；CI 会上传作为 artifact
  - 创建 `e2e/fixtures/test-helpers.ts`：通用工具函数（启动应用、等待 ready、读取 store 状态）

  **Must NOT do**:
  - ❌ 测多浏览器（M0 仅 chromium，M12 再扩 Firefox/Safari）
  - ❌ 在 e2e 测试中 mock store（必须真实集成）
  - ❌ 测试时间 > 90s 的场景（CI 时间预算）
  - ❌ 把 artifacts 提交 git（用 .gitignore 排除，CI 上传）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 跨集成测试 + Playwright 配置 + 大量 spec 文件，需要全局视角
  - **Skills**: 无（agent 有 Playwright 经验即可，不必加 skill）

  **Parallelization**:
  - **Can Run In Parallel**: NO（必须等所有实现 task 完成）
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: T1-T14 全部

  **References**:

  **Pattern References**:
  - `docs/design/11-roadmap.md` §3.4 - M0 验收标准（已被 §Verification Strategy 重写为 agent-verifiable）
  - `docs/design/10-tech.md` §10 - 测试策略
  - 本计划 §Verification Strategy - 完整 QA 矩阵

  **External References**:
  - Playwright 配置：https://playwright.dev/docs/test-configuration
  - Playwright video：https://playwright.dev/docs/videos
  - Playwright webServer：https://playwright.dev/docs/test-webserver

  **WHY Each Reference Matters**:
  - 视频录制是路线图"team consensus on feel"的人工评审材料，不可省略。
  - QA 矩阵是 Metis 重写的 agent-verifiable 标准，本任务是其落地总执行。

  **Acceptance Criteria**:
  - [ ] `pnpm test:e2e` 退出 0
  - [ ] `artifacts/m0-demo.webm` 存在 + duration ≥ 35s（一次完整测试录制）
  - [ ] `artifacts/m0-{initial,paused,after-30s}.png` 三张截图
  - [ ] 所有 QA-PERF-*, QA-DELIVERABLE-*, QA-FUNC-*, QA-CONTROL-* spec 通过
  - [ ] 所有 QA-DETERMINISM-*, QA-ARCH-* Vitest 测试通过（已在 T2-T11 实现，本任务汇总跑一遍）
  - [ ] CI 配置（如有）能跑此 pipeline

  **QA Scenarios**:

  ```
  Scenario: E2E 全套通过
    Tool: Bash
    Steps:
      1. pnpm test:e2e:install
      2. pnpm test:e2e
    Expected Result: 退出码 0，所有 spec 通过
    Evidence: .sisyphus/evidence/task-15-e2e-results.txt（playwright report 副本）

  Scenario: 视频与截图齐全
    Tool: Bash
    Steps:
      1. ls artifacts/
    Expected Result: 见 m0-demo.webm + 3 张 png + playwright-report/ 目录
    Evidence: .sisyphus/evidence/task-15-artifacts-list.txt

  Scenario: 视频时长足够
    Tool: Bash + ffprobe（如有）或 file size sanity
    Steps:
      1. file size > 500KB（35s+ 视频粗估）
      2. （可选）ffprobe duration ≥ 35
    Expected Result: 视频不空且足够长
    Evidence: .sisyphus/evidence/task-15-video-duration.txt

  Scenario: 完整 pipeline
    Tool: Bash
    Steps:
      1. pnpm test:all（即 typecheck + lint + unit test + e2e）
    Expected Result: 全绿
    Evidence: .sisyphus/evidence/task-15-all-green.txt
  ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-15-e2e-results.txt`
  - [ ] `.sisyphus/evidence/task-15-artifacts-list.txt`
  - [ ] `.sisyphus/evidence/task-15-video-duration.txt`
  - [ ] `.sisyphus/evidence/task-15-all-green.txt`
  - [ ] `artifacts/m0-demo.webm`（核心交付物，复制一份到 evidence 副本）
  - [ ] `artifacts/m0-*.png`（3 张截图副本）

  **Commit**: YES
  - Message: `test(e2e): add Playwright suite covering all QA scenarios`
  - Files: `playwright.config.ts`, `e2e/perf.spec.ts`, `e2e/deliverable.spec.ts`, `e2e/func.spec.ts`, `e2e/control.spec.ts`, `e2e/fixtures/test-helpers.ts`, `package.json`（更新 scripts + devDep）, `.gitignore`（添加 artifacts/, playwright-report/, test-results/）
  - Pre-commit: `pnpm typecheck && pnpm lint && pnpm test`（不含 e2e，e2e 在 CI 跑）

---

## Final Verification Wave (在 T15 完成后并行运行)

> 4 路评审 agent **并行**运行；ALL APPROVE 后呈现汇总给用户，等待**主创团队 Go/No-Go**评审。
>
> **永远不要在用户 explicit "Go" 之前勾选 F1-F4**。任何拒绝 → 修复 → 重跑 → 再呈现。

- [x] F1. **计划合规审计** — `oracle`
  端到端阅读本计划。对每条 "Must Have"：定位实现（读文件、运行命令、curl 接口）。对每条 "Must NOT Have"：在代码中搜索禁用模式 —— 发现一个就用 `file:line` 拒绝。检查 `.sisyphus/evidence/` 内证据齐全。比对交付物列表与 git diff。
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **代码质量审查** — `unspecified-high`
  运行 `pnpm typecheck` + `pnpm lint` + `pnpm test`。审查所有变更文件：检测 `as any` / `@ts-ignore` / 空 catch / 生产代码 console.log / 注释代码 / 未用 import。检测 AI slop：过度注释、过度抽象、generic 命名（data/result/item/temp）。
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **真实手工 QA 执行** — `unspecified-high` (+ `playwright` skill)
  从干净状态启动。逐个执行**每个 task 的每个 QA scenario** —— 严格按步骤、捕获证据。测试跨任务集成（不是孤立单测，而是组合特性）。测试边缘场景：tab 失焦后回归、resize、快速连点速度按钮。证据保存到 `.sisyphus/evidence/final-qa/`。
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **范围保真度检查** — `deep`
  对每个 task：阅读 "What to do"，阅读实际 git diff/log。验证 1:1 ——规格里的全部建成（无缺失），规格外的一概没建（无创意泛滥）。检查 "Must NOT do" 合规。检测跨任务污染：Task N 触碰 Task M 的文件。Flag 任何"无人认领"的变更。
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

每个 Task 完成后做一次 commit（共 15+ commits，逻辑分组）。Pre-commit 钩子全部跑：`pnpm typecheck && pnpm lint && pnpm test`。

提交规范遵循 Conventional Commits（无 Husky 强制，但工程纪律要求）：

| Task | Commit Message | 主要文件 |
|------|---------------|--------|
| T1 | `chore(scaffold): init Vite + React + TS + lint pipeline` | `package.json`, `vite.config.ts`, `tsconfig.json`, `.eslintrc.cjs`, `.prettierrc` |
| T2 | `feat(shared): add Site / World / Faction Zod schemas and types` | `src/shared/` |
| T3 | `feat(engine/random): add Mulberry32 PRNG with state-on-WorldState` | `src/engine/random/` |
| T4 | `feat(engine/date): add tickToGameDate with BC + Chinese formatting` | `src/engine/date/` |
| T5 | `chore(tools): add one-shot map generator producing m0 sites.json` | `tools/`, `src/content/m0/` |
| T11 | `chore(arch): add ESLint no-restricted-imports + engine purity test` | `.eslintrc.cjs`, `src/engine/__tests__/` |
| T6 | `feat(engine/clock): add advanceClock pure function with phase array` | `src/engine/clock/` |
| T7 | `feat(engine/painting): add red-eats-blue painting step` | `src/engine/systems/painting/` |
| T8 | `feat(engine/world): add WorldState factory loading m0 data with Zod` | `src/engine/world/` |
| T9 | `feat(ui/store): add Zustand store bridging engine to React` | `src/ui/store/` |
| T10 | `feat(rendering): add Canvas polygon renderer with 0.3s color tween` | `src/rendering/map/` |
| T12 | `feat(ui): add top bar showing date + speed + tick count` | `src/ui/components/TopBar/` |
| T13 | `feat(ui): add time control bar with pause + 5 speed buttons` | `src/ui/components/TimeControlBar/` |
| T14 | `feat(app): wire up engine + rendering + ui in main entry` | `src/main.tsx`, `src/App.tsx`, `index.html` |
| T15 | `test(e2e): add Playwright suite covering all QA scenarios` | `e2e/`, `playwright.config.ts` |

---

## Success Criteria

### 验证命令清单

```bash
# 项目初始化与构建
pnpm install                           # 期望：所有依赖安装成功，无 peer warning
pnpm typecheck                         # 期望：tsc --noEmit 零错误
pnpm lint                              # 期望：零警告
pnpm test                              # 期望：所有 Vitest 通过（含 QA-ARCH-* 和 QA-DETERMINISM-* 测试，
                                       #       它们作为普通 vitest 文件存在于 src/__tests__/ 与各模块 __tests__/）
pnpm test:e2e                          # 期望：所有 Playwright 通过
pnpm build                             # 期望：生产构建成功，dist/ 生成
pnpm test:all                          # 期望：typecheck + lint + test + test:e2e 全绿（T15 定义此 alias）

# 开发体验
pnpm dev                               # 浏览器打开 → 看到 5 块色块演变
```

> 注：QA-ARCH-1..5 和 QA-DETERMINISM-1..2 全部以普通 Vitest 测试文件实现（在 T3, T7, T11 中），
> 通过 `pnpm test` 一并跑通。无需独立的 `test:arch` 或 `test:determinism` script。

### Final Checklist
- [x] 所有 "Must Have"（17 项）实现存在、可运行、可验证
- [x] 所有 "Must NOT Have" 不存在（agent 用 grep + AST 扫描确认）
- [x] 所有 18 项 QA-* 验收标准通过
- [x] `artifacts/m0-demo.webm` 存在 + 35s+
- [x] 3 张截图齐全
- [x] 主创团队观看视频后回答："是的，这个手感就是我们要的"
- [x] M0 Go/No-Go 评审通过 → 准备进入 M1 — **YES ✅ 2026-04-29（经 M0.1 + M0.2 地图修订后）**
