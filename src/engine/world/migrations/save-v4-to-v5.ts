import type { ScenarioId } from '~/shared/types/scenario'
import type { SaveDTOAnyVersion } from '~/shared/types/save-dto'

const M9_SCENARIO_SITE_THRESHOLD = 250

function inferScenarioId(dto: SaveDTOAnyVersion): ScenarioId {
  if (dto.scenarioId === 'm1' || dto.scenarioId === 'm9' || dto.scenarioId === 'tutorial') {
    return dto.scenarioId
  }
  const sites = (dto.world as { sites?: unknown } | undefined)?.sites
  if (Array.isArray(sites) && sites.length >= M9_SCENARIO_SITE_THRESHOLD) {
    return 'm9'
  }
  return 'm1'
}

export function migrateSaveV4ToV5(v4: SaveDTOAnyVersion): SaveDTOAnyVersion {
  return {
    ...v4,
    schemaVersion: 5,
    scenarioId: inferScenarioId(v4),
    tutorialState: null,
  }
}
