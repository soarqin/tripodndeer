import { describe, it, expect } from 'vitest'
import { loadM1Data } from '~/engine/world/factory'

describe('M4.2 scenario data', () => {
  it('loads scenario with schema_version 6', async () => {
    const data = await loadM1Data()
    expect(data.schema_version).toBe(6)
  })
  
  it('has factionInfluences for all 7 realms', async () => {
    const data = await loadM1Data()
    expect(data.factionInfluences?.length).toBe(7)
  })
  
  it('has 4-8 initial trade routes', async () => {
    const data = await loadM1Data()
    expect(data.tradeRoutes?.length).toBeGreaterThanOrEqual(4)
    expect(data.tradeRoutes?.length).toBeLessThanOrEqual(8)
  })
  
  it('realm_qin has high military_meritocracy (≥70)', async () => {
    const data = await loadM1Data()
    const qin = data.factionInfluences?.find(fi => fi.realmId === 'realm_qin')
    expect(qin?.influences.military_meritocracy).toBeGreaterThanOrEqual(70)
  })
  
  it('realm_chu has high noble_clans (≥70)', async () => {
    const data = await loadM1Data()
    const chu = data.factionInfluences?.find(fi => fi.realmId === 'realm_chu')
    expect(chu?.influences.noble_clans).toBeGreaterThanOrEqual(70)
  })
})
