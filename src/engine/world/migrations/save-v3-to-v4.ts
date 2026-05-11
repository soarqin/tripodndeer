import type { SaveDTOAnyVersion } from '~/shared/types/save-dto'

export function migrateSaveV3ToV4(v3: SaveDTOAnyVersion): SaveDTOAnyVersion {
  return {
    ...v3,
    schemaVersion: 4,
    seenHints: {},
    hintsEnabled: true,
  }
}
