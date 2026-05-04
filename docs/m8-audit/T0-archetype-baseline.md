# M8 Audit: AI Archetype Baseline & Personality Coverage

## 1. Executive Summary (执行摘要)

当前 AI 系统已初步建立基于 8 种人格原型（Archetype）的决策框架，但在实际应用中存在显著的“覆盖度断层”。虽然底层 `PersonalityArchetype` 类型已经定义了丰富的人格维度，但大多数子系统仍处于“人格盲区”或“行为塌缩”状态。

### 核心覆盖度矩阵 (Coverage vs Gaps)

| 维度 | 子系统 | 现状 | 评估 |
|---|---|---|---|
| **军事** | 战术决策 (Tactical) | 已覆盖 (M5_PERSONALITY_WEIGHTS) | **中** (存在行为塌缩) |
| **军事** | 攻城逻辑 (Siege) | 已覆盖 (siege-continue 权重) | **低** (缺乏精细化控制) |
| **内政** | 灾害救济 (Disaster) | 已覆盖 (M42_AI_DISASTER_RELIEF_PROPENSITY) | **高** (逻辑清晰) |
| **内政** | 变法倾向 (Reform) | 已覆盖 (M41_AI_PERSONALITY_REFORM_PROPENSITY) | **低** (6/8 原型权重为 0) |
| **内政** | 经济建设 (Finance) | **未覆盖** | **无** (无 AI 经济 Phase) |
| **内政** | 法令发布 (Edict) | **未覆盖** | **无** (仅用于派系平衡) |
| **外交** | 提议接受度 (Acceptance) | **未覆盖** | **无** (硬编码阈值 0) |
| **外交** | 合纵连横 (Coalition) | **未覆盖** | **无** (纯威胁度驱动) |
| **人才** | 招募偏好 (Recruitment) | **未覆盖** | **无** (随机生成) |
| **谍报** | 行动选择 (Espionage) | 已覆盖 (M7_ESPIONAGE_WEIGHTS) | **高** (独立矩阵) |

### 核心风险点
1. **回退逻辑冲突**: `getPersonality()` 默认回退到 `conqueror`，而谍报系统回退到 `incompetent`。
2. **战术行为塌缩**: `steward`, `learned`, `incompetent`, `benevolent`, `builder` 在多数战术语境下表现完全一致。
3. **剧本多样性缺失**: `scenario.json` 中所有势力初始人格均映射为 `schemer`。

## 2. getPersonality() Callsite Map (调用图谱)

目前代码中共有 4 处核心逻辑依赖人格判定。通过 `grep` 审计，发现其中一处存在严重的绕过行为（Bypass Bug）。

### 调用点详细清单

1. **`src/engine/systems/ai/ai.ts:98`**
   - **函数**: `aiPlanStep`
   - **用途**: 在每旬的 AI 计划阶段，获取人格以决定战术行动（攻击、撤退、攻城、断粮）的权重。
   - **影响**: 直接决定了 AI 在地图上的军事表现。

2. **`src/engine/systems/ai/disaster-decision.ts:26`**
   - **函数**: `selectAIDisasterChoice`
   - **用途**: 当势力遭遇灾害（如旱灾、蝗灾）时，根据人格选择救济、减税、强征或无视。
   - **影响**: 影响势力稳定度、粮食储备及民心（未来维度）。

3. **`src/engine/systems/reform/reform-phase.ts:107`**
   - **函数**: `tryAITrigger`
   - **用途**: 在年度变法检查中，根据 `M41_AI_PERSONALITY_REFORM_PROPENSITY` 判定是否启动变法。
   - **影响**: 决定了势力长期的数值成长曲线。

4. **`src/engine/systems/ai/ai.ts:502` [Bypass Bug]**
   - **函数**: `planEspionageAction`
   - **用途**: 决定谍报行动（侦察、流言、离间、反间）的目标与类型。
   - **现状**: 该处**未调用** `getPersonality()`，而是直接执行 `ruler?.personality ?? 'incompetent'`。
   - **后果**: 绕过了 `utility-scorer.ts` 中定义的 `aggressive_random` 映射逻辑，且回退逻辑与全局不一致。

## 3. Personality-Blind Systems (人格盲区系统)

以下系统在架构上应受人格驱动，但目前实现为“性格中立”，导致 AI 行为高度同质化。

### 3.1 外交接受度 (Diplomacy Acceptance)
- **文件**: `src/engine/systems/diplomacy/lifecycle.ts:39`
- **代码**: `const ACCEPTANCE_THRESHOLD = 0`
- **分析**: `scoreDiplomacyAcceptance` 计算出的分值只要大于 0，任何性格的 AI 都会接受外交提议。
- **缺失**: 霸主（Conqueror）应有更高的接受门槛，而贤主（Benevolent）应更容易接受和平提议。

### 3.2 合纵连横 (Coalition Membership)
- **文件**: `src/engine/systems/diplomacy/coalitions.ts:14-61`
- **分析**: `updateCoalitionMembership` 纯粹基于 `threatPower` 计算。
- **缺失**: 胆小者（Steward/Incompetent）应对威胁更敏感，更早加入合纵；而野心家（Schemer）可能在合纵中反复横跳。

### 3.3 人才招募 (Recruitment Specialty)
- **文件**: `src/engine/systems/recruitment/recruitment.ts:156`
- **分析**: `recruitmentPhase` 仅根据 `M5_SPECIALTY_WEIGHTS_RECRUITMENT` 随机生成人才。
- **缺失**: 霸主应更倾向于招募将领（Commander/Warrior），而建设者（Builder）应更倾向于招募能臣（Administrator/Engineer）。

### 3.4 派系平衡 (Faction Balancing)
- **文件**: `src/engine/systems/ai/faction-balancing.ts:17-64`
- **分析**: `evaluateFactionBalanceAction` 仅在派系影响力失衡超过阈值时发布法令。
- **缺失**: 暴君（Tyrant）可能更倾向于打压强势派系而非平衡，贤主则可能通过减税（Tax Relief）安抚所有派系。

### 3.5 贸易决策 (Trade Decision)
- **文件**: `src/engine/systems/ai/trade-decision.ts` (如果存在)
- **分析**: 贸易系统目前主要基于资源缺口驱动。
- **缺失**: 建设者（Builder）应更倾向于建立长期贸易路线，而霸主（Conqueror）可能更倾向于通过战争掠夺而非贸易。

### 3.6 经济建设 (Economic Development)
- **现状**: 目前 AI 缺乏主动进行经济建设（如升级站点、开垦荒地）的逻辑。
- **缺失**: 这是 M8 计划中的核心维度。不同人格应对“积累”与“消耗”有截然不同的态度。管家（Steward）应优先保证粮食储备，而霸主则会为了维持庞大军队而透支财政。

## 4. Inconsistent Fallback Table (回退逻辑不一致)

当系统无法获取君主（Ruler）数据时（如君主死亡后的权力真空期，或剧本初始化异常），不同子系统表现出截然不同的“默认人格”。

| 维度 | 逻辑路径 | 默认回退 | 预期行为 | 实际偏差 |
|---|---|---|---|---|
| **全局/战术** | `getPersonality()` | `conqueror` | 稳健/平庸 | 极度好战 |
| **谍报** | `planEspionageAction` | `incompetent` | 积极防御 | 完全不作为 |
| **变法** | `tryAITrigger` | `conqueror` (via tool) | 维持现状 | 尝试变法 (0.25) |
| **灾害** | `selectAIDisasterChoice` | `conqueror` (via tool) | 救济/减税 | 强征 (ignore) |

**结论**: 这种不一致性会导致一个处于“无主状态”的势力在军事上疯狂扩张，但在谍报和内政上完全瘫痪，产生极不自然的 AI 表现。

## 5. Cadence Math (决策频率数学分析)

为了评估人格对游戏进程的影响力，我们对 100 Ticks（约 33 个月）内的 AI 决策频率进行数学建模。

### 5.1 战术决策 (Tactical Cadence)
- **判定频率**: 每 3 Ticks 判定一次。
- **执行概率**: 20% (roll < 0.2)。
- **计算**: `(100 / 3) * 0.2 ≈ 6.67` 次有效行动/100 Ticks。
- **人格影响**: 权重矩阵 `M5_PERSONALITY_WEIGHTS` 可将此频率放大或缩小 0.3x - 3.0x。

### 5.2 变法决策 (Reform Cadence)
- **判定频率**: 每年（36 Ticks）判定一次。
- **计算**: `100 / 36 ≈ 2.78` 次判定/100 Ticks。
- **人格影响**: `builder` (0.4) 期望每 2.5 年启动一次变法；而 `steward` 等 6 种人格启动概率为 0。

### 5.3 谍报决策 (Espionage Cadence)
- **判定频率**: 每 3 Ticks 判定一次（前提是无进行中任务）。
- **任务时长**: 6 - 12 Ticks。
- **计算**: 理论最大频率为 `100 / (3 + 6) ≈ 11.1` 次任务/100 Ticks。
- **人格影响**: 权重矩阵 `M7_ESPIONAGE_WEIGHTS` 显著改变任务类型分布。

## 6. Dead Matrix Entries (冗余与缺失矩阵项)

`src/content/m2/balance.ts` 中的 `M5_PERSONALITY_WEIGHTS` 矩阵存在严重的“定义与实现脱节”问题。

### 6.1 冗余列 (Redundant Columns)
以下列在矩阵中定义了数值，但在代码中没有任何调用点（Callsite）：
- **`recruit`**: 权重已设（1.0 - 1.5），但招募系统完全忽略。
- **`diplomacy`**: 权重已设（0.3 - 2.5），但外交系统仅使用硬编码逻辑。
- **`economy`**: 权重已设（0.5 - 3.0），但目前尚无 AI 经济建设 Phase。

### 6.2 缺失行 (Missing Options)
以下 `AIOption.kind` 已在引擎中实现，但未包含在权重矩阵中，导致所有性格默认权重均为 `1.0`：
- **`cut-supply`**: 关键战术，目前所有性格对其偏好一致（错误）。
- **`idle`**: 决定 AI “懒政”或“休养生息”的概率，目前无法通过人格调节。

### 6.3 权重矩阵完整审计 (Full Matrix Audit)

以下是 `M5_PERSONALITY_WEIGHTS` 的当前状态，标注了冗余列与缺失项：

| Archetype | attack | retreat | siege-continue | recruit (Dead) | diplomacy (Dead) | economy (Dead) |
|---|---|---|---|---|---|---|
| `conqueror` | 3.0 | 0.5 | 2.0 | 1.5 | 0.5 | 0.5 |
| `steward` | 0.5 | 1.5 | 0.5 | 1.0 | 1.5 | 3.0 |
| `schemer` | 1.5 | 1.0 | 1.5 | 1.0 | 2.0 | 1.0 |
| `learned` | 0.5 | 1.0 | 0.5 | 1.0 | 2.0 | 2.5 |
| `tyrant` | 2.5 | 0.3 | 2.5 | 1.5 | 0.3 | 0.5 |
| `incompetent` | 1.0 | 1.5 | 0.5 | 0.5 | 1.0 | 1.0 |
| `benevolent` | 0.3 | 2.0 | 0.3 | 1.0 | 2.5 | 2.0 |
| `builder` | 0.5 | 1.0 | 0.5 | 1.5 | 1.5 | 3.0 |

**缺失列**: `cut-supply`, `idle`。由于矩阵中未定义这两列，所有性格在执行这些行动时权重均为默认值 `1.0`。

### 6.4 战术塌缩 (Tactical Collapse)
从上表可见，`builder` 与 `learned` 的战术权重（attack, retreat, siege-continue）完全一致。这意味着在战场上你无法区分一个“建设者”和一个“学者”。

## 7. personality-coverage.test.ts Evaluation (测试评估)

通过对 `src/engine/systems/ai/__tests__/personality-coverage.test.ts` 的审计，发现了“战术塌缩”（Tactical Collapse）现象。

### 7.1 行为重合度分析
在测试定义的 6 种语境（Contexts）下，各原型的表现如下：
- **塌缩组 A**: `learned`, `incompetent`, `benevolent`, `builder`。这四种人格在所有测试语境下的最优选择（Best Action）完全一致。
- **塌缩组 B**: `steward` 与上述组别仅在极个别权重上有微调，实际产出行为高度重合。

### 7.2 静态快照问题
测试目前依赖于 `EXPECTED_BEHAVIOR` 静态映射，这掩盖了权重矩阵微调带来的动态变化。如果两个原型的权重仅差 0.1，在 `pickAction` 的随机采样下，它们的长期行为差异可能微乎其微。

## 8. Test Fixture Coverage Audit (测试桩审计)

审计各单元测试对 8 种人格原型的覆盖情况：

| 测试文件 | 覆盖原型 | 深度 |
|---|---|---|
| `utility-scorer.test.ts` | `conqueror`, `steward`, `schemer`, `builder` | 浅 (仅验证映射) |
| `personality-coverage.test.ts` | **All 8 Archetypes** | 中 (验证静态期望) |
| `ai.test.ts` | `conqueror` | 深 (验证战术流转) |
| `disaster-decision.test.ts` | `benevolent`, `tyrant` | 中 (验证救济逻辑) |
| `m7-plan-espionage.test.ts` | `schemer` | 中 (验证谍报权重) |

**缺失**: 缺乏对 `incompetent`（平庸之辈）和 `learned`（名士）在复杂战争环境下的生存能力测试。

## 9. scenario.json Current State (剧本现状)

当前 `src/content/m1/scenario.json` 的数据配置是导致 AI 多样性失效的“元凶”。

### 9.1 映射陷阱
- 剧本中所有 8 个主要势力（秦、楚、齐、燕、韩、赵、魏、周）的 `aiPersonality` 字段均被硬编码为 `"aggressive_random"`。
- 根据 `utility-scorer.ts:23`：`if (configured === 'aggressive_random') return 'schemer'`。
- **结果**: 游戏开始时，战国七雄加上周王室，全部都是“阴谋家”（Schemer）。

### 9.2 历史不一致性
- **秦**: 历史上应为 `conqueror`（霸主）。
- **魏**: 早期应为 `steward`（守成）或 `builder`（建设）。
- **周**: 此时期应为 `incompetent`（平庸）或 `learned`（名士）。
- **现状**: 这种“全员阴谋家”的配置使得 M5 引入的 8 种人格在初始剧本中毫无用武之地。

---

## M8 v1 Implementation Recommendations

基于以上审计结果，建议在 M8 v1 阶段执行以下改进：

1. **统一回退逻辑**: 
   - 修改 `getPersonality`，将最终 fallback 从 `conqueror` 改为 `incompetent`。
   - 修改 `planEspionageAction` (ai.ts:502)，调用 `getPersonality()` 而非手动 fallback。

2. **激活招募偏好**:
   - 在 `recruitmentPhase` 中引入人格影响，使不同性格的君主产出不同 Specialty 的人才概率产生偏差。

3. **修复战术矩阵**:
   - 在 `M5_PERSONALITY_WEIGHTS` 中增加 `cut-supply` 和 `idle` 列。
   - 差异化 `builder` 与 `learned` 的权重，避免战术塌缩。

4. **剧本数据重构**:
   - 为 `scenario.json` 中的各势力分配符合历史特征的初始人格，彻底告别“全员 aggressive_random”。

5. **外交人格化**:
   - 将 `ACCEPTANCE_THRESHOLD` 从硬编码常量改为基于人格的动态计算值。

(End of Audit Report)
