# M9 Audit: T0 Scope Contract & Baseline

## 1. Executive Summary

M9 v1 (Warring States Content Expansion) is a **Standard Tier** milestone (estimated 6-8 weeks) designed to transition the "Tripod and Deer" engine from a system-ready state to a content-complete MVP. The primary goal is to deliver a fully playable Warring States scenario starting from **-453 BC** (the Partition of Jin) through **-221 BC** (the Unification by Qin).

Key metrics for this expansion include:
- **Map Scale**: 50 sites → 250 sites.
- **Character Depth**: 41 fixed generals → 90 character templates with dynamic spawning.
- **Historical Events**: 10 existing chains → 35+ total event chains (including 13 core §5.3 events).
- **Technical Upgrade**: Schema v7 → v8 migration to support provinces, regions, and localization.
- **Fidelity**: Tier 1 strict adherence to historical facts for major entities and events.

---

## 2. Verified Codebase Facts

As of the start of M9, the following facts have been verified in the current repository:

| Feature | Current State (M8) | Source/Verification |
|---------|-------------------|---------------------|
| **Schema Version** | 5 | `src/content/m1/scenario.json` |
| **Generals Count** | 41 | `grep -c "id\": \"gen_"` |
| **Event Chains** | 10 | M5 (3), M6 (3), M7 (4) |
| **Name Pool** | 60 | `src/content/m5/name-pool.json` |
| **Passes** | 5 | `id: pass_hangu, pass_wu, pass_shang, pass_hangu_east, pass_jiameng` |
| **i18n Infra** | None | No `src/shared/localization/` directory |
| **Generals Era** | -260 BC | All 41 generals are clustered around the Changping era |

---

## 3. In-Scope Deliverables

The M9 milestone will deliver the following components across engine and content layers:

### 3.1 Engine Layer
- **Schema v7→v8 Migration**: Support for new data structures.
- **New World Fields**: `provinces`, `regions`, `characterTemplates`, `localization`.
- **Realm Deactivation**: Explicit `realm.deactivate` effect and phase to handle historical falls.
- **Character Spawning**: `characterSpawnPhase` to instantiate generals from templates based on birth years.
- **i18n Infrastructure**: Lightweight localization system with type-safe keys.
- **Year-Gate Retrofit**: Adding temporal constraints to existing M6/M7 event chains.

### 3.2 Content Layer
- **Master Scenario**: `src/content/m9/scenario-453bc.json` (-453 BC start).
- **Expanded Map**: 250 sites, 30-40 provinces (郡), 9 regions (州).
- **Passes**: 18-20 strategic passes.
- **Character Templates**: 90 historical figures with birth/death windows.
- **Name Pool**: 400 entries categorized by realm/culture.
- **Event Chains**: 26 new chains (13 core, 1 coalition, 12 atmosphere).
- **Localization**: `zh-CN.json` containing all player-facing strings.

### 3.3 Balance & Verification
- **M9_ Constants**: Centralized balance parameters in `src/content/m2/balance.ts`.
- **Fidelity Lint**: Automated tests to prevent anachronisms (e.g., "Emperor" before -221).
- **Simulation Tests**: AI-only runs to verify historical "gravity" and event triggers.

---

## 4. Out-of-Scope Explicit List (Deferred to M9.x/M10)

To prevent scope creep, the following items are explicitly **OUT OF SCOPE** for M9 v1:

- **Military**: New unit types (beyond the current 4), military merit systems (军功爵) [Deferred to M9.x].
- **Statecraft**: Edict expansion (beyond current 2), complex alliance/marriage/hostage systems [Deferred to M9.x].
- **Systems**: Tribal pressure systems (义渠/林胡 as active mechanics), sandbox mode [Deferred to M9.x].
- **UI/UX**: New UI panels for province/region browsing, scenario picker UI [Deferred to M9.x].
- **Content**: Spring and Autumn scenario (-770 BC), multi-language support (English/Trad-CN) [Deferred to M9.x].
- **Playability**: Minor states (Yue, Song, Lu, Zhongshan) remain AI-only [Deferred to M9.x].
- **Mechanics**: Covenant/Meeting (会盟) system, reform window restrictions [Deferred to M9.x].

---

## 5. Schema v7→v8 Changes Summary

The transition to v8 introduces the following structural changes to the `World` state:

### 5.1 New World Fields
- `provinces: ReadonlyMap<ProvinceId, Province>`: Logical grouping of sites.
- `regions: ReadonlyMap<RegionId, Region>`: Large geographical areas (The Nine Provinces).
- `characterTemplates: ReadonlyMap<CharId, CharacterTemplate>`: Database for dynamic spawning.
- `localization: ReadonlyMap<string, string>`: Runtime cache for localized strings.

### 5.2 New Effect Types
- `realm.deactivate`: 
  ```typescript
  {
    type: 'realm.deactivate',
    realmId: RealmId,
    reason: 'conquered' | 'extinguished' | 'merged',
    absorbingRealmId?: RealmId
  }
  ```

### 5.3 Realm Extensions
- `status: 'active' | 'deactivated'`: Tracks if a realm still exists in the simulation.
- `rulingHouse?: string`: Supports transitions like the Tian-Qi usurpation.

---

## 6. Tier 1 Historical Fact List (12 Realms)

The following 12 realms are the core entities of the M9 scenario.

| Realm ID | Name | Capital | Territory | Playable |
|----------|------|---------|-----------|----------|
| `realm_qin` | 秦 | 雍 / 咸阳 | 关中、陇西 | Yes |
| `realm_chu` | 楚 | 郢 / 陈 | 江汉、淮南 | Yes |
| `realm_qi` | 齐 | 临淄 | 山东半岛 | Yes |
| `realm_yan` | 燕 | 蓟 | 河北北部、辽西 | Yes |
| `realm_han` | 韩 | 阳翟 / 新郑 | 中原南部 | Yes |
| `realm_zhao` | 赵 | 晋阳 / 邯郸 | 山西、河北中部 | Yes |
| `realm_wei` | 魏 | 安邑 / 大梁 | 河东、河南 | Yes |
| `realm_zhou` | 周 | 洛邑 | 京畿地区 | Yes |
| `realm_yue` | 越 | 会稽 | 江浙地区 | No (AI) |
| `realm_song` | 宋 | 商丘 | 豫东、鲁南 | No (AI) |
| `realm_lu` | 鲁 | 曲阜 | 山东泰山周边 | No (AI) |
| `realm_zhongshan` | 中山 | 灵寿 | 冀中 (赵燕之间) | No (AI) |

---

## 7. §5.3 13 Core Events with Trigger Windows

These events form the historical backbone of the scenario.

| Year (BC) | Event Name | Trigger Condition | Impact |
|-----------|------------|-------------------|--------|
| -403 | 周命三晋 | Start of scenario | Legitimacy shift for Han/Zhao/Wei |
| -386 | 田氏代齐 | Year >= -386 | Qi ruling house change (Jiang -> Tian) |
| -361 | 秦孝公求贤 | Year >= -361 | Enables Shang Yang event chain |
| -356 | 商鞅变法 | Shang Yang hired | Qin internal reform (M4.1) |
| -341 | 马陵之战 | Wei vs Qi | Wei hegemony collapse |
| -334 | 徐州相王 | Year >= -334 | Realms claim King title |
| -310 | 张仪连横 | Year >= -310 | Coalition dissolution logic |
| -307 | 胡服骑射 | Zhao realm active | Zhao military buff |
| -284 | 五国伐齐 | Qi threat high | Qi near-extinction event |
| -260 | 长平之战 | Qin vs Zhao | Massive manpower loss |
| -256 | 秦灭东周 | Qin near Luoyi | Zhou realm deactivation |
| -230 | 秦灭韩 | Qin power high | Han realm deactivation |
| -221 | 秦灭齐 | Qin power high | Scenario end / Unification |

---

## 8. 90 Character Candidates (Templates)

Characters will spawn dynamically based on their birth years.

### 8.1 Qin (15)
- 秦孝公 (-381 to -338, Ruler)
- 商鞅 (-390 to -338, Reformer)
- 秦惠文王 (-356 to -311, Ruler)
- 张仪 (-373 to -310, Diplomat)
- 樗里疾 (d. -300, Strategist)
- 司马错 (fl. -316, Commander)
- 秦昭襄王 (-325 to -251, Ruler)
- 魏冉 (d. -264, Administrator)
- 范雎 (d. -255, Diplomat)
- 白起 (d. -257, Warrior)
- 王龁 (d. -244, Commander)
- 王翦 (fl. -236, Commander)
- 吕不韦 (-292 to -235, Administrator)
- 李斯 (-284 to -208, Administrator)
- 蒙恬 (d. -210, Commander)

### 8.2 Chu (10)
- 楚悼王 (d. -381, Ruler)
- 吴起 (-440 to -381, Reformer/Commander)
- 楚威王 (d. -329, Ruler)
- 楚怀王 (-355 to -296, Ruler)
- 屈原 (-340 to -278, Administrator)
- 昭阳 (fl. -323, Commander)
- 景翠 (fl. -312, Commander)
- 楚顷襄王 (d. -263, Ruler)
- 黄歇 (-314 to -238, Administrator)
- 项燕 (d. -223, Commander)

### 8.3 Qi (10)
- 齐威王 (-378 to -320, Ruler)
- 邹忌 (fl. -350, Administrator)
- 田忌 (fl. -340, Commander)
- 孙膑 (d. -316, Strategist)
- 齐宣王 (d. -301, Ruler)
- 匡章 (fl. -314, Commander)
- 齐湣王 (d. -284, Ruler)
- 田文 (d. -279, Administrator)
- 田单 (fl. -284, Commander)
- 后胜 (fl. -221, Administrator)

### 8.4 Zhao (12)
- 赵武灵王 (-340 to -295, Ruler)
- 肥义 (d. -295, Administrator)
- 赵惠文王 (-310 to -266, Ruler)
- 廉颇 (-327 to -243, Warrior)
- 蔺相如 (fl. -283, Diplomat)
- 赵奢 (fl. -270, Commander)
- 赵孝成王 (d. -245, Ruler)
- 赵括 (d. -260, Commander)
- 李牧 (d. -229, Warrior)
- 庞暖 (fl. -242, Strategist)
- 郭开 (fl. -229, Administrator)
- 赵幽缪王 (d. -228, Ruler)

### 8.5 Wei (10)
- 魏文侯 (d. -396, Ruler)
- 李悝 (-455 to -395, Reformer)
- 西门豹 (fl. -400, Administrator)
- 魏武侯 (d. -370, Ruler)
- 魏惠王 (-400 to -319, Ruler)
- 庞涓 (d. -341, Commander)
- 魏安釐王 (d. -243, Ruler)
- 魏无忌 (d. -243, Administrator/Commander)
- 段干木 (fl. -400, Scholar)
- 乐羊 (fl. -400, Commander)

### 8.6 Han (7)
- 韩昭侯 (d. -333, Ruler)
- 申不害 (-385 to -337, Reformer)
- 韩桓惠王 (d. -239, Ruler)
- 冯亭 (d. -260, Administrator)
- 韩非 (-280 to -233, Scholar)
- 张平 (d. -250, Administrator)
- 张良 (-250 to -186, Strategist)

### 8.7 Yan (5)
- 燕昭王 (d. -279, Ruler)
- 乐毅 (fl. -284, Commander)
- 剧辛 (d. -242, Commander)
- 燕王喜 (fl. -222, Ruler)
- 太子丹 (d. -226, Administrator)

### 8.8 Others (Zhou, Yue, Song, Lu, Zhongshan, Guests) (21)
- 周威烈王 (d. -402, Zhou)
- 周赧王 (d. -256, Zhou)
- 越王无彊 (d. -334, Yue)
- 宋康王 (d. -286, Song)
- 鲁穆公 (d. -377, Lu)
- 中山王𰯼 (fl. -310, Zhongshan)
- 淳于髡 (fl. -350, Guest)
- 鲁仲连 (fl. -260, Guest)
- 尸佼 (fl. -350, Guest)
- (Additional 12 minor figures to reach 90)

---

## 9. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Performance** | High | 250 sites may slow down the tick. Wave 3 includes a perf checkpoint. |
| **Character Timing** | Medium | Complex birth/death logic. Use `characterSpawnPhase` with year-gates. |
| **Historical Divergence** | Medium | Players may prevent unification. Scenario supports "alternate history". |
| **Schema Complexity** | Low | v7→v8 migration is structural. Byte-equal tests ensure no regression. |
| **Content Volume** | High | 250 sites and 90 characters is a lot of data. Use directory-based organization. |

---

## 10. Author/Reviewer Attribution Policy

To ensure the quality and historical accuracy of the content, all event chain JSON files in M9 must include the following metadata:

```json
{
  "id": "event_chain_id",
  "metadata": {
    "author": "Sisyphus-Junior",
    "reviewedBy": "Metis-Oracle",
    "fidelityTier": 1,
    "source": "Shiji Vol. 5"
  },
  ...
}
```

This policy applies to all 26 new event chains and the 10 retrofitted chains.

---

## 11. Verification Evidence (QA)

The following commands will be used to verify the completeness of the M9 Audit:

```bash
# Line count check
wc -l docs/m9-audit/T0-scope-contract.md

# Section count check
grep -c "^## " docs/m9-audit/T0-scope-contract.md

# Out-of-scope check
grep "OUT OF SCOPE\|deferred\|M9.x" docs/m9-audit/T0-scope-contract.md | wc -l

# Realm coverage check
grep -E "(秦|楚|齐|燕|韩|赵|魏|周|越|宋|鲁|中山)" docs/m9-audit/T0-scope-contract.md | wc -l

# Event year coverage check
grep -oE "(\-453|\-403|\-386|\-361|\-356|\-341|\-334|\-310|\-307|\-284|\-260|\-256|\-230|\-221)" docs/m9-audit/T0-scope-contract.md | sort -u | wc -l
```

(End of Audit Report)
