import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ScenarioId } from '~/shared'

const DB_NAME = 'tripodndeer-saves'
const DB_VERSION = 1

export interface SaveMetadata {
  slotId: string
  name: string
  createdAt: number
  tick: number
  scenarioId: ScenarioId
  playerRealmName: string
}

export interface SavesDB extends DBSchema {
  saves: {
    key: string
    value: { slotId: string; dto: unknown; metadata: SaveMetadata }
  }
}

let dbPromise: Promise<IDBPDatabase<SavesDB>> | null = null

export function getDb(): Promise<IDBPDatabase<SavesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SavesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'slotId' })
        }
      },
    })
  }
  return dbPromise
}

export function resetDbForTesting(): void {
  dbPromise = null
}
