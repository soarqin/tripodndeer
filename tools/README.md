# Tools

## generate-m0-map

One-shot script to generate `src/content/m0/sites.json`.

**Usage:**

```bash
pnpm generate:m0-map
```

**Output:** `src/content/m0/sites.json`

This file is committed to git and should NOT be regenerated unless the map layout needs to change. The script uses Plan B (hardcoded irregular polygons) since it's a one-time generation.

### Map Layout

- Canvas: 800×600 pixels
- 5 sites (邑甲–邑戊), each with 8–10 irregular polygon vertices
- Adjacency graph:
  - site_1 ↔ site_2 (top)
  - site_1 ↔ site_3 (left side)
  - site_2 ↔ site_4 (right side)
  - site_3 ↔ site_4 (center)
  - site_3 ↔ site_5 (bottom-left)
  - site_4 ↔ site_5 (bottom)
- site_3 has 3 neighbors (satisfies ≥3 requirement)
- Initial ownership: site_1 = faction_red, site_2–5 = faction_blue

## generate-m1-map

Algorithmic generator for the M1 historical scenario. Produces a 50-site Voronoi
map partitioned across the 8 Warring States realms (秦/楚/齐/燕/韩/赵/魏/周).

**Usage:**

```bash
pnpm generate:m1-map
```

**Output:** `src/content/m1/scenario.json`

### Map Layout

- Canvas: 800×600 pixels
- 50 sites generated via Lloyd-relaxed Voronoi diagram (4 iterations)
- Deterministic PRNG seed: `0xc0ffee` (with auto-retry on rare disconnections)
- Edge `travel_cost = max(1, round(distance / 80))`
- Curve subdivision: 4 segments with 8% perpendicular noise (cubic-bezier shared edges)

### Realms (8)

| ID | 名 | Color | Geographic Region |
|---|---|---|---|
| `realm_qin` | 秦 | `#1A1A1A` | West (`x < 0.35·W`) |
| `realm_chu` | 楚 | `#8B1A1A` | South (`y > 0.65·H`) |
| `realm_qi` | 齐 | `#2E5A6E` | East (`x > 0.65·W`) |
| `realm_yan` | 燕 | `#B0B0B0` | North (`y < 0.25·H`) |
| `realm_han` | 韩 | `#D8741A` | Central (lower-west) |
| `realm_zhao` | 赵 | `#5B3A6F` | Central (north) |
| `realm_wei` | 魏 | `#4A8B5C` | Central (lower-east) |
| `realm_zhou` | 周 | `#C8362F` | Central (1–2 sites near canvas centre) |

### Realm Assignment Algorithm

1. **Geographic partition** — assign each site to the four cardinal realms
   (`秦/楚/燕/齐`) based on centroid quadrant.
2. **Central distribution** — split remaining central sites:
   - 周 receives 1–2 sites closest to canvas centre.
   - 韩/赵/魏 sub-divide the remainder by sub-region (`赵`=north, `韩`=lower-west,
     `魏`=lower-east).
3. **Rebalance pass** — if any major realm has fewer than 5 sites, transfer the
   geographically nearest site from the largest donor realm (周 minimum is 1).

### Initial Armies

Each realm receives 2 `ArmyTemplate` entries (5000 manpower each), one at the
capital and one at the second-owned site (sorted by site id).

### Invariants (enforced by generator + verified by `tools/__tests__/generate-m1-map.test.ts`)

- Exactly 50 sites and 8 realms
- BFS reachability from any site → all 50 sites visited
- Every edge `travel_cost ≥ 1`
- Each major realm has `≥ 5` sites; 周 has `≥ 1`
- Geographic bounds satisfied (秦 west, 齐 east, 燕 north, 楚 south)
- Top-level `initialArmies` and `initialWars` are empty arrays (armies live on
  `realm.initialArmies`)
- Each shared edge referenced by exactly 2 sites with opposite `reverse` flags
- Cubic-bezier edges have `controls.length === anchors.length - 1`

This file is committed to git and should NOT be regenerated unless the map
layout or realm assignment policy needs to change.
