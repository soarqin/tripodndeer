import type { IdeologyLean, Ideology } from '~/shared/types'

const IDEOLOGIES: readonly Ideology[] = ['fa', 'ru', 'dao', 'mo', 'zonghen', 'bing']

export function cosineSimilarity(a: IdeologyLean, b: IdeologyLean): number {
  const dot = IDEOLOGIES.reduce((sum, k) => sum + a[k] * b[k], 0)
  const magA = Math.sqrt(IDEOLOGIES.reduce((sum, k) => sum + a[k] ** 2, 0))
  const magB = Math.sqrt(IDEOLOGIES.reduce((sum, k) => sum + b[k] ** 2, 0))
  if (magA === 0 || magB === 0) return 0
  return dot / (magA * magB)
}
