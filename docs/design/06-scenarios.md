# 06 · 剧本系统 · 多时代架构 · 首发剧本

> 本作的核心扩展性来自剧本系统：同一引擎可承载完全不同的历史时代。

---

## 1. 设计目标

| 目标 | 含义 |
|------|------|
| **数据驱动** | 一切剧本内容都是数据文件，不写死在代码里 |
| **引擎中立** | 引擎不应假设"七国"或"三国"；它处理的是"势力 N 个、邑 M 个" |
| **时代差异化** | 不同剧本应给玩家**完全不同**的体验，而不是换皮 |
| **修订友好** | 历史考据更新、玩家反馈数值，应通过改数据文件即可，无需改代码 |

---

## 2. 剧本架构（Scenario Architecture）

### 2.1 一个剧本（Scenario）包含什么

```
scenario_warring_states/
├── meta.yaml                  # 剧本元信息
├── map/
│   ├── sites.yaml             # 所有邑
│   ├── provinces.yaml         # 郡
│   ├── regions.yaml           # 州
│   ├── adjacency.yaml         # 邻接图
│   ├── passes.yaml            # 关隘
│   └── terrain.png            # 地形底图
├── realms/
│   ├── qin.yaml               # 秦
│   ├── chu.yaml               # 楚
│   ├── ...
│   └── tribal_xirong.yaml     # 西戎部族
├── characters/
│   ├── historical.yaml        # 历史人物（含出生窗口）
│   └── name_pools.yaml        # 野生人才命名池
├── tech_tree/
│   └── era_tech.yaml          # 该时代的兵种、政令、变法
├── events/
│   ├── historical_events.yaml # 历史事件链
│   ├── crisis_events.yaml     # 危机事件
│   └── flavor_events.yaml     # 氛围事件
├── ideologies.yaml            # 意识形态（百家诸学）
├── victory_conditions.yaml    # 胜利条件配置
├── starting_state.yaml        # 起始日期、势力关系、初始事件
└── localization/
    └── zh-CN.yaml             # 文本本地化
```

### 2.2 元信息（meta.yaml）

```yaml
id: warring_states
name: 战国七雄
sub_title: 三家分晋至秦灭六国
start_year: -453               # 起始年份（公元前 453 年）
end_year: -221                 # 历史结束（可超过）
playable_realms: [zhou, qin, chu, qi, jin, han, zhao, wei, yan, song, lu, ...]
recommended_realms: [qin, chu, qi, zhao, wei]   # UI 推荐的入门势力
difficulty_per_realm:
  qin: medium
  chu: easy
  zhao: hard
  zhou: very_hard
estimated_session: 3-5h
authors: [...]
historical_notes: |
  本剧本以三家分晋（前 453）作为正式起点……
```

### 2.3 起始状态（starting_state.yaml）

定义剧本启动时**世界的快照**：

```yaml
date: { year: -453, month: 1, ten_day: 1 }
zhou_legitimacy: 25     # 周天子合法性
realms_active: [zhou, qin, chu, qi, jin_han_branch, jin_zhao_branch, jin_wei_branch, ...]
relations:
  - { a: zhao, b: han, attitude: +30, type: post_partition_alliance }
  - { a: qin, b: jin_split, attitude: -10 }
  - ...
events_active:
  - id: aftermath_of_jin_partition
    auto_trigger_on_start: true
ongoing_situations:
  - { type: tribal_threat, near: jin_zhao_branch, strength: medium }
```

---

## 3. 多时代支持架构

### 3.1 哪些是「时代变量」（按剧本）？

- 地图（每个时代地理边界、城邑、关隘不同）
- 势力（春秋战国 vs 三国 vs 五代十国）
- 兵种（车兵在战国还重要，三国基本消失）
- 政体形态（春秋封建 vs 战国变法 vs 秦后郡县）
- 意识形态（百家争鸣 vs 独尊儒术）
- 历史事件库
- 人物（按真实历史出场）
- 时代特殊系统（如周天子册封、汉末黄巾起义）

### 3.2 哪些是「引擎常量」（跨剧本）？

- 时间制（旬-月-季-年）
- 空间结构（邑-郡-州层级）
- 邻接图机制
- 涂色与控制度
- 军团系统、行军、补给
- 外交、内政、经济、文化、谍报系统的**机制**
- AI 框架
- UI 框架
- 存档系统

### 3.3 时代特殊系统（Era-Specific Systems）

某些机制只适用于特定时代。引擎需支持**机制开关**：

| 机制 | 适用时代 |
|------|---------|
| **周王册封 / 礼乐** | 春秋为主，战国渐弱 |
| **会盟** | 春秋（齐桓晋文式霸业） |
| **军功爵制度** | 战国（秦） |
| **黄巾式宗教起义** | 三国 |
| **门阀士族** | 魏晋南北朝 |
| **科举** | 隋唐及以后 |
| **节度使 / 藩镇** | 唐末五代 |
| **行省制度** | 元 |

> 引擎通过 feature flag 决定哪些子系统在当前剧本启用。

---

## 4. 剧本扩展路线（首发与未来）

### 4.1 首发剧本（v1.0）

| # | 剧本 | 起止年 | 势力数 | 优先级 |
|---|------|--------|--------|--------|
| 1 | **战国七雄**（首发主推） | -453 ~ -221 | 7 主 + 数小 | ⭐⭐⭐ 核心 |

### 4.2 后续可扩展（按受欢迎程度）

| # | 剧本 | 起止年 | 备注 |
|---|------|--------|------|
| 2 | **春秋争霸** | -770 ~ -453 | 更早的春秋时期，齐桓晋文，作为前传 |
| 3 | **秦末楚汉** | -209 ~ -202 | 短而剧情强，需重设势力机制 |
| 4 | **三国** | 184 ~ 280 | 玩家认知度最高的时代 |
| 5 | **五代十国** | 907 ~ 979 | 节度使系统挑战 |
| 6 | **元末群雄** | 1351 ~ 1368 | 含异族征服元素 |
| 7 | **明末** | 1620 ~ 1644 | 需考虑火器系统 |

> 每个剧本都是独立资产包，引擎不变。

---

## 5. 首发剧本：**战国七雄**

> ✅ 已确认作为首发剧本，详细设计见下。

### 5.1 时间线设定

- **起始**：公元前 453 年（韩、赵、魏三家正式分晋后两年，周王尚未册封——剧本首事件就是"三家请封"）
- **历史结束**：公元前 221 年秦灭齐
- **游戏可继续**：历史结束后游戏不强制终止；玩家可自创历史

### 5.2 起始势力概览

| 势力 | 都城 | 起始疆域 | 上手难度 | 历史亮点 |
|------|------|---------|---------|---------|
| **周** | 洛邑 | 京畿一隅 | ⭐⭐⭐⭐⭐ 极难 | 名义共主，但实力最弱 |
| **秦** | 雍 → 咸阳 | 关中、陇西 | ⭐⭐ 易 | 商鞅变法、远交近攻 |
| **楚** | 郢 | 江汉、淮南 | ⭐⭐ 易 | 地大物博，但行动迟缓 |
| **齐** | 临淄 | 山东半岛 | ⭐⭐⭐ 中 | 鱼盐之利、田氏代齐 |
| **韩** | 阳翟 → 新郑 | 中原南部 | ⭐⭐⭐⭐ 难 | 四战之地、强弩 |
| **赵** | 晋阳 → 邯郸 | 山西河北 | ⭐⭐⭐ 中 | 胡服骑射改革空间 |
| **魏** | 安邑 → 大梁 | 河东河南 | ⭐⭐⭐ 中 | 早期最强、文侯遗风 |
| **燕** | 蓟 | 河北北 | ⭐⭐⭐⭐ 难 | 偏远但安全 |
| **越** (起始仍存在) | 会稽 | 江浙 | ⭐⭐⭐⭐ 难 | 楚之南，被楚吞并的命运压力 |
| **宋** | 商丘 | 中原小国 | ⭐⭐⭐⭐⭐ 极难 | 殷商遗民、地理被诸强包围 |
| **鲁** | 曲阜 | 山东泰山周 | ⭐⭐⭐⭐ 难 | 儒家发源地，可走文化胜利 |
| **中山** | 灵寿 | 河北中部 | ⭐⭐⭐⭐⭐ 极难 | 白狄分支，处赵燕之间 |

> 不一定全部首发可玩——MVP 可只允许**七雄+周**为可玩势力，其余作为 AI。

### 5.3 关键历史事件链（建议实现 ≥10 个）

| 年份 | 事件 | 玩法影响 |
|------|------|---------|
| -453 | 三家分晋（已发生） | 起始状态 |
| -403 | 周威烈王正式承认韩赵魏为侯 | 合法性巨变 |
| -386 | 田氏代齐 | 齐国势力洗牌 |
| -361 | 秦孝公求贤 | 商鞅事件链触发 |
| -356 | 商鞅第一次变法 | 秦体制大改 |
| -341 | 马陵之战 | 魏霸权陨落 |
| -334 | 苏秦合纵成功 | 多势力盟约 |
| -310 | 张仪连横 | 合纵联盟瓦解 |
| -307 | 赵武灵王胡服骑射 | 赵骑兵革命 |
| -284 | 乐毅伐齐 | 齐几被灭，仅余即墨、莒 |
| -260 | 长平之战 | 标志性大决战 |
| -256 | 秦灭东周 | 名义共主消亡 |
| -230~-221 | 秦灭六国 | 标志性结尾 |

> 每个事件都有：触发条件、玩家选项、连锁后果。事件可被玩家行为**前置或推迟**乃至**完全改写**。

### 5.4 时代特殊机制

| 机制 | 描述 |
|------|------|
| **周王册封** | 各国可向周王求册封爵位（侯→公→王），花费威望和岁贡，换合法性 |
| **僭号称王** | 战国时期诸侯纷纷称王（始于魏惠王），不需周王同意，但威望惩罚和外交动荡 |
| **百家争鸣** | 学宫（稷下、西河等）系统活跃，意识形态选择丰富 |
| **客卿制度** | 跨国人才流动空前，敌国人才可来投 |
| **变法窗口** | 战国百年内，每势力有有限的变法窗口期；过期则错失 |
| **合纵连横** | 苏秦张仪式的多国动员事件链 |
| **义渠 / 中山等异族** | 边疆势力，作为剧情压力源 |

### 5.5 美术风格指南（首发）

- **底图**：黄河、长江为视觉核心；中原地区开发度最高（密集邑），南方湿地稀疏，西北高原荒凉
- **地名书法**：城邑名用篆书或带有古风的字体
- **色彩**：参照五行五色（金白、木青、水黑、火赤、土黄）作为势力主色系参考
- **建筑符号**：高台、城墙、宫阙、青铜鼎，避免出现汉以后的塔楼、马凯

详见 [`12-historical-fidelity.md`](./12-historical-fidelity.md)。

### 5.6 首发胜利条件预设

详见 [`08-victory.md`](./08-victory.md)。简言之，玩家可通过：
1. **军事一统**：吞并所有势力
2. **称霸天下**：胁迫足够多势力臣服 + 取得周王册封
3. **取代天命**：搜集九鼎 + 合法性达标 → 取代周王
4. **文化教化**：使天下半数以上邑认同你的文化（鲁国/儒家路线）
5. **割据百年**：守住核心区到剧本结束（爆冷胜利路径）

---

## 6. 数据 Schema 草案

> 实现层细节，非设计层细节，可移至 `docs/architecture/`。这里仅给出关键 schema 草案以确认设计意图可表达。

### 6.1 Site

```yaml
- id: site_xianyang
  name: 咸阳
  type: capital_city
  region_id: region_guanzhong
  province_id: province_neishi
  position: { x: 412, y: 308 }
  terrain: plains
  defense_value: 70
  population_base: 100000
  economy: { agri: 5, craft: 4, trade: 3 }
  buildings: [palace, market, military_camp]
  cultural: chinese_qin
  historical_owner: qin
```

### 6.2 Realm

```yaml
- id: realm_qin
  name: 秦
  full_title: 秦国
  ruling_house: 嬴
  state_form: kingdom
  capital: site_xianyang
  cultural: chinese_qin
  ideology_lean: { legalism: 60, militarism: 80, ritualism: 20 }
  starting_treasury: 8000
  starting_manpower: 50000
  realm_traits: [shang_yang_reform_pending, frontier_warrior, hangu_pass_advantage]
  initial_provinces: [province_neishi, province_longxi, ...]
  initial_relations:
    realm_wei: -10
    realm_zhou: +5
  initial_ruler: char_qin_xian_gong
  ruler_succession_law: agnatic_primogeniture
  ai_personality: ambitious_conqueror
```

### 6.3 Event

```yaml
- id: event_shang_yang_arrival
  trigger:
    requires:
      - { type: ruler_attribute, char: ruler_of(realm_qin), attr: charisma, gte: 12 }
      - { type: realm_state, realm: realm_qin, requires_trait: seek_reformer }
    timing:
      between_years: [-365, -358]
  one_shot: true
  actor_realm: realm_qin
  text:
    title: "卫国客士求见"
    body: |
      卫国公孙鞅，因魏文侯之孙不能用，西来求见。
      其言：「治世不一道，便国不法古。」
      陛下何以处之？
  options:
    - id: appoint
      label: "拜为左庶长，许变法"
      effects:
        - hire_character: char_shang_yang
        - start_event_chain: shang_yang_reform_chain
    - id: query
      label: "暂留宫中，详问其策"
      effects:
        - delay_event: { event: this, by_years: 1 }
    - id: refuse
      label: "婉拒之"
      effects:
        - prevent_event_chain: shang_yang_reform_chain
        - if_realm_active: realm_wei
        - if_realm_active_else: { send_to: random_other_realm }
```

### 6.4 Adjacency

```yaml
- from: site_xianyang
  to: site_wuzhi
  type: open
  travel_cost: 1.0
- from: site_xianyang
  to: site_luoyang
  type: pass
  travel_cost: 1.5
  pass_id: pass_hangu
```

### 6.5 Pass

```yaml
- id: pass_hangu
  name: 函谷关
  controls_edges:
    - { a: site_xianyang, b: site_luoyang }
    - { a: site_xianyang, b: site_yiyang }
  default_owner: realm_qin
  fortification_base: 90
  terrain_bonus: 60
  flank_difficulty: very_hard
  historical_significance: critical
```

---

## 7. 模组化（Modding-Friendly Design）

虽然 v1.0 不开放正式模组系统，但**架构必须为之准备**：

- 所有数据文件用纯文本（YAML / JSON）
- 文件路径与命名约定清晰
- 引擎读取时严格 schema 校验，给出友好错误提示
- 长期目标：玩家可只改一个 YAML 就生成新势力 / 新事件

---

## 8. 内容工作量估算（首发）

| 内容 | 数量级 | 备注 |
|------|--------|------|
| 邑（site） | 400–600 | 战国时期合理粒度 |
| 郡（province） | 80–120 | |
| 州（region） | 9–12 | 九州+边疆 |
| 关隘 | 15–25 | 选战略最重要的 |
| 主要历史人物 | 60–100 | 春秋末到秦统一的关键人物 |
| 野生人才命名池 | 数百 | 时代风格命名规则 |
| 历史事件链 | 30–50 | 含 §5.3 列出的核心事件 |
| 危机/氛围事件 | 100–200 | 让世界活起来 |
| 兵种 | 6–9 | §`04-systems-military.md` |
| 政令 | 20–40 | |
| 变法 | 5–8 | 商鞅、吴起、胡服骑射等 |

> 工作量大但**完全数据驱动**，可分模块逐步填充，不阻塞引擎开发。

---

## 9. 待确认问题（Open Questions）

| # | 问题 | 备选 |
|---|------|------|
| OQ-1 | 首发可玩势力数量？ | 推荐：MVP 限定为**七雄+周**，其余 AI 控制 |
| OQ-2 | 历史事件触发是否严格按年份？ | 推荐：年份是窗口（如"-365 至 -358 之间"），允许玩家行为推迟 |
| OQ-3 | 是否在剧本中标注"历史走向参考"？ | 推荐：在事件文本中加"史实曰"注解，不影响游戏，仅作彩蛋 |
| OQ-4 | 多剧本时 UI 选择界面如何呈现？ | 推荐：剧本卡片+缩略地图+难度标签 |
| OQ-5 | 是否允许玩家自定义起始日期（沙盒）？ | 推荐：v2 后开放；首发只有官方剧本 |

---

## 10. 与其他文档的接口

| 本文定义 | 在哪些文档展开 |
|---------|--------------|
| 数据驱动架构 | [`10-tech.md`](./10-tech.md) |
| 事件系统 | [`05-systems-statecraft.md`](./05-systems-statecraft.md) |
| 历史人物 | [`03-factions.md`](./03-factions.md) |
| 史实贴合 | [`12-historical-fidelity.md`](./12-historical-fidelity.md) |
| 首发胜利配置 | [`08-victory.md`](./08-victory.md) |
| MVP 内容范围 | [`11-roadmap.md`](./11-roadmap.md) |

---

## Changelog

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-04-29 | 初版创建 | Sisyphus |
