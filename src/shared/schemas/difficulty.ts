import { z } from 'zod'

export const DifficultyTierSchema = z.enum(['weak', 'common', 'hero', 'hegemon', 'sage'])
