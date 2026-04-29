import { describe, it, expect } from 'vitest'
import sitesData from '../sites.json'
import { M0DataSchema } from '@/shared/schemas'

type JsonEdge = { curveType: string; travel_cost: number; anchors: unknown[]; controls?: unknown[] }

function edgeReferenceCounts(): Map<string, number> {
  const edgeRefs = new Map<string, number>()

  for (const site of sitesData.sites) {
    for (const ref of site.boundary) {
      edgeRefs.set(ref.edge, (edgeRefs.get(ref.edge) ?? 0) + 1)
    }
  }

  return edgeRefs
}

function edgeReverseFlags(): Map<string, boolean[]> {
  const edgeRefs = new Map<string, boolean[]>()

  for (const site of sitesData.sites) {
    for (const ref of site.boundary) {
      const list = edgeRefs.get(ref.edge) ?? []
      list.push(ref.reverse)
      edgeRefs.set(ref.edge, list)
    }
  }

  return edgeRefs
}

describe('sites.json M0.2 edge-indexed validation', () => {
  it('passes M0DataSchema validation', () => {
    expect(() => M0DataSchema.parse(sitesData)).not.toThrow()
  })

  it('has 5 sites', () => {
    expect(sitesData.sites.length).toBe(5)
  })

  it('has edges table (non-empty)', () => {
    expect(Object.keys(sitesData.edges).length).toBeGreaterThan(0)
  })

  it('each edge referenced by 1 or 2 sites', () => {
    for (const [eid, count] of edgeReferenceCounts()) {
      expect(count, `Edge ${eid} referenced by ${count} sites`).toBeLessThanOrEqual(2)
    }
  })

  it('shared edges have opposite reverse flags', () => {
    for (const [eid, reverses] of edgeReverseFlags()) {
      if (reverses.length === 2) {
        expect(reverses[0], `Edge ${eid}: both sides have same reverse`).not.toBe(reverses[1])
      }
    }
  })

  it('cubic-bezier edges have correct controls length', () => {
    for (const [eid, edge] of Object.entries(sitesData.edges) as Array<[string, JsonEdge]>) {
      if (edge.curveType === 'cubic-bezier') {
        expect(edge.controls?.length, `Edge ${eid} controls length mismatch`).toBe(edge.anchors.length - 1)
      }
    }
  })

  it('all edges have travel_cost >= 1', () => {
    for (const [eid, edge] of Object.entries(sitesData.edges) as Array<[string, JsonEdge]>) {
      expect(edge.travel_cost, `Edge ${eid} travel_cost invalid`).toBeGreaterThanOrEqual(1)
    }
  })
})
