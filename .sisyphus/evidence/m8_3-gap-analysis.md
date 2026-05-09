# M8.3 §7.2 Gap Analysis

> 本文档记录 M8.3 实测胜率分布（100 局基线）与 docs/design/07-ai.md §7.2 设计目标之间的差距，
> 供 M12 平衡调优阶段参考。

## Status

Baseline measurement: PENDING（运行 `pnpm test:baseline --limit=100` 以生成 `m8_3-baseline.json`）。

基线产出后，本文件将更新实际差距表。

## §7.2 Expected Rates

| Realm | Expected | Tolerance |
| --- | --- | --- |
| `realm_qin` | 40% | ±5pp |
| `realm_chu` | 18% | ±5pp |
| `realm_qi` | 15% | ±5pp |
| `realm_zhao` | 10% | ±5pp |
| `realm_wei` | 8% | ±5pp |
| `realm_han` | 4% | ±5pp |
| `realm_yan` | 3% | ±5pp |
| `realm_zhou` | 2% | ±5pp |

## Gap Table（基线产出后填写）

| Realm | Expected | Actual | Δ | Within Tolerance |
| --- | --- | --- | --- | --- |
| `realm_qin` | 0.40 | TBD | TBD | TBD |
| `realm_chu` | 0.18 | TBD | TBD | TBD |
| `realm_qi` | 0.15 | TBD | TBD | TBD |
| `realm_zhao` | 0.10 | TBD | TBD | TBD |
| `realm_wei` | 0.08 | TBD | TBD | TBD |
| `realm_han` | 0.04 | TBD | TBD | TBD |
| `realm_yan` | 0.03 | TBD | TBD | TBD |
| `realm_zhou` | 0.02 | TBD | TBD | TBD |

## M12 Tuning Guidance

启用 `distribution-baseline.test.ts` 中的 `§7.2 enforcement` 测试时：

1. 将 `it.skip` 改为 `it.fails`（先确认当前 RED 状态符合预期）
2. 运行 `pnpm test:baseline` 重新生成基线数据
3. 通过调整以下参数缩小差距：
   - 各势力起始位置与初始资源（`src/content/m9/scenario.json`）
   - AI 性格权重（`src/content/m2/balance.ts` M8 常量）
   - 地形修正与战斗系数（`src/content/m2/balance.ts`）
4. 不要修改 `docs/design/07-ai.md §7.2` 的期望胜率——此为设计目标，不可漂移
5. 当所有 8 个势力的实际胜率均落入 ±5pp 容差区间时，将 `it.fails` 改为 `it`，测试转为常驻守护

## References

- `docs/design/07-ai.md §7.2`：胜率分布设计目标
- `src/engine/automation/__tests__/distribution-baseline.test.ts`：守护测试
- `.sisyphus/plans/m8-3.md`：M8.3 任务规划
