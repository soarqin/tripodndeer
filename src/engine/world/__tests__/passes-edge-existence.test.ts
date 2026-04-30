import { describe, expect, it } from 'vitest'

import { createWorldFromM1Data, loadM1Data } from '../factory'

describe('pass edges resolve in world.adjacencyEdges', () => {
  it('every pass.edgeId exists in world.adjacencyEdges', () => {
    const data = loadM1Data()
    createWorldFromM1Data(data, 99, 'realm_qin')

    for (const pass of data.passes) {
      const edgeId = (pass as { edgeId?: string }).edgeId
      if (edgeId) {
        const adjacencyEdge = data.adjacencyEdges.find(
          (ae: unknown) => (ae as { id?: string }).id === edgeId,
        )
        expect(adjacencyEdge, `pass ${(pass as { id?: string }).id} edgeId ${edgeId} must resolve`).toBeDefined()
      }
    }
  })

  it('5 adjacencyEdges exist in scenario data', () => {
    const data = loadM1Data()
    expect(data.adjacencyEdges.length).toBe(5)
  })

  it('every adjacencyEdge site pair is actually adjacent in the map', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 99, 'realm_qin')
    for (const ae of data.adjacencyEdges) {
      const edge = ae as { fromSiteId?: string; toSiteId?: string }
      if (edge.fromSiteId && edge.toSiteId) {
        const fromSite = world.sites.get(edge.fromSiteId)
        expect(fromSite?.adjacency).toContain(edge.toSiteId)
      }
    }
  })
})
