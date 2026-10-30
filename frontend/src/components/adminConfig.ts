export type FacilityConfig = {
  levels: number
  palletsPerLevel: number
  cameras: number
  assetTrackingThresholdHours: number
}

export const initialEventTypes = ['Corporate', 'Gala', 'Wedding']

export const initialInventoryItems = [
  'Banquet table',
  'Stacking chair',
  'Stage riser',
  'AV equipment',
  'Linen cart',
]

export const initialChecklistTemplates: Record<string, string[]> = {
  Corporate: ['Banquet table', 'Stacking chair', 'AV equipment'],
  Gala: ['Banquet table', 'Stacking chair', 'Linen cart'],
  Wedding: ['Stacking chair', 'Stage riser', 'Linen cart'],
}

export const initialFacilityConfig: FacilityConfig = {
  levels: 3,
  palletsPerLevel: 32,
  cameras: 4,
  assetTrackingThresholdHours: 6,
}
