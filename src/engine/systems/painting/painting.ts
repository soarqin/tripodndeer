import { enableMapSet, produce } from 'immer'

import { pickRandom } from '@/engine/random/helpers'
import { PAINT_INTERVAL_TICKS } from '@/shared/constants'
import type { GameEvent, TickPhase } from '@/shared/types'

enableMapSet()

/**
 * paintingStep: 红吞蓝 Tick phase。
 * 每 PAINT_INTERVAL_TICKS tick 执行一次：
 * 找出所有“红邻蓝”配对，随机选一对，将蓝邑变红。
 */
export const paintingStep: TickPhase = (world, rng) => {
  if (world.tick % PAINT_INTERVAL_TICKS !== 0) {
    return { world, nextRng: rng, events: [] }
  }

  const pairs: Array<{ redId: string; blueId: string }> = []
  for (const [siteId, site] of world.sites) {
    if (site.ownerId !== 'faction_red') continue

    for (const neighborId of site.adjacency) {
      const neighbor = world.sites.get(neighborId)
      if (neighbor?.ownerId === 'faction_blue') {
        pairs.push({ redId: siteId, blueId: neighborId })
      }
    }
  }

  if (pairs.length === 0) {
    return { world, nextRng: rng, events: [] }
  }

  const { value: picked, nextState: nextRng } = pickRandom(rng, pairs)
  if (!picked) {
    return { world, nextRng: rng, events: [] }
  }

  const nextWorld = produce(world, draft => {
    const site = draft.sites.get(picked.blueId)
    if (site) {
      site.ownerId = 'faction_red'
    }
  })

  const events: GameEvent[] = [
    {
      type: 'painting:siteFlipped',
      payload: {
        siteId: picked.blueId,
        fromFaction: 'faction_blue',
        toFaction: 'faction_red',
      },
    },
  ]

  return { world: nextWorld, nextRng, events }
}
