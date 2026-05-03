import { describe, it, expect } from 'vitest'
import {
  AdjacencyEdgeSchema,
  AIPersonalitySchema,
  ArmySchema,
  ArmyStateSchema,
  CoalitionStateSchema,
  DiplomaticProposalSchema,
  DiplomaticRelationSchema,
  EdictStateSchema,
  GeneralSchema,
  GovernorAssignmentSchema,
  M0DataSchema,
  M1DataSchema,
  M1DataSchemaV2,
  MapEdgeSchema,
  OrderSchema,
  PassSchema,
  PeaceProposalSchema,
  PeaceTermSchema,
  RealmEconomySchema,
  RealmStatsSchema,
  RealmSchema,
  SiteEconomySchema,
  SiteOccupationSchema,
  TreatySchema,
  WorldSchema,
  ZhouInvestitureStateSchema,
} from '../schemas'

const validPolylineEdge = {
  id: 'e_001',
  curveType: 'polyline' as const,
  travel_cost: 1,
  anchors: [[0, 0], [100, 50], [200, 0]] as const,
}
const validBezierEdge = {
  id: 'e_002',
  curveType: 'cubic-bezier' as const,
  travel_cost: 2,
  anchors: [[0, 0], [100, 50], [200, 0]] as const,
  controls: [[[10, 10], [90, 40]], [[110, 60], [190, 10]]] as const,
}
const validSite = {
  id: 'site_1',
  name: '邑甲',
  position: [100, 100] as const,
  boundary: [
    { edge: 'e_001', reverse: false },
    { edge: 'e_002', reverse: true },
    { edge: 'e_003', reverse: false },
  ],
}
const validRealm = {
  id: 'realm_red',
  displayName: '红',
  fullTitle: '红方',
  color: '#dc2626',
  capital: 'site_1',
  initialSites: ['site_1'],
  initialArmies: [],
  aiPersonality: 'aggressive_random' as const,
  economy: { treasury: 1000, foodStores: 2000, taxRate: 10 },
}
const validData = {
  edges: { e_001: validPolylineEdge, e_002: validBezierEdge, e_003: validPolylineEdge },
  sites: [validSite],
  realms: [validRealm],
  initialOwnership: { site_1: 'realm_red' },
}

const validIdleArmy = {
  id: 'army_001',
  realmId: 'realm_red',
  manpower: 120,
  location: 'site_1',
  state: 'idle' as const,
  destination: null,
  ticksRemaining: 0,
  source: null,
}

const validMarchOrder = {
  type: 'march' as const,
  armyId: 'army_001',
  targetSiteId: 'site_2',
}

describe('MapEdgeSchema valid', () => {
  it('accepts polyline edge', () => {
    expect(() => MapEdgeSchema.parse(validPolylineEdge)).not.toThrow()
  })

  it('accepts cubic-bezier edge with correct controls', () => {
    expect(() => MapEdgeSchema.parse(validBezierEdge)).not.toThrow()
  })

  it('accepts travel_cost in range', () => {
    expect(() => MapEdgeSchema.parse({ ...validPolylineEdge, travel_cost: 10 })).not.toThrow()
  })
})

describe('MapEdgeSchema invalid', () => {
  it('rejects cubic-bezier with missing controls', () => {
    const bad = { ...validBezierEdge, controls: undefined }
    expect(() => MapEdgeSchema.parse(bad)).toThrow()
  })

  it('rejects cubic-bezier with wrong controls length', () => {
    const bad = { ...validBezierEdge, controls: [[[10, 10], [90, 40]]] }
    expect(() => MapEdgeSchema.parse(bad)).toThrow()
  })

  it('rejects travel_cost below range', () => {
    const bad = { ...validPolylineEdge, travel_cost: 0 }
    expect(() => MapEdgeSchema.parse(bad)).toThrow()
  })

  it('rejects travel_cost above range', () => {
    const bad = { ...validPolylineEdge, travel_cost: 11 }
    expect(() => MapEdgeSchema.parse(bad)).toThrow()
  })
})

describe('M0DataSchema valid', () => {
  it('accepts valid edge-indexed data', () => {
    expect(() => M0DataSchema.parse(validData)).not.toThrow()
  })

  it('returns typed object', () => {
    const result = M0DataSchema.parse(validData)
    expect(result.sites[0]?.id).toBe('site_1')
    expect(Object.keys(result.edges)).toContain('e_001')
  })
})

describe('M0DataSchema invalid', () => {
  it('rejects site with boundary < 3 entries', () => {
    const bad = {
      ...validData,
      sites: [{ ...validSite, boundary: [{ edge: 'e_001', reverse: false }, { edge: 'e_002', reverse: true }] }],
    }
    expect(() => M0DataSchema.parse(bad)).toThrow()
  })

  it('rejects wrong types', () => {
    const bad = { ...validData, edges: 'not-an-object' }
    expect(() => M0DataSchema.parse(bad)).toThrow()
  })
})

describe('M1DataSchema valid', () => {
  const validM1Data = {
    edges: validData.edges,
    sites: validData.sites,
    realms: [
      validRealm,
      { ...validRealm, id: 'realm_blue', displayName: '蓝', fullTitle: '蓝方', color: '#2563eb' },
    ],
    initialOwnership: { site_1: 'realm_red' },
    initialArmies: [],
    initialWars: [],
  }

  it('accepts valid M1 data', () => {
    expect(() => M1DataSchema.parse(validM1Data)).not.toThrow()
  })

  it('accepts empty initialWars', () => {
    const result = M1DataSchema.parse(validM1Data)
    expect(result.initialWars).toEqual([])
  })

  it('accepts empty initialArmies', () => {
    const result = M1DataSchema.parse(validM1Data)
    expect(result.initialArmies).toEqual([])
  })

  it('rejects missing realms field', () => {
    const bad: Partial<typeof validM1Data> = { ...validM1Data }
    delete bad.realms
    expect(() => M1DataSchema.parse(bad)).toThrow()
  })

  it('rejects invalid edge without travel_cost', () => {
    const bad = {
      ...validM1Data,
      edges: {
        ...validM1Data.edges,
        e_001: { ...validPolylineEdge, travel_cost: undefined },
      },
    }
    expect(() => M1DataSchema.parse(bad)).toThrow()
  })
})

describe('WorldSchema', () => {
  const runtimeWorldShape = {
    date: { yearBC: 260, season: 'spring' as const, month: 1 as const, xun: 'shang' as const },
    tick: 0,
    sites: new Map(),
    realms: new Map(),
    armies: new Map(),
    edges: new Map(),
    wars: new Map(),
    peaceProposals: new Map(),
    relations: new Map(),
    diplomaticProposals: new Map(),
    treaties: new Map(),
    diplomacyHistory: [],
    coalitions: new Map(),
    zhouInvestiture: new Map(),
    generals: new Map(),
    rulers: new Map(),
    academies: new Map(),
    eventChainStates: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    edicts: new Map(),
    governorAssignments: new Map(),
    reformStates: new Map(),
    disasterStates: new Map(),
    tradeRoutes: new Map(),
    factionInfluences: new Map(),
    intelligenceCoverage: new Map(),
    spyMissions: new Map(),
    counterIntelStates: new Map(),
    playerRealmId: 'realm_red',
    rngState: { seed: 1, counter: 0 },
    phases: [],
    pendingOrders: [],
  }

  it('accepts a runtime world shape', () => {
    expect(() => WorldSchema.parse(runtimeWorldShape)).not.toThrow()
  })

  it.each(['peaceProposals', 'generals', 'passes', 'adjacencyEdges', 'sieges', 'edicts', 'governorAssignments'] as const)(
    'requires runtime world field %s',
    (field) => {
      const { [field]: _omitted, ...missingFieldWorld } = runtimeWorldShape

      expect(() => WorldSchema.parse(missingFieldWorld)).toThrow()
    },
  )

  it('documents war and diplomacy relation key separators as distinct contracts', () => {
    expect(() => DiplomaticRelationSchema.parse({
      key: 'realm_han__realm_qin',
      realmAId: 'realm_han',
      realmBId: 'realm_qin',
      attitude: 0,
      trust: 50,
      updatedAt: runtimeWorldShape.date,
    })).not.toThrow()
    expect(() => DiplomaticRelationSchema.parse({
      key: 'realm_han:realm_qin',
      realmAId: 'realm_han',
      realmBId: 'realm_qin',
      attitude: 0,
      trust: 50,
      updatedAt: runtimeWorldShape.date,
    })).toThrow()
  })
})

describe('M3 diplomacy contract schemas', () => {
  const validDate = { yearBC: 260, season: 'spring' as const, month: 1 as const, xun: 'shang' as const }
  const validRelation = {
    key: 'realm_han__realm_qin',
    realmAId: 'realm_han',
    realmBId: 'realm_qin',
    attitude: 0,
    trust: 50,
    updatedAt: validDate,
  }
  const validProposal = {
    id: 'diplomatic_proposal_1',
    kind: 'alliance' as const,
    proposingRealmId: 'realm_han',
    targetRealmId: 'realm_qin',
    status: 'pending' as const,
    proposedAt: validDate,
    proposedAtTick: 3,
    expiresAt: validDate,
    expiresAtTick: 12,
    resolvedAt: null,
    resolvedAtTick: null,
    treatyId: null,
  }
  const validTreaty = {
    id: 'treaty_1',
    kind: 'truce' as const,
    realmAId: 'realm_han',
    realmBId: 'realm_qin',
    status: 'active' as const,
    signedAt: validDate,
    signedAtTick: 6,
    expiresAt: validDate,
    expiresAtTick: 42,
    endedAt: null,
    endedAtTick: null,
    sourceProposalId: 'diplomatic_proposal_1',
  }

  it('accepts bounded relation, proposal, treaty, coalition, and investiture records', () => {
    expect(() => DiplomaticRelationSchema.parse(validRelation)).not.toThrow()
    expect(() => DiplomaticProposalSchema.parse(validProposal)).not.toThrow()
    expect(() => TreatySchema.parse(validTreaty)).not.toThrow()
    expect(() => CoalitionStateSchema.parse({ id: 'coalition_1', targetRealmId: 'realm_qin', memberRealmIds: ['realm_han'], status: 'forming', formedAt: validDate, dissolvedAt: null })).not.toThrow()
    expect(() => ZhouInvestitureStateSchema.parse({ realmId: 'realm_zhou', recognizedTitle: '王', grantedAtTick: 0, expiresAtTick: null, source: 'zhou' })).not.toThrow()
  })

  it('documents RelationKey as a canonical sorted pair with double underscore separator', () => {
    expect(() => DiplomaticRelationSchema.parse(validRelation)).not.toThrow()
    expect(() => DiplomaticRelationSchema.parse({ ...validRelation, key: 'realm_qin:realm_han' })).toThrow()
  })

  it('rejects out-of-bounds relation values and malformed proposal/treaty records', () => {
    expect(() => DiplomaticRelationSchema.parse({ ...validRelation, attitude: 101 })).toThrow()
    expect(() => DiplomaticRelationSchema.parse({ ...validRelation, trust: -1 })).toThrow()
    expect(() => DiplomaticProposalSchema.parse({ ...validProposal, kind: 'trade' })).toThrow()
    expect(() => DiplomaticProposalSchema.parse({ ...validProposal, expiresAtTick: -1 })).toThrow()
    expect(() => TreatySchema.parse({ ...validTreaty, kind: 'peace' })).toThrow()
    expect(() => TreatySchema.parse({ ...validTreaty, signedAtTick: 1.5 })).toThrow()
    expect(() => ZhouInvestitureStateSchema.parse({ realmId: 'realm_zhou', recognizedTitle: '王', grantedAtTick: 0, expiresAtTick: null, source: 'qin' })).toThrow()
  })

  it('defaults serializable M3 scenario arrays to empty collections', () => {
    const parsed = M1DataSchemaV2.parse({
      ...validData,
      schema_version: 2,
      realms: [{ ...validRealm, stats: { manpowerPool: 1000, manpowerCap: 5000, warWeariness: 0 } }],
      initialArmies: [],
      initialWars: [],
    })

    expect(parsed.relations).toEqual([])
    expect(parsed.diplomaticProposals).toEqual([])
    expect(parsed.treaties).toEqual([])
    expect(parsed.diplomacyHistory).toEqual([])
    expect(parsed.coalitions).toEqual([])
    expect(parsed.zhouInvestiture).toEqual([])
  })
})

describe('GeneralSchema', () => {
  const baseGeneral = {
    id: 'general_qin',
    realmId: 'realm_red',
    name: 'Qin General',
    might: 18,
    command: 5000,
    loyalty: 80,
  }

  it('accepts a general without strategy or learning', () => {
    const result = GeneralSchema.parse(baseGeneral)

    expect(result.strategy).toBeUndefined()
    expect(result.learning).toBeUndefined()
    expect('strategy' in result).toBe(false)
    expect('learning' in result).toBe(false)
  })

  it('accepts a general with strategy and learning', () => {
    const result = GeneralSchema.parse({
      ...baseGeneral,
      strategy: 12,
      learning: 9,
    })

    expect(result.strategy).toBe(12)
    expect(result.learning).toBe(9)
  })
})

describe('ArmySchema', () => {
  it('accepts a valid idle army', () => {
    expect(() => ArmySchema.parse(validIdleArmy)).not.toThrow()
  })

  it('accepts a valid idle army with null destination', () => {
    const result = ArmySchema.parse(validIdleArmy)
    expect(result.destination).toBeNull()
    expect(result.location).toBe('site_1')
  })

  it('rejects negative manpower', () => {
    expect(() => ArmySchema.parse({ ...validIdleArmy, manpower: -1 })).toThrow()
  })
})

describe('OrderSchema', () => {
  it('accepts a valid march order', () => {
    expect(() => OrderSchema.parse(validMarchOrder)).not.toThrow()
  })

  it('accepts M4 economy/statecraft orders', () => {
    expect(() => OrderSchema.parse({
      type: 'activate-edict',
      edictId: 'edict_1',
      realmId: 'realm_qin',
      kind: 'edict_tax_relief',
      durationMonths: 3,
    })).not.toThrow()
    expect(() => OrderSchema.parse({
      type: 'assign-governor',
      siteId: 'site_1',
      generalId: 'general_1',
    })).not.toThrow()
  })

  it("rejects invalid type 'attack'", () => {
    expect(() => OrderSchema.parse({ ...validMarchOrder, type: 'attack' })).toThrow()
  })

  it('rejects missing armyId', () => {
    expect(() => OrderSchema.parse({ type: 'march', targetSiteId: 'site_2' })).toThrow()
  })
})

describe('M4 economy contract schemas', () => {
  const validRealmEconomy = { treasury: 1000, foodStores: 2000, taxRate: 10 }
  const validSiteEconomy = { population: 30000, households: 6000, taxBase: 6000, foodProduction: 12000 }
  const validEdict = {
    id: 'edict_1',
    realmId: 'realm_qin',
    kind: 'edict_grain_reserve' as const,
    startedAtTick: 12,
    durationMonths: 6,
    remainingMonths: 4,
    status: 'active' as const,
  }
  const validGovernorAssignment = {
    siteId: 'site_1',
    realmId: 'realm_qin',
    generalId: 'general_1',
    assignedAtTick: 12,
    modifierKind: 'tax_efficiency' as const,
  }

  it('accepts canonical valid M4 economy data', () => {
    expect(() => RealmEconomySchema.parse(validRealmEconomy)).not.toThrow()
    expect(() => SiteEconomySchema.parse(validSiteEconomy)).not.toThrow()
    expect(() => EdictStateSchema.parse(validEdict)).not.toThrow()
    expect(() => GovernorAssignmentSchema.parse(validGovernorAssignment)).not.toThrow()
    expect(() => RealmSchema.parse(validRealm)).not.toThrow()
  })

  it.each([
    ['population', SiteEconomySchema, { ...validSiteEconomy, population: -1 }],
    ['households', SiteEconomySchema, { ...validSiteEconomy, households: -1 }],
    ['treasury', RealmEconomySchema, { ...validRealmEconomy, treasury: -1 }],
    ['foodStores', RealmEconomySchema, { ...validRealmEconomy, foodStores: -1 }],
  ])('rejects negative M4 resource/count field %s', (_, schema, value) => {
    expect(() => schema.parse(value)).toThrow()
  })

  it('rejects non-integer M4 resource/count values', () => {
    expect(() => SiteEconomySchema.parse({ ...validSiteEconomy, population: 1.5 })).toThrow()
    expect(() => RealmEconomySchema.parse({ ...validRealmEconomy, foodStores: 1.5 })).toThrow()
  })

  it('rejects out-of-contract M4 tax rate and governor assignment shapes', () => {
    expect(() => RealmEconomySchema.parse({ ...validRealmEconomy, taxRate: -1 })).toThrow()
    expect(() => RealmEconomySchema.parse({ ...validRealmEconomy, taxRate: 51 })).toThrow()
    expect(() => GovernorAssignmentSchema.parse({ ...validGovernorAssignment, modifierKind: 'strategy_bonus' })).toThrow()
    expect(() => GovernorAssignmentSchema.parse({ ...validGovernorAssignment, modifiers: [{ kind: 'tax_efficiency', value: 5 }] })).toThrow()
  })
})

describe('ArmyStateSchema', () => {
  it("accepts 'idle'", () => {
    expect(() => ArmyStateSchema.parse('idle')).not.toThrow()
  })

  it("accepts 'engaged'", () => {
    expect(() => ArmyStateSchema.parse('engaged')).not.toThrow()
  })

  it("accepts 'besieging'", () => {
    expect(() => ArmyStateSchema.parse('besieging')).not.toThrow()
  })

  it("accepts 'blocked'", () => {
    expect(() => ArmyStateSchema.parse('blocked')).not.toThrow()
  })

  it("rejects unknown state 'fighting'", () => {
    expect(() => ArmyStateSchema.parse('fighting')).toThrow()
  })
})

describe('M2 contract schemas', () => {
  const validDate = { yearBC: 260, season: 'spring' as const, month: 1 as const, xun: 'shang' as const }
  const validGeneral = { id: 'general_1', realmId: 'realm_qin', name: '王翦', might: 20, command: 12000, loyalty: 100 }
  const validPass = { id: 'pass_1', name: '函谷关', edgeId: 'ae_1', defenseBonus: 0.6, controllerId: 'realm_qin', fortification: 50 }
  const validAdjacencyEdge = { id: 'ae_1', fromSiteId: 'site_1', toSiteId: 'site_2', passId: 'pass_1' }
  const validPeaceProposal = {
    id: 'peace_1',
    proposingRealmId: 'realm_qin',
    targetRealmId: 'realm_han',
    terms: [{ type: 'cession' as const, payload: { siteIds: ['site_1'] } }],
    proposedAt: validDate,
    status: 'pending' as const,
    acknowledgedAt: null,
  }
  const validM1DataV2 = {
    edges: validData.edges,
    sites: validData.sites,
    realms: [
      {
        ...validRealm,
        stats: { manpowerPool: 1000, manpowerCap: 5000, warWeariness: 0 },
      },
    ],
    schema_version: 2 as const,
    initialOwnership: { site_1: 'realm_red' },
    initialArmies: [],
    initialWars: [],
    generals: [validGeneral],
    passes: [validPass],
    adjacencyEdges: [validAdjacencyEdge],
    peaceProposals: [validPeaceProposal],
    relations: [],
    diplomaticProposals: [],
    treaties: [],
    diplomacyHistory: [],
    coalitions: [],
    zhouInvestiture: [],
  }

  it('accepts valid RealmStats', () => {
    expect(() => RealmStatsSchema.parse({ manpowerPool: 1000, manpowerCap: 5000, warWeariness: 0 })).not.toThrow()
  })

  it.each(['aggressive_random', 'aggressive', 'cautious'] as const)('accepts AI personality %s', personality => {
    expect(() => AIPersonalitySchema.parse(personality)).not.toThrow()
    expect(() => RealmSchema.parse({ ...validRealm, aiPersonality: personality })).not.toThrow()
  })

  it('rejects RealmStats with negative manpowerPool', () => {
    expect(() => RealmStatsSchema.parse({ manpowerPool: -1, manpowerCap: 5000, warWeariness: 0 })).toThrow()
  })

  it('accepts valid AdjacencyEdge', () => {
    expect(() => AdjacencyEdgeSchema.parse({ id: 'ae_1', fromSiteId: 'site_1', toSiteId: 'site_2', passId: 'pass_1' })).not.toThrow()
  })

  it('rejects AdjacencyEdge missing passId', () => {
    expect(() => AdjacencyEdgeSchema.parse({ id: 'ae_1', fromSiteId: 'site_1', toSiteId: 'site_2' })).toThrow()
  })

  it('accepts valid General', () => {
    expect(() => GeneralSchema.parse({ id: 'general_1', realmId: 'realm_qin', name: '王翦', might: 20, command: 12000, loyalty: 100 })).not.toThrow()
  })

  it('rejects General with might above 30', () => {
    expect(() => GeneralSchema.parse({ id: 'general_1', realmId: 'realm_qin', name: '王翦', might: 31, command: 12000, loyalty: 100 })).toThrow()
  })

  it('accepts valid SiteOccupation', () => {
    expect(() => SiteOccupationSchema.parse({ occupierId: 'realm_qin', controlLevel: 50 })).not.toThrow()
  })

  it('rejects SiteOccupation with controlLevel above 100', () => {
    expect(() => SiteOccupationSchema.parse({ occupierId: 'realm_qin', controlLevel: 101 })).toThrow()
  })

  it('accepts valid cession PeaceTerm', () => {
    expect(() => PeaceTermSchema.parse({ type: 'cession', payload: { siteIds: ['site_1'] } })).not.toThrow()
  })

  it('rejects cession PeaceTerm missing payload', () => {
    expect(() => PeaceTermSchema.parse({ type: 'cession' })).toThrow()
  })

  it('accepts valid indemnity PeaceTerm', () => {
    expect(() => PeaceTermSchema.parse({ type: 'indemnity', payload: { amount: 100 } })).not.toThrow()
  })

  it('rejects indemnity PeaceTerm with negative amount', () => {
    expect(() => PeaceTermSchema.parse({ type: 'indemnity', payload: { amount: -1 } })).toThrow()
  })

  it('accepts pending PeaceProposal', () => {
    expect(() => PeaceProposalSchema.parse({ id: 'peace_1', proposingRealmId: 'realm_qin', targetRealmId: 'realm_han', terms: [{ type: 'cession', payload: { siteIds: ['site_1'] } }], proposedAt: validDate, status: 'pending', acknowledgedAt: null })).not.toThrow()
  })

  it('accepts accepted PeaceProposal with acknowledgedAt', () => {
    expect(() => PeaceProposalSchema.parse({ id: 'peace_1', proposingRealmId: 'realm_qin', targetRealmId: 'realm_han', terms: [{ type: 'tribute', payload: { amountPerYear: 10, years: 2 } }], proposedAt: validDate, status: 'accepted', acknowledgedAt: validDate })).not.toThrow()
  })

  it('accepts valid Pass', () => {
    expect(() => PassSchema.parse({ id: 'pass_1', name: '函谷关', edgeId: 'ae_1', defenseBonus: 0.6, controllerId: 'realm_qin', fortification: 50 })).not.toThrow()
  })

  it('rejects Pass with defenseBonus above 1', () => {
    expect(() => PassSchema.parse({ id: 'pass_1', name: '函谷关', edgeId: 'ae_1', defenseBonus: 1.1, controllerId: 'realm_qin', fortification: 50 })).toThrow()
  })

  it('accepts valid M1DataSchemaV2 data with concrete M2 arrays', () => {
    const result = M1DataSchemaV2.safeParse(validM1DataV2)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.generals).toHaveLength(1)
      expect(result.data.passes).toHaveLength(1)
      expect(result.data.adjacencyEdges).toHaveLength(1)
      expect(result.data.peaceProposals).toHaveLength(1)
    }
  })

  it.each([
    [
      'general missing realmId',
      { ...validM1DataV2, generals: [{ id: 'general_1', name: '王翦', might: 20, command: 12000, loyalty: 100 }] },
    ],
    [
      'pass missing edgeId',
      { ...validM1DataV2, passes: [{ id: 'pass_1', name: '函谷关', defenseBonus: 0.6, controllerId: 'realm_qin', fortification: 50 }] },
    ],
    [
      'adjacency edge missing passId',
      { ...validM1DataV2, adjacencyEdges: [{ id: 'ae_1', fromSiteId: 'site_1', toSiteId: 'site_2' }] },
    ],
    [
      'peace proposal with invalid status',
      { ...validM1DataV2, peaceProposals: [{ ...validPeaceProposal, status: 'archived' }] },
    ],
  ])('rejects malformed M2 array items: %s', (_, invalid) => {
    const result = M1DataSchemaV2.safeParse(invalid as unknown)

    expect(result.success).toBe(false)
  })
})
