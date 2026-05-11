import { M5_PERSONALITY_DIMS_BASELINE } from '~/content/m2/balance'
import type { SaveDTOAnyVersion } from '~/shared/types/save-dto'

export function migrateSaveV2ToV3(v2: SaveDTOAnyVersion): SaveDTOAnyVersion {
  return {
    ...v2,
    schemaVersion: 3,
    world: {
      ...v2.world,
      difficulty: v2.world.difficulty ?? 'hero',
      diplomaticMemory: v2.world.diplomaticMemory ?? [],
      rulers: v2.world.rulers.map(([realmId, ruler]) => [
        realmId,
        {
          ...ruler,
          personalityDims:
            ruler.personalityDims ??
            { ...M5_PERSONALITY_DIMS_BASELINE[ruler.personality ?? 'incompetent'] },
        },
      ]),
    },
  }
}
