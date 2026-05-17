import { getDb } from './db'

export async function quarantineSlot(slotId: string): Promise<string> {
  const quarantineSlotId = `${slotId}_quarantine_${Date.now()}`
  const db = await getDb()
  const record = await db.get('saves', slotId)
  if (record) {
    await db.put('saves', { ...record, slotId: quarantineSlotId })
    await db.delete('saves', slotId)
  }
  return quarantineSlotId
}
