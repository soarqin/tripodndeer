import { describe, it, expect } from 'vitest'
import sitesData from '../sites.json'

describe('sites.json Voronoi validation', () => {
  it('has 5 sites with ≥80 vertices each', () => {
    expect(sitesData.sites.length).toBe(5)
    for (const site of sitesData.sites) {
      expect(site.polygon.length, `${site.id} has too few vertices`).toBeGreaterThanOrEqual(80)
    }
  })

  it('adjacency is bidirectional (closed)', () => {
    for (const site of sitesData.sites) {
      for (const nId of site.adjacency) {
        const nb = sitesData.sites.find(s => s.id === nId)
        expect(nb, `${nId} not found`).toBeTruthy()
        expect(nb!.adjacency, `${nId} missing ${site.id}`).toContain(site.id)
      }
    }
  })

  it('shared edges have matching vertices (zero gap)', () => {
    for (const siteA of sitesData.sites) {
      for (const nId of siteA.adjacency) {
        const siteB = sitesData.sites.find(s => s.id === nId)!
        const setB = new Set(siteB.polygon.map(([x, y]) => `${x},${y}`))
        const sharedInA = siteA.polygon.filter(([x, y]) => setB.has(`${x},${y}`))
        expect(sharedInA.length, `${siteA.id}↔${nId} share no vertices`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('factions defined correctly', () => {
    expect(sitesData.factions).toHaveLength(2)
    const ids = sitesData.factions.map(f => f.id)
    expect(ids).toContain('faction_red')
    expect(ids).toContain('faction_blue')
  })
})
