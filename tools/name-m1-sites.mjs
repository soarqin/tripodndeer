// Helper script for T1.6: assigns historical Chinese names to M1 scenario sites
// and ensures each realm's capital field points to the named capital site.
//
// Usage: node tools/name-m1-sites.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const scenarioPath = resolve(__dirname, '..', 'src', 'content', 'm1', 'scenario.json')

const raw = readFileSync(scenarioPath, 'utf-8')
const scenario = JSON.parse(raw)

// ---------------------------------------------------------------------------
// 1. Site name assignments per realm
//    These are committed historical-fidelity assignments based on:
//    - The site's position on the 800x600 canvas
//    - The realm's geographic constraint (W/E/N/S/Center)
//    - The historic relative location of the named city within its realm
// ---------------------------------------------------------------------------

const SITE_NAMES = {
  // ===== 秦国 (West) – 12 sites =====
  // Capital: 咸阳 (Xianyang)
  site_001: '咸阳', // [37.2, 358.5]   capital
  site_003: '雍', // [113, 308]        early capital, mid-west
  site_004: '栎阳', // [159, 247]      eastern Qin
  site_008: '上洛', // [221, 197]      eastern frontier
  site_016: '戎陵', // [100, 158]      western frontier
  site_029: '汧渭', // [59, 241]       far west, by Wei river
  site_030: '武功', // [114, 393]      south of Wei valley
  site_033: '频阳', // [206, 110]      northern Qin
  site_044: '商於', // [223, 549]      far south
  site_047: '犬丘', // [64, 511]       southwest, ancient seat
  site_048: '华山', // [98, 51]        northern peak
  site_050: '蓝田', // [160, 467]      south of capital

  // ===== 楚国 (South) – 9 sites =====
  // Capital: 郢 (Ying, near modern Jingzhou)
  site_002: '郢', // [555, 405]        capital
  site_009: '邓', // [389, 412]        west of Ying
  site_011: '鄢', // [466, 454]        south of Ying
  site_024: '彭城', // [747, 410]      far east
  site_025: '寿春', // [647, 449]      eastern Chu
  site_035: '黔中', // [717, 540]      southeastern frontier
  site_040: '巫', // [384, 536]        far south west
  site_042: '陈', // [553, 531]        south of capital
  site_049: '随', // [308, 461]        far western Chu

  // ===== 齐国 (East) – 6 sites =====
  // Capital: 临淄 (Linzi)
  site_005: '临淄', // [570, 218]      capital
  site_007: '莒', // [656, 347]        south of capital
  site_027: '即墨', // [641, 262]      east of capital
  site_041: '博', // [558, 313]        central Qi
  site_043: '高唐', // [665, 172]      northern Qi
  site_045: '薛', // [746, 258]        far east

  // ===== 燕国 (North) – 5 sites =====
  // Capital: 蓟 (Ji, modern Beijing)
  site_006: '蓟', // [375, 63]         capital
  site_013: '辽阳', // [735, 87]       far east frontier (Liaodong)
  site_019: '易', // [473, 86]         south of capital
  site_036: '武阳', // [591, 88]       east of capital
  site_038: '上谷', // [256, 45]       northwestern frontier

  // ===== 韩国 (Central) – 5 sites =====
  // Capital: 新郑 (Xinzheng)
  site_015: '新郑', // [201, 384]      capital
  site_031: '阳翟', // [326, 365]      east of capital
  site_034: '阳城', // [328, 298]      north of capital
  site_039: '汝南', // [237, 456]      south
  site_046: '宜阳', // [185, 322]      west

  // ===== 赵国 (Central-North) – 7 sites =====
  // Capital: 邯郸 (Handan)
  site_014: '邯郸', // [517, 178]      capital
  site_021: '晋阳', // [291, 245]      western Zhao (near modern Taiyuan)
  site_022: '中牟', // [452, 191]      central
  site_023: '武安', // [357, 241]      central-south
  site_026: '上党', // [391, 164]      central-north
  site_028: '代', // [310, 153]        far north
  site_037: '漳水', // [412, 247]      central, by Zhang river

  // ===== 魏国 (Central) – 5 sites =====
  // Capital: 大梁 (Daliang) — historically east of Anyi.
  // The east-most Wei site (site_018) is renamed to 大梁 and becomes the capital.
  site_010: '安邑', // [231, 269]      former capital, west
  site_017: '汾阴', // [264, 389]      south, by Fen river
  site_018: '大梁', // [481, 270]      capital, east
  site_020: '中山', // [469, 359]      east-south
  site_032: '河西', // [263, 321]      central, west of Yellow river

  // ===== 周王室 (Center) – 1 site =====
  // Capital: 洛邑 (Luoyi, modern Luoyang)
  site_012: '洛邑', // [395, 318]      capital
}

// ---------------------------------------------------------------------------
// 2. Sanity-check: every site_001..site_050 has a name
// ---------------------------------------------------------------------------

const expectedSiteIds = new Set(scenario.sites.map((s) => s.id))
const namedSiteIds = new Set(Object.keys(SITE_NAMES))
const missing = [...expectedSiteIds].filter((id) => !namedSiteIds.has(id))
const extra = [...namedSiteIds].filter((id) => !expectedSiteIds.has(id))
if (missing.length > 0) {
  throw new Error(`Missing names for sites: ${missing.join(', ')}`)
}
if (extra.length > 0) {
  throw new Error(`Names for non-existent sites: ${extra.join(', ')}`)
}
const uniqueNames = new Set(Object.values(SITE_NAMES))
if (uniqueNames.size !== Object.keys(SITE_NAMES).length) {
  throw new Error('Duplicate site names detected')
}

// ---------------------------------------------------------------------------
// 3. Apply names to sites
// ---------------------------------------------------------------------------

for (const site of scenario.sites) {
  site.name = SITE_NAMES[site.id]
}

// ---------------------------------------------------------------------------
// 4. Wei capital relocation – set capital to site_018 (大梁) for historical fit
// ---------------------------------------------------------------------------

const REALM_CAPITAL_OVERRIDES = {
  realm_wei: 'site_018', // 大梁
}

for (const realm of scenario.realms) {
  const newCapital = REALM_CAPITAL_OVERRIDES[realm.id]
  if (!newCapital) continue
  if (!realm.initialSites.includes(newCapital)) {
    throw new Error(`${realm.id}: new capital ${newCapital} not in initialSites`)
  }
  realm.capital = newCapital
  // Reorder initialSites so the capital is first (matches other realms convention)
  realm.initialSites = [
    newCapital,
    ...realm.initialSites.filter((id) => id !== newCapital),
  ]
  // Reposition the two starting armies: army_1 at capital, army_2 at second site
  const secondSite = realm.initialSites[1]
  if (realm.initialArmies.length >= 1) realm.initialArmies[0].location = newCapital
  if (realm.initialArmies.length >= 2) realm.initialArmies[1].location = secondSite
}

// ---------------------------------------------------------------------------
// 5. Verify all realms still have correct displayName / fullTitle / color
//    (these are the source-of-truth values from the M1 plan)
// ---------------------------------------------------------------------------

const REALM_META = {
  realm_qin: { displayName: '秦', fullTitle: '秦国', color: '#1A1A1A' },
  realm_chu: { displayName: '楚', fullTitle: '楚国', color: '#8B1A1A' },
  realm_qi: { displayName: '齐', fullTitle: '齐国', color: '#2E5A6E' },
  realm_yan: { displayName: '燕', fullTitle: '燕国', color: '#B0B0B0' },
  realm_han: { displayName: '韩', fullTitle: '韩国', color: '#D8741A' },
  realm_zhao: { displayName: '赵', fullTitle: '赵国', color: '#5B3A6F' },
  realm_wei: { displayName: '魏', fullTitle: '魏国', color: '#4A8B5C' },
  realm_zhou: { displayName: '周', fullTitle: '周王室', color: '#C8362F' },
}

for (const realm of scenario.realms) {
  const meta = REALM_META[realm.id]
  if (!meta) throw new Error(`Unknown realm id: ${realm.id}`)
  realm.displayName = meta.displayName
  realm.fullTitle = meta.fullTitle
  realm.color = meta.color
}

// ---------------------------------------------------------------------------
// 6. Write back JSON (preserve 2-space indent matching the existing file)
// ---------------------------------------------------------------------------

writeFileSync(scenarioPath, JSON.stringify(scenario, null, 2) + '\n', 'utf-8')

// ---------------------------------------------------------------------------
// 7. Print quick summary
// ---------------------------------------------------------------------------

console.log('Updated scenario.json:')
for (const realm of scenario.realms) {
  const cap = scenario.sites.find((s) => s.id === realm.capital)
  console.log(
    `  ${realm.displayName} (${realm.id}) – capital: ${cap?.name} (${realm.capital}) – ${realm.initialSites.length} sites`,
  )
}
