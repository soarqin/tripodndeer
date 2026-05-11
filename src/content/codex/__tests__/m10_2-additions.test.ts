import { describe, expect, it } from 'vitest'
import { loadStaticEntries } from '@/ui/components/CodexPanel/codex-data-loader'

describe('M10.2 codex additions', () => {
  it('all 4 new mechanic entries exist', () => {
    const entries = loadStaticEntries()
    const ids = new Set(entries.map(e => e.id))
    expect(ids.has('mechanic-succession')).toBe(true)
    expect(ids.has('mechanic-recruitment')).toBe(true)
    expect(ids.has('mechanic-espionage')).toBe(true)
    expect(ids.has('mechanic-disaster')).toBe(true)
  })
  
  it('each new entry has H1 title', () => {
    const entries = loadStaticEntries()
    const newIds = ['mechanic-succession', 'mechanic-recruitment', 'mechanic-espionage', 'mechanic-disaster']
    for (const id of newIds) {
      const entry = entries.find(e => e.id === id)
      expect(entry, `entry ${id} should exist`).toBeTruthy()
      expect(entry!.body.startsWith('#'), `${id} should start with H1`).toBe(true)
    }
  })
  
  it('mechanic-espionage does not contain forbidden espionage terms', () => {
    const entries = loadStaticEntries()
    const espionage = entries.find(e => e.id === 'mechanic-espionage')
    expect(espionage).toBeTruthy()
    const forbidden = ['defect', 'assassinate', 'steal', '背叛', '暗杀', '窃取', '盗取']
    for (const term of forbidden) {
      expect(espionage!.body.includes(term), `should not contain "${term}"`).toBe(false)
    }
  })
  
  it('internal codex:// links in new entries resolve', () => {
    const entries = loadStaticEntries()
    const entryIds = new Set(entries.map(e => e.id))
    const newIds = ['mechanic-succession', 'mechanic-recruitment', 'mechanic-espionage', 'mechanic-disaster']
    const linkPattern = /\[([^\]]+)\]\(codex:\/\/([^)]+)\)/g
    
    for (const newId of newIds) {
      const entry = entries.find(e => e.id === newId)
      if (!entry) continue
      for (const match of entry.body.matchAll(linkPattern)) {
        const linkedId = match[2]!
        expect(entryIds.has(linkedId), `${newId} has broken link to "${linkedId}"`).toBe(true)
      }
    }
  })
})
