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
  summary?: string
  thumbnail?: string
}

export interface SavesDB extends DBSchema {
  saves: {
    key: string
    value: { slotId: string; dto: unknown; metadata: SaveMetadata }
  }
}

let dbPromise: Promise<IDBPDatabase<SavesDB>> | null = null

type IdbEventName = 'blocked' | 'blocking' | 'terminated'
type IdbEventListener = (name: IdbEventName) => void

let listener: IdbEventListener | null = null

export function setIdbEventListener(next: IdbEventListener | null): void {
  listener = next
}

function notifyIdbEvent(name: IdbEventName): void {
  if (listener) listener(name)
}

export function getDb(): Promise<IDBPDatabase<SavesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SavesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'slotId' })
        }
      },
      blocked() {
        console.warn('[db] IDB upgrade blocked by another tab')
        notifyIdbEvent('blocked')
      },
      blocking() {
        console.warn('[db] IDB version change pending; closing connection')
        notifyIdbEvent('blocking')
        if (dbPromise) {
          void dbPromise.then((db) => db.close()).catch(() => {})
          dbPromise = null
        }
      },
      terminated() {
        console.warn('[db] IDB connection terminated unexpectedly')
        notifyIdbEvent('terminated')
        dbPromise = null
      },
    })
  }
  return dbPromise
}

export function resetDbForTesting(): void {
  dbPromise = null
  listener = null
}
