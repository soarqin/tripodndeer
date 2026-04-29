import m0Data from '@/content/m0/sites.json'
import { INITIAL_DATE } from '@/shared/constants'
import { M0DataSchema } from '@/shared/schemas'
import { paintingStep } from '@/engine/systems/painting'
import type { Faction, FactionId, M0Data, Site, SiteId, World } from '@/shared/types'

/** 加载并验证 M0 地图数据（静态 import + Zod 校验） */
export function loadM0Data(): M0Data {
  return M0DataSchema.parse(m0Data)
}

/** 构造初始 World（含 Zod 校验 + ownership 引用完整性检查） */
export function createInitialWorld(data: M0Data, seed: number): World {
  M0DataSchema.parse(data)

  const factions = new Map<FactionId, Faction>()
  for (const faction of data.factions) {
    factions.set(faction.id, faction)
  }

  const sites = new Map<SiteId, Site>()
  for (const rawSite of data.sites) {
    const ownerId = data.initialOwnership[rawSite.id] ?? null
    if (ownerId !== null && !factions.has(ownerId)) {
      throw new Error(`${rawSite.id} references unknown faction ${ownerId}`)
    }

    sites.set(rawSite.id, {
      ...rawSite,
      ownerId,
      polygon: [],
      adjacency: [],
    })
  }

  return {
    date: { ...INITIAL_DATE },
    tick: 0,
    sites,
    factions,
    rngState: { seed, counter: 0 },
    phases: [paintingStep],
  }
}
