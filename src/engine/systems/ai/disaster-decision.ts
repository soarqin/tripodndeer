import type { DisasterChoice, DisasterDefinition, Realm, World } from '~/shared/types'
import { M42_AI_DISASTER_RELIEF_PROPENSITY } from '~/content/m2/balance'
import { getPersonality } from './utility-scorer'

function isAffordable(choice: DisasterChoice, realm: Realm): boolean {
  switch (choice.costType) {
    case 'foodStores':
      return realm.economy.foodStores >= choice.costAmount
    case 'treasury':
      return realm.economy.treasury >= choice.costAmount
    case 'morale':
    case 'none':
      return true
  }
}

function findChoice(definition: DisasterDefinition, id: string): DisasterChoice | undefined {
  return definition.playerChoices.find((c) => c.id === id)
}

export function selectAIDisasterChoice(
  world: World,
  realm: Realm,
  definition: DisasterDefinition,
): string {
  const personality = getPersonality(world, realm.id)
  const preferredId = M42_AI_DISASTER_RELIEF_PROPENSITY[personality] ?? 'ignore'

  const preferred = findChoice(definition, preferredId)
  if (preferred && isAffordable(preferred, realm)) {
    return preferred.id
  }

  const reduceTax = findChoice(definition, 'reduce_tax')
  if (reduceTax && isAffordable(reduceTax, realm)) {
    return reduceTax.id
  }

  const forcedLevy = findChoice(definition, 'forced_levy')
  if (forcedLevy) {
    return forcedLevy.id
  }

  return 'ignore'
}
