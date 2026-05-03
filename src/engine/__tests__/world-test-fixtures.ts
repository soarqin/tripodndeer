import type { World } from '~/shared/types'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'

export const TEST_WORLD_DATE = {
  yearBC: 260,
  season: 'spring',
  month: 1,
  xun: 'shang',
} as const

export function makeTestWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld(overrides)
}
