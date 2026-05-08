import type { FactionId, FactionInfluenceState, IntelligenceCoverage, World } from '~/shared/types'
import {
  SAVE_DTO_VERSION,
  type Result,
  type SaveDTO,
  type SaveLoadError,
} from '~/shared/types/save-dto'
import { getDefaultPhases } from './factory'

export function worldToSaveDTO(world: World, scenarioId: 'm1' | 'm9' = 'm1'): SaveDTO {
  return {
    schemaVersion: SAVE_DTO_VERSION,
    scenarioId,
    createdAt: Date.now(),
    world: {
      date: world.date,
      tick: world.tick,
      sites: [...world.sites.entries()],
      realms: [...world.realms.entries()],
      armies: [...world.armies.entries()],
      edges: [...world.edges.entries()],
      wars: [...world.wars.entries()],
      peaceProposals: [...world.peaceProposals.entries()],
      relations: [...world.relations.entries()],
      diplomaticProposals: [...world.diplomaticProposals.entries()],
      treaties: [...world.treaties.entries()],
      diplomacyHistory: [...world.diplomacyHistory],
      coalitions: [...world.coalitions.entries()],
      zhouInvestiture: [...world.zhouInvestiture.entries()],
      generals: [...world.generals.entries()],
      rulers: [...world.rulers.entries()],
      academies: [...world.academies.entries()],
      eventChainStates: [...world.eventChainStates.entries()],
      reformStates: [...world.reformStates.entries()],
      disasterStates: [...world.disasterStates.entries()],
      tradeRoutes: [...world.tradeRoutes.entries()],
      factionInfluences: [...world.factionInfluences.entries()].map(([key, value]) => [
        key,
        { realmId: value.realmId, influences: [...value.influences.entries()] },
      ]),
      passes: [...world.passes.entries()],
      adjacencyEdges: [...world.adjacencyEdges.entries()],
      sieges: [...world.sieges.entries()],
      edicts: [...world.edicts.entries()],
      governorAssignments: [...world.governorAssignments.entries()],
      intelligenceCoverage: [...world.intelligenceCoverage.entries()],
      spyMissions: [...world.spyMissions.entries()],
      counterIntelStates: [...world.counterIntelStates.entries()],
      provinces: [...world.provinces.entries()],
      regions: [...world.regions.entries()],
      characterTemplates: [...world.characterTemplates.entries()],
      localization: [...world.localization.entries()],
      playerRealmId: world.playerRealmId,
      rngState: world.rngState,
      pendingOrders: [...world.pendingOrders],
    },
  }
}

export function saveDtoToWorld(dto: SaveDTO): Result<World, SaveLoadError> {
  if (dto.schemaVersion !== SAVE_DTO_VERSION) {
    return {
      ok: false,
      error: {
        kind: 'incompatible_version',
        message: `Unsupported SaveDTO version: ${dto.schemaVersion}`,
        got: dto.schemaVersion,
        expected: SAVE_DTO_VERSION,
      },
    }
  }

  const sw = dto.world
  const factionInfluences = new Map(
    sw.factionInfluences.map(([key, value]): [string, FactionInfluenceState] => [
      key,
      {
        realmId: value.realmId,
        influences: new Map<FactionId, number>(value.influences),
      },
    ]),
  )

  return {
    ok: true,
    value: {
      date: sw.date,
      tick: sw.tick,
      sites: new Map(sw.sites),
      realms: new Map(sw.realms),
      armies: new Map(sw.armies),
      edges: new Map(sw.edges),
      wars: new Map(sw.wars),
      peaceProposals: new Map(sw.peaceProposals),
      relations: new Map(sw.relations),
      diplomaticProposals: new Map(sw.diplomaticProposals),
      treaties: new Map(sw.treaties),
      diplomacyHistory: sw.diplomacyHistory,
      coalitions: new Map(sw.coalitions),
      zhouInvestiture: new Map(sw.zhouInvestiture),
      generals: new Map(sw.generals),
      rulers: new Map(sw.rulers),
      academies: new Map(sw.academies),
      eventChainStates: new Map(sw.eventChainStates),
      reformStates: new Map(sw.reformStates),
      disasterStates: new Map(sw.disasterStates),
      tradeRoutes: new Map(sw.tradeRoutes),
      factionInfluences,
      passes: new Map(sw.passes),
      adjacencyEdges: new Map(sw.adjacencyEdges),
      sieges: new Map(sw.sieges),
      edicts: new Map(sw.edicts),
      governorAssignments: new Map(sw.governorAssignments),
      intelligenceCoverage: new Map(sw.intelligenceCoverage) as IntelligenceCoverage,
      spyMissions: new Map(sw.spyMissions),
      counterIntelStates: new Map(sw.counterIntelStates),
      provinces: new Map(sw.provinces),
      regions: new Map(sw.regions),
      characterTemplates: new Map(sw.characterTemplates),
      localization: new Map(sw.localization),
      playerRealmId: sw.playerRealmId,
      rngState: sw.rngState,
      phases: getDefaultPhases(),
      pendingOrders: sw.pendingOrders,
    },
  }
}
