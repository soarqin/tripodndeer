# 10 · 技术架构

> 这是设计意图与代码现实之间的桥梁。本文给出**推荐的技术选型**与**架构分层**，确保设计目标在实现层可达。

> 本文为**建议性**架构，最终选型由实现团队拍板。但**分层与原则**应保持。

---

## 1. 技术选型推荐

### 1.1 总览

| 维度 | 选型 | 理由 |
|------|------|------|
| **语言** | TypeScript | 强类型，配合大状态游戏的复杂数据 |
| **构建** | Vite | 快、零配置、HMR 流畅 |
| **UI 框架** | React 18+ | 生态成熟、组件化、配合状态机良好 |
| **地图渲染** | Canvas 2D（首选）/ SVG（备选） | 大量邑级单元，Canvas 性能更好；SVG 利于交互定位 |
| **状态管理** | Zustand + Immer | 轻量、TypeScript 友好；Immer 处理大状态不可变更新 |
| **存档存储** | IndexedDB（dexie.js 封装）| 浏览器原生大容量存储，存档可达数十 MB |
| **数据格式** | YAML (剧本) + JSON (运行时) | 人写 YAML 友好，运行时 JSON 加载快 |
| **数据校验** | Zod | TypeScript 原生 schema 校验 |
| **测试** | Vitest + Testing Library | Vite 原生 |
| **代码风格** | ESLint + Prettier + TypeScript strict | 工程纪律 |
| **包管理** | pnpm | 速度、磁盘节省 |
| **CI** | GitHub Actions（如选 GH） | 标准 |
| **部署** | 静态托管（Vercel / Cloudflare Pages / 自建 nginx） | 纯前端无后端 |

### 1.2 关键不选的（与理由）

| 不选 | 理由 |
|------|------|
| **Phaser / PixiJS** | 它们偏向 2D 动作游戏。本作偏 UI 重，React + Canvas 组合更自然 |
| **WebGL** | 邑级别量级（~600）不需 GPU；CPU Canvas 足够，调试更易 |
| **Vue / Svelte** | 没有强反对，但 React 生态最丰富，团队招聘最容易 |
| **Redux** | 模板代码过多，对于游戏大状态来说 Zustand 更合适 |
| **后端服务** | 单机游戏 v1 不需要任何服务器 |

### 1.3 兜底说明

> 如果团队偏好 Vue / Svelte，整体架构原则不变，只换 UI 层。
> 如果团队偏好 PixiJS 做地图，可作为渲染层独立模块替换。

---

## 2. 架构分层（Layered Architecture）

```
┌──────────────────────────────────────────────────────┐
│                      Content                        │
│   剧本（YAML）、地图、势力、人物、事件、本地化文本    │
└──────────────────────────────────────────────────────┘
                          ▼ 加载
┌──────────────────────────────────────────────────────┐
│                       Engine                         │
│   核心模拟（无 UI 依赖）                              │
│   · 世界状态（World State）                           │
│   · 时钟与 Tick 推进（Clock）                          │
│   · 子系统（军事、外交、内政、经济、文化、谍报）       │
│   · 事件系统（Event Engine）                          │
│   · AI                                               │
│   · 规则与公式（Rule Tables）                         │
└──────────────────────────────────────────────────────┘
                          ▼ 提供状态、订阅
┌──────────────────────────────────────────────────────┐
│                    Presentation                      │
│   UI 层（React） + 渲染层（Canvas）                   │
│   · 地图渲染                                         │
│   · 各功能面板                                       │
│   · 通知系统                                         │
│   · 输入处理（鼠标、键盘）                            │
└──────────────────────────────────────────────────────┘
                          ▼ 持久化
┌──────────────────────────────────────────────────────┐
│                    Persistence                       │
│   存档系统（IndexedDB）                               │
│   · 序列化 / 反序列化                                  │
│   · 版本兼容                                         │
│   · 自动存档调度                                      │
└──────────────────────────────────────────────────────┘
```

### 2.1 关键原则

- **Engine 不依赖 UI**：可在 Node.js 跑（用于测试、AI vs AI 自动对战）
- **Presentation 通过订阅获取状态**：状态变更 → 自动触发 UI 更新
- **Content 作为只读数据**：可热替换（开发时），用户永不修改
- **Persistence 仅与 Engine 交互**：UI 层不直接访问存档

---

## 3. 模拟引擎（Simulation Engine）

### 3.1 时钟（Clock）

```typescript
class GameClock {
  // 当前游戏时间
  current: GameDate                  // { year, month, tenDay }

  // 时间速度档位（pause | x1 | x2 | x3 | x4 | x5）
  speed: TimeSpeed

  // 真实时间累积
  private realTimeAccum: number

  // 推进：每个真实帧调用
  advance(deltaMs: number) {
    if (this.speed === 'pause') return
    this.realTimeAccum += deltaMs
    const tickInterval = TICK_INTERVAL_MS[this.speed]
    while (this.realTimeAccum >= tickInterval) {
      this.realTimeAccum -= tickInterval
      this.executeTick()
    }
  }

  // 执行一旬的模拟
  private executeTick() {
    World.runTickPhases() // 见 §3.2
    this.current = nextTenDay(this.current)
    EventEngine.checkTriggers()
  }
}
```

### 3.2 Tick 阶段（Tick Phases）

每个 Tick 内按顺序执行：

```
Phase 1: 资源结算（Income & Upkeep）
Phase 2: 行军推进（March Resolution）
Phase 3: 战斗结算（Battle Resolution）
Phase 4: 内政进度（Edicts & Reforms Progress）
Phase 5: 外交效果（Diplomatic Effects）
Phase 6: 谍报推进（Intelligence Tick）
Phase 7: 人物老化（Character Aging）
Phase 8: AI 战术决策（AI Tactical）
Phase 9: 事件触发检查（Event Triggers）
Phase 10: 数据快照（State Snapshot for UI）
```

每月、每季、每年还有附加结算（如月度税收、年度人口）。

### 3.3 状态结构（World State）

```typescript
interface WorldState {
  date: GameDate
  scenarioId: string

  // 实体（按 ID 索引）
  realms: Map<RealmId, Realm>
  sites: Map<SiteId, Site>
  provinces: Map<ProvinceId, Province>
  characters: Map<CharacterId, Character>
  armies: Map<ArmyId, Army>
  passes: Map<PassId, Pass>

  // 关系网（双向哈希）
  relations: RelationGraph

  // 进行中事件链
  ongoingEventChains: EventChain[]

  // 事件日志（编年体）
  chronicle: ChronicleEntry[]

  // 玩家
  playerRealmId: RealmId

  // RNG 种子（保证存档可复现）
  rngSeed: number
  rngState: RNGState
}
```

> **不可变更新**：所有状态修改通过 Immer 产生新引用，让 UI 易于做 diff 检测。

### 3.4 RNG 与确定性

- 全游戏使用**单一 PRNG**（如 Mulberry32）
- RNG 种子保存在存档中，存档加载后行为完全可复现
- 调试与回放时极有价值

---

## 4. 渲染层（Rendering）

### 4.1 渲染分层

```
┌──────────────────────────────┐
│ Layer 4: UI 浮层（React DOM） │
│ Layer 3: 单位/军团（Canvas）  │
│ Layer 2: 涂色（Canvas）       │
│ Layer 1: 地形（Canvas，预渲染）│
│ Layer 0: 底图（Canvas，预渲染）│
└──────────────────────────────┘
```

- **Layer 0–1**（地形）一次渲染，缩放/平移用 Canvas transform，不重画
- **Layer 2**（涂色）只在邑归属或控制度变化时局部 redraw
- **Layer 3**（单位）每个 Tick 增量 redraw 移动单位
- **Layer 4**（UI）由 React 管理，覆盖在 Canvas 上

### 4.2 性能预算

| 帧率目标 | 60 FPS（Canvas + UI） |
|---------|--------------------|
| 单帧时间预算 | 16ms |
| 模拟时间预算 | 异步，不应卡 UI 帧 |
| 5x 速度时单 Tick 预算 | ≤200ms（含 AI） |

### 4.3 大量邑的高效渲染

- 离屏 Canvas 预渲染**多边形掩膜**
- 涂色变更：用 `globalCompositeOperation` 局部叠加
- 缩放级别 < 阈值时合并显示（远观时不渲染单个邑细节）

---

## 5. 数据驱动（Data-Driven）

### 5.1 剧本加载流程

```
1. 用户选择剧本 → 读取 meta.yaml
2. 校验 schema（Zod）
3. 加载所有引用文件（map, realms, characters, events, ...）
4. 构建初始 WorldState
5. 触发剧本启动事件（如有）
6. 进入主循环
```

### 5.2 Schema 校验

所有数据文件**强制 schema 校验**：
- 加载阶段失败：明确报错"X.yaml 第 Y 行：势力 Z 引用了不存在的邑 W"
- 不允许"宽容加载"——错误必须暴露

> 这样**模组作者**能立刻知道错在哪。

### 5.3 内容资源管理

- 大型纹理图（地形）按区块加载
- 字体子集化（仅打包用到的汉字）
- 本地化文本按当前语言加载

---

## 6. 存档系统（Save System）

### 6.1 存档格式

```typescript
interface SaveFile {
  version: string                  // 存档版本号
  scenarioId: string
  scenarioVersion: string
  worldState: WorldState           // 完整序列化
  metadata: {
    saveTime: number
    gameTime: GameDate
    realmName: string
    rulerName: string
    summary: string                // "秦昭襄王三年，东征魏河西"
    thumbnail: string              // 缩略地图（base64 PNG）
  }
}
```

### 6.2 存档存储

- IndexedDB 每个存档单独 record
- 每个剧本最多保留 100 个存档（手动 + 自动）
- 自动存档采用环形覆盖（最近 10 个）
- 玩家可命名、删除、导出（下载为 JSON）

### 6.3 版本兼容

- 主版本 mismatch → 拒绝加载，提示玩家
- 次版本 mismatch → 尝试 migrate（保留最近 3 个旧版本的 migrator）
- 修订号 mismatch → 直接加载（应只是数据微调）

### 6.4 存档大小

预估：完整对局存档 1–10 MB（取决于历史长度与事件密度）。
压缩：使用 LZ-string 或 pako；可减小到 200KB–2MB。

---

## 7. AI 性能（AI Performance）

### 7.1 AI 决策的时间分配

- **战略层 AI**（每年）：异步执行，可消耗 1–2 秒（玩家不感知）
- **战役层 AI**（每月）：在 Tick 间隙执行，每势力 ≤50ms
- **战术层 AI**（每旬）：必须在 Tick 内完成，每势力 ≤10ms

### 7.2 AI 多势力的时间片

```
Tick N  : Realm A 战术 + Realm B 战术 + ...
异步队列: Realm A 战略评估（在 Tick N 至 N+10 间完成）
```

### 7.3 必要时使用 Web Worker

- 战略 AI 与历史回放、AI vs AI 自动对战可放入 Worker
- 主线程仅处理交互、渲染、Tick 推进

---

## 8. 项目结构（Project Structure 草案）

```
tripodndeer/
├── docs/
│   ├── design/              # 本目录所在
│   ├── architecture/        # 实现细节文档（待建）
│   └── api/                 # 内部 API 文档（待建）
├── src/
│   ├── engine/              # 模拟引擎（无 UI 依赖）
│   │   ├── clock/
│   │   ├── world/
│   │   ├── systems/
│   │   │   ├── military/
│   │   │   ├── diplomacy/
│   │   │   ├── economy/
│   │   │   ├── culture/
│   │   │   └── intelligence/
│   │   ├── events/
│   │   └── ai/
│   ├── rendering/           # 地图渲染层
│   │   ├── map/
│   │   ├── overlay/
│   │   └── animation/
│   ├── ui/                  # React UI
│   │   ├── components/      # 可复用组件
│   │   ├── panels/          # 各功能面板
│   │   └── screens/         # 整页（菜单、剧本选择...）
│   ├── content/             # 剧本数据
│   │   └── scenarios/
│   │       └── warring_states/
│   ├── persistence/         # 存档
│   ├── localization/        # i18n
│   ├── shared/              # 跨层共用类型与常量
│   └── main.tsx             # 入口
├── public/                  # 静态资源
├── tests/                   # 测试
├── tools/                   # 内容编辑、AI 测试等开发工具
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 9. 兼容性与目标平台

### 9.1 浏览器目标

- Chrome / Edge / Firefox / Safari 最新两个大版本
- 不支持 IE（早已停止维护）
- 移动端浏览器**可加载**但不主动适配（v1）

### 9.2 设备目标

- 主要目标：桌面浏览器（≥1280×720 分辨率）
- 兼容目标：≥1024×768
- 不支持目标：手机、平板（v1）

### 9.3 网络

- 首次加载需下载剧本资产（~10 MB 含字体）
- 加载后**完全离线**可玩
- 可选：PWA / Service Worker 实现离线缓存

---

## 10. 测试策略

### 10.1 测试层级

| 层级 | 内容 | 工具 |
|------|------|------|
| **单元测试** | 子系统纯函数（伤害公式、外交关系计算） | Vitest |
| **集成测试** | 多系统联动（一场战争从宣战到议和） | Vitest |
| **AI 自动对战** | 多势力 AI 跑完整剧本 | 自定义脚本 |
| **快照回归** | 给定输入与种子，输出应一致 | Vitest snapshot |
| **UI 测试** | 关键面板交互 | Testing Library |
| **手工测试** | 完整玩法体验 | 设计师 / 内测 |

### 10.2 关键不变量（Invariants）

引擎应在每个 Tick 后自检：
- 所有邑都有 owner（或 null，但不能是不存在的 ID）
- 所有军团都在合法位置（某个邑或行军中）
- 资源不为负
- 事件链状态合法

发现不变量违反 → 抛错 + 自动存档 + 报错给玩家（开发模式）。

---

## 11. 工程纪律（Engineering Discipline）

### 11.1 命名

- TypeScript 标识符：英文，camelCase / PascalCase
- 文件名：kebab-case
- Git 分支：feature/xxx、bugfix/xxx
- 用户可见文本：放在 i18n 文件，绝不硬编码

### 11.2 代码风格

- 严禁 `any`、`@ts-ignore`、`@ts-expect-error`
- 函数体 ≤50 行（特殊业务可破例但需注释）
- 一个文件一个职责

### 11.3 性能优化纪律

- 不做"猜想型优化"
- 优化前先 Profile
- 性能问题应有可复现的 benchmark

---

## 12. 待确认问题（Open Questions）

| # | 问题 | 备选 |
|---|------|------|
| OQ-1 | 是否使用 React Server Components？ | 推荐：不使用。纯客户端应用，RSC 无优势 |
| OQ-2 | 是否引入状态机库（XState）？ | 推荐：暂不。事件链可用纯 TS 实现，需要时再上 |
| OQ-3 | 是否使用 Web Worker？ | 推荐：第二里程碑后再考虑（性能瓶颈出现时） |
| OQ-4 | 字体子集化策略？ | 推荐：编译期扫描所有 YAML/TSX 中的汉字，仅打包用到的 |
| OQ-5 | 是否做 PWA？ | 推荐：是。让玩家可离线游玩，体验接近原生 |
| OQ-6 | 自动化部署目标？ | 推荐：Cloudflare Pages（免费 + 全球 CDN） |
| OQ-7 | 是否引入 Tauri 打包桌面版？ | 推荐：v2 之后的可选项 |

---

## 13. 与其他文档的接口

| 本文定义 | 在哪些文档展开 |
|---------|--------------|
| 剧本 schema | [`06-scenarios.md`](./06-scenarios.md) |
| 渲染层级 | [`02-map.md`](./02-map.md) §7、[`09-ux-ui.md`](./09-ux-ui.md) §5 |
| AI 性能预算 | [`07-ai.md`](./07-ai.md) §6 |
| 存档触发时机 | [`01-core-loop.md`](./01-core-loop.md) §3.4 |
| MVP 技术里程碑 | [`11-roadmap.md`](./11-roadmap.md) |

---

## Changelog

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-04-29 | 初版创建 | Sisyphus |
