import type { AIEspionageOption, PersonalityArchetype } from '~/shared/types'
import { M7_ESPIONAGE_WEIGHTS } from '~/content/m2/balance'

export function scoreEspionageOption(
  option: AIEspionageOption,
  personality: PersonalityArchetype,
): number {
  return (option.score ?? 1) * M7_ESPIONAGE_WEIGHTS[personality][option.kind]
}
