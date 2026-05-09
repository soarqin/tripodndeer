import scenarioRaw from '@/content/m9/scenario-453bc.json'
import { loadM9Data } from '../factory'
import { describe, expect, it } from 'vitest'

describe('M9 mapper archetype field', () => {
  it('loads realm archetypes from raw archetype fields', async () => {
    const rawQin = (scenarioRaw.realms as Array<Record<string, unknown>>).find(
      realm => realm.id === 'realm_qin',
    )

    expect(rawQin?.archetype).toBe('conqueror')
    expect(rawQin).not.toHaveProperty('aiPersonality')

    const data = await loadM9Data()
    const qin = data.realms.find(realm => realm.id === 'realm_qin')

    expect(qin?.archetypePersonality).toBe('conqueror')
  })
})
