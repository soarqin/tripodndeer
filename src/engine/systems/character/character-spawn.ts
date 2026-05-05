import type { GameEvent, General, RNGState, World } from '~/shared/types'
import { M9_ESTIMATED_AGE_AT_APPEARANCE } from '~/content/m2/balance'

export function characterSpawnPhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const events: GameEvent[] = []
  let nextWorld = world

  const sortedTemplateIds = [...world.characterTemplates.keys()].sort((a, b) =>
    a.localeCompare(b),
  )

  for (const charId of sortedTemplateIds) {
    const template = world.characterTemplates.get(charId)
    if (!template) continue

    if (nextWorld.generals.has(charId)) continue

    const realm = nextWorld.realms.get(template.realmId)
    if (!realm) continue
    if ((realm.status ?? 'active') !== 'active') continue

    const spawnThreshold = template.birthYearBC - M9_ESTIMATED_AGE_AT_APPEARANCE
    if (nextWorld.date.yearBC > spawnThreshold) continue

    if (template.deathYearBC !== null && nextWorld.date.yearBC < template.deathYearBC) continue

    const age = template.birthYearBC - nextWorld.date.yearBC
    const name = `${template.familyName}${template.givenName}`
    const general: General = {
      id: charId,
      realmId: template.realmId,
      name,
      might: template.attributes.wu,
      command: template.attributes.wu,
      loyalty: 80,
      attrs: template.attributes,
      specialty: template.specialty,
      ambition: 'mid',
      age,
      recruitedAtTick: nextWorld.tick,
      posts: [],
      loyaltyState: 'loyal',
    }

    const nextGenerals = new Map(nextWorld.generals)
    nextGenerals.set(charId, general)
    nextWorld = { ...nextWorld, generals: nextGenerals }

    events.push({
      type: 'characterSpawned',
      payload: {
        generalId: charId,
        realmId: template.realmId,
        name,
        yearBC: nextWorld.date.yearBC,
        tick: nextWorld.tick,
      },
    })
  }

  return { world: nextWorld, nextRng: rng, events }
}
