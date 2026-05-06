# 鼎鹿 · Tripod and Deer

战国策略游戏引擎原型 (Warring States strategy game engine prototype).

「问鼎中原，逐鹿天下」—— 这是一个以中国战国时代为背景的大战略游戏引擎原型。本项目采用现代 Web 技术栈，旨在构建一个高性能、可扩展且具有深厚历史底蕴的策略游戏框架。

## 项目现状 (Current Status)

目前项目已完成 **M0 至 M9** 所有里程碑的交付，并顺利完成了 **Wave 9: Refactor & Cleanup** 大规模重构工作。

- **M0-M1**: 核心循环与地图基础
- **M2**: 军事系统 (Combat v2, 攻城, 关隘)
- **M3**: 外交系统 (合纵连横, 提案生命周期)
- **M4/M4.1/M4.2**: 内政、经济、变法、灾害、贸易、派系
- **M5**: 人物与人才系统 (君主、将领、继承)
- **M6**: 文化与意识形态 (学宫、百家争鸣)
- **M7**: 谍报系统 (情报覆盖、间者行动)
- **M8**: AI 决策模型 (8 种性格原型, 三层决策架构)
- **M9**: 完整剧本支持 (250 站点, 历史人物名册, i18n 核心)
- **Refactor-Cleanup**: 架构纯化、代码瘦身、模块化重组完成

## 技术栈 (Tech Stack)

- **框架**: [Vite](https://vitejs.dev/) + [React](https://reactjs.org/)
- **语言**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **数据校验**: [Zod](https://zod.dev/)
- **测试**: [Vitest](https://vitest.dev/) (Unit/Integration), [agent-browser](https://github.com/vercel-labs/agent-browser) (Agent-driven E2E 验证)
- **渲染**: HTML5 Canvas (高性能地图渲染)

## 架构概览 (Architecture Overview)

项目遵循严格的分层架构，确保逻辑与表现分离：

1.  **src/engine/**: 纯函数游戏引擎。处理所有游戏逻辑、状态转换和 AI 决策。**绝对禁止**依赖 React 或 UI 层。
2.  **src/ui/**: 基于 React 的用户界面。负责呈现引擎输出的状态，并向引擎发送指令。
3.  **src/rendering/**: 基于 Canvas 的地图渲染层。只读访问世界状态，负责高性能视觉呈现。
4.  **src/shared/**: 共享类型定义 (`types/`) 与 Zod Schema (`schemas/`)。作为项目的单一真相源。
5.  **src/content/**: 静态游戏数据。包含 JSON 剧本、平衡性常量 (`balance/`) 和历史文本。

## 剧本支持 (Scenarios)

- **M1 Scenario**: 春秋战国前传。包含 50 个核心站点，适合快速对局与功能验证。
- **M9 Scenario**: 战国 v1。包含 250 个站点，覆盖战国全境，拥有完整的历史人物名册和复杂的势力分布。

## 开发指南 (Development)

### 常用命令 (Build Commands)

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm typecheck    # 执行 TypeScript 类型检查
pnpm lint         # 执行 ESLint 检查
pnpm test         # 运行所有单元测试 (Vitest)
pnpm test:behavior # 运行行为驱动测试
pnpm test:perf    # 运行性能预算测试 (100 tick 压力测试)
pnpm test:all     # 一键执行所有检查与测试 (typecheck + lint + test)
```

### 核心规范

- **不可变性**: 引擎状态更新必须返回新的对象/Map，禁止原地修改。
- **确定性**: 所有随机行为必须通过 `World.rngState` 进行，确保同种子下的对局可复现。
- **性能**: 核心 Phase 逻辑需通过性能预算测试，确保在 250+ 站点下依然流畅。

## 详细文档 (Documentation)

更多设计细节请参阅 `docs/design/` 目录：

- [00-愿景与支柱](./docs/design/00-vision.md)
- [01-世界模型](./docs/design/01-world-model.md)
- [02-引擎循环](./docs/design/02-engine-loop.md)
- [04-军事系统](./docs/design/04-systems-military.md)
- [07-AI 设计](./docs/design/07-ai.md)
- [11-里程碑路线图](./docs/design/11-roadmap.md)

---

鼎鹿 · Tripod and Deer - 战国策略游戏引擎原型。
本项目致力于还原中国古代战争与外交的博弈艺术。
