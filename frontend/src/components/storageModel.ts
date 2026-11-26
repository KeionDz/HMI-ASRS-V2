export type StorageStatus = 'available' | 'occupied' | 'post-event' | 'retrieved'

export type StorageSlot = {
  id: string
  level: number
  row: number
  slot: number
  status: StorageStatus
  items: number
  weight: number
  eventId: string | null
  description: string
  contents: string[]
}

const seeded: Record<string, Partial<StorageSlot>> = {
  'L1-R1-S1': { status: 'occupied', items: 24, weight: 183, eventId: 'EVT-001', contents: ['Banquet table', 'Stacking chair'] },
  'L1-R1-S2': { status: 'occupied', items: 18, weight: 148, eventId: 'EVT-001', contents: ['Banquet table', 'Linen cart'] },
  'L1-R2-S1': { status: 'occupied', items: 14, weight: 122, eventId: 'EVT-002', contents: ['AV equipment', 'Stacking chair'] },
  'L1-R2-S2': { status: 'occupied', items: 16, weight: 166, eventId: 'EVT-002', contents: ['Banquet table', 'Stage riser'] },
  'L1-R2-S3': { status: 'occupied', items: 10, weight: 97, eventId: 'EVT-002', contents: ['Stacking chair'] },
  'L1-R3-S1': { status: 'post-event', items: 12, weight: 88, eventId: 'EVT-000', contents: ['Banquet table'] },
  'L1-R3-S2': { status: 'post-event', items: 8, weight: 67, eventId: 'EVT-000', contents: ['Stacking chair'] },
  'L2-R1-S1': { status: 'occupied', items: 20, weight: 221, eventId: 'EVT-003', contents: ['Stage riser', 'Stacking chair'] },
  'L2-R2-S1': { status: 'occupied', items: 18, weight: 202, eventId: 'EVT-003', contents: ['Linen cart', 'Stacking chair'] },
  'L2-R2-S2': { status: 'occupied', items: 16, weight: 178, eventId: 'EVT-003', contents: ['Stage riser', 'Linen cart'] },
  'L3-R1-S1': { status: 'occupied', items: 30, weight: 315, eventId: 'EVT-004', contents: ['AV equipment', 'Banquet table'] },
}

export function createStorageSlots(
  levels: number,
  palletsPerLevel: number,
  existing: StorageSlot[] = [],
): StorageSlot[] {
  const slotsById = new Map(existing.map((slot) => [slot.id, slot]))
  const safeLevels = Math.max(1, Math.floor(levels))
  const safePalletsPerLevel = Math.max(1, Math.floor(palletsPerLevel))

  return Array.from({ length: safeLevels * safePalletsPerLevel }, (_, index) => {
    const level = Math.floor(index / safePalletsPerLevel) + 1
    const position = index % safePalletsPerLevel
    const row = Math.floor(position / 8) + 1
    const slotNumber = (position % 8) + 1
    const id = `L${level}-R${row}-S${slotNumber}`
    const previous = slotsById.get(id)
    if (previous) return previous

    return {
      id,
      level,
      row,
      slot: slotNumber,
      status: 'available' as const,
      items: 0,
      weight: 0,
      eventId: null,
      description: '',
      contents: [],
      ...seeded[id],
    }
  })
}
