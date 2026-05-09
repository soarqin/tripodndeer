import { M5_PERSONALITY_DIMS_BASELINE } from '~/content/m2/balance'
import { SAVE_DTO_VERSION, type SaveDTO } from '~/shared/types/save-dto'

export function migrateSaveV2ToV3(v2: SaveDTO): SaveDTO {
  return {
    ...v2,
    schemaVersion: SAVE_DTO_VERSION,
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
