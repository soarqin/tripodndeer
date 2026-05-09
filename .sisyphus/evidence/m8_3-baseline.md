# M8.3 AI Win Rate Distribution Baseline

## Meta

| Field | Value |
|---|---|
| Scenario | m9 |
| Difficulty | hero |
| Samples | 2 |
| Seed Range | 1–2 |
| Max Ticks | 200 |
| Stop Condition | unification |

## Outcomes

- Unification Rate: 0.0%
- Null Winner Count: 0
- Max Ticks Hit: 2
- Unattributed Actions: 138

## Distribution

| Realm | Wins | Win Rate | Expected | In Tolerance | Active |
|---|---|---|---|---|---|
| realm_qin | 2 | 100.0% | 40% | ✗ | yes |
| realm_chu | 0 | 0.0% | 18% | ✗ | yes |
| realm_qi | 0 | 0.0% | 15% | ✗ | yes |
| realm_yan | 0 | 0.0% | 3% | ✓ | yes |
| realm_han | 0 | 0.0% | 4% | ✓ | yes |
| realm_zhao | 0 | 0.0% | 10% | ✗ | yes |
| realm_wei | 0 | 0.0% | 8% | ✗ | yes |
| realm_zhou | 0 | 0.0% | 2% | ✓ | yes |
| realm_yue | 0 | 0.0% | — | ✓ | yes |
| realm_song | 0 | 0.0% | — | ✓ | yes |
| realm_lu | 0 | 0.0% | — | ✓ | yes |
| realm_zhongshan | 0 | 0.0% | — | ✓ | yes |

## §7.3 Behavior Metrics

| Archetype | Metric | Value | Sample Size |
|---|---|---|---|
| Conqueror | Avg Wars Declared / Game | 0.00 | 0 |
| Steward | Avg War Years / Game | 0.00 | 0 |
| Schemer | Avg Alliances / Game | 0.00 | 0 |

## Runtime

- Total: 0.9 min
- Per Game Mean: 26270 ms
- Per Game P95: 26587 ms

## Discrepancy Summary

Realms outside §7.2 expected ±5pp tolerance:

- **realm_qin**: actual 100.0% vs expected 40% (diff: 60.0pp)
- **realm_chu**: actual 0.0% vs expected 18% (diff: -18.0pp)
- **realm_qi**: actual 0.0% vs expected 15% (diff: -15.0pp)
- **realm_zhao**: actual 0.0% vs expected 10% (diff: -10.0pp)
- **realm_wei**: actual 0.0% vs expected 8% (diff: -8.0pp)
