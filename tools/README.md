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
