import type { World } from '~/shared/types'

export function isYearStart(world: World): boolean {
  return world.date.season === 'spring' && world.date.month === 1 && world.date.xun === 'shang'
}
