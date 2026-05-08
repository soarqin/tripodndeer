import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { runTickPhases } from '~/engine/clock'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { saveDtoToWorld, worldToSaveDTO } from '~/engine/world/save-dto'
import { SaveDTOSchema } from '~/shared/schemas/save-dto'
import { SAVE_DTO_VERSION, type SaveDTO } from '~/shared/types/save-dto'
import type { FactionInfluenceState, World } from '~/shared/types'

function createM1World(): World {
  return createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
}

function restore(dto: SaveDTO): World {
  const result = saveDtoToWorld(dto)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

function runTicks(world: World, n: number): World {
  let current = world
  for (let i = 0; i < n; i++) {
    const result = runTickPhases(current, current.rngState)
    current = result.world
  }
  return current
}

function worldHash(world: World): string {
  return JSON.stringify(world, (_, value) => (value instanceof Map ? [...value.entries()] : value))
}

function writeEvidence(filename: string, content: string): void {
  const evidenceDir = path.resolve(process.cwd(), '.sisyphus/evidence')
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true })
  fs.writeFileSync(path.join(evidenceDir, filename), content, 'utf-8')
}

describe('SaveDTO conversion', () => {
  it('round-trips M1 world core state without phases in DTO', () => {
    const original = createM1World()
    const dto = worldToSaveDTO(original)
    const json = JSON.stringify(dto)
    const parsed = SaveDTOSchema.parse(JSON.parse(json))
    const restored = restore(dto)

    expect(parsed.schemaVersion).toBe(SAVE_DTO_VERSION)
    expect(json).not.toContain('phases')
    expect(restored.sites.size).toBe(original.sites.size)
    expect(restored.realms.size).toBe(original.realms.size)
    expect(restored.tick).toBe(original.tick)
    expect(restored.rngState).toEqual(original.rngState)

    writeEvidence(
      'task-T0.3-roundtrip-m1.log',
      `round-trip M1 PASS sites=${restored.sites.size} realms=${restored.realms.size} tick=${restored.tick}`,
    )
  })

  it('preserves representative site and realm fields deeply', () => {
    const original = createM1World()
    const restored = restore(worldToSaveDTO(original))

    expect(restored.sites.get('site_001')).toEqual(original.sites.get('site_001'))
    expect(restored.realms.get('realm_qin')).toEqual(original.realms.get('realm_qin'))
  })

  it('reconstructs factionInfluences nested Map', () => {
    const factionInfluence: FactionInfluenceState = {
      realmId: 'realm_qin',
      influences: new Map([
        ['royal_kin', 40],
        ['reformists', 60],
      ]),
    }
    const original: World = {
      ...createM1World(),
      factionInfluences: new Map([['realm_qin', factionInfluence]]),
    }
    const restored = restore(worldToSaveDTO(original))
    const restoredInfluence = restored.factionInfluences.get('realm_qin')

    expect(restoredInfluence?.realmId).toBe('realm_qin')
    expect(restoredInfluence?.influences).toBeInstanceOf(Map)
    expect(restoredInfluence?.influences.get('royal_kin')).toBe(40)
    expect(restoredInfluence?.influences.get('reformists')).toBe(60)
  })

  it('rejects incompatible SaveDTO versions', () => {
    const dto = worldToSaveDTO(createM1World())
    const incompatible = { ...dto, schemaVersion: 999 } as unknown as SaveDTO
    const result = saveDtoToWorld(incompatible)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected incompatible version failure')
    expect(result.error.kind).toBe('incompatible_version')
    expect(result.error.got).toBe(999)
    expect(result.error.expected).toBe(SAVE_DTO_VERSION)

    writeEvidence(
      'task-T0.3-incompatible-version.log',
      `incompatible version PASS got=${result.error.got} expected=${result.error.expected}`,
    )
  })

  it('keeps original and restored worlds deterministic after 100 ticks', () => {
    const original = createM1World()
    const restored = restore(worldToSaveDTO(original))
    const afterOriginal = runTicks(original, 100)
    const afterRestored = runTicks(restored, 100)

    expect(worldHash(afterRestored)).toBe(worldHash(afterOriginal))

    writeEvidence(
      'task-T0.3-determinism-100tick.log',
      `determinism 100 ticks PASS hash=${worldHash(afterRestored)}`,
    )
  })

  it('reconstructs default phases on load', () => {
    const restored = restore(worldToSaveDTO(createM1World()))

    expect(restored.phases.length).toBeGreaterThan(0)
  })
})
