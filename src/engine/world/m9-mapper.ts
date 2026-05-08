import type {
  M9Data,
  M9DataCharacterTemplate,
  M9DataProvince,
  M9DataRealm,
  M9DataRegion,
  M9DataSite,
  M9RawCharacterTemplate,
  M9RawData,
  M9RawPass,
  M9RawProvince,
  M9RawRealm,
  M9RawRegion,
  M9RawSite,
} from '@/shared/schemas'
import type { Pass } from '@/shared/types'

function mapRealm(raw: M9RawRealm): M9DataRealm {
  return {
    id: raw.id,
    displayName: raw.name,
    fullTitle: raw.full_title,
    capital: raw.capital,
    status: raw.status,
    archetypePersonality: raw.aiPersonality,
    rulingHouse: raw.rulingHouse,
    ideologyLean: raw.ideology_lean,
    startingTreasury: raw.starting_treasury,
    startingManpower: raw.starting_manpower,
    traits: raw.realm_traits,
  }
}

function mapSite(raw: M9RawSite): M9DataSite {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    regionId: raw.regionId,
    provinceId: raw.provinceId,
    position: raw.position,
    terrain: raw.terrain,
    defenseValue: raw.defense_value,
    populationBase: raw.population_base,
    economy: raw.economy,
    cultural: raw.cultural,
    historicalOwner: raw.historical_owner,
    historicalNotes: raw.historicalNotes,
  }
}

function mapProvince(raw: M9RawProvince): M9DataProvince {
  return {
    id: raw.id,
    name: raw.name,
    regionId: raw.regionId,
    realmId: raw.realmId,
    siteIds: raw.siteIds,
    historicalCapital: raw.historicalCapital,
    historicalNotes: raw.historicalNotes,
  }
}

function mapRegion(raw: M9RawRegion): M9DataRegion {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    provinceIds: raw.provinceIds,
  }
}

function mapCharacterTemplate(raw: M9RawCharacterTemplate): M9DataCharacterTemplate {
  return {
    id: raw.id,
    givenName: raw.givenName,
    familyName: raw.familyName,
    realmId: raw.realmId,
    birthYearBC: raw.birthYearBC,
    deathYearBC: raw.deathYearBC,
    birthplace: raw.birthplace,
    specialty: raw.specialty,
    attributes: raw.attributes,
    historicalNotes: raw.historicalNotes,
    source: raw.source,
    aliases: raw.aliases,
  }
}

function isRuntimePass(raw: M9RawPass): raw is Pass {
  return 'edgeId' in raw && 'defenseBonus' in raw && 'controllerId' in raw && 'fortification' in raw
}

export function mapM9RawToM9Data(raw: M9RawData): M9Data {
  return {
    meta: {
      id: raw.meta.id,
      name: raw.meta.name,
      startYearBC: raw.meta.start_year_bc,
      endYearBC: raw.meta.end_year_bc,
      playableRealms: raw.meta.playable_realms,
    },
    realms: raw.realms.map(mapRealm),
    sites: raw.sites.map(mapSite),
    passes: raw.passes.filter(isRuntimePass),
    provinces: raw.provinces.map(mapProvince),
    regions: raw.regions.map(mapRegion),
    characterTemplates: raw.characterTemplates.map(mapCharacterTemplate),
  }
}
