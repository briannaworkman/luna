export type LocationType = 'crater' | 'apollo' | 'robotic' | 'proposed'

export interface LunarLocation {
  id: string
  name: string
  lat: number
  lon: number
  diameter?: string
  significance: string
  namingStory?: string
  isProposed: boolean
  coords: string
  region: string
  namedBy?: string[]
  citations?: string[]
  suggestedQuestions?: string[]
  type: LocationType
  missionName?: string
  siteName?: string
  landingYear?: number
}

export interface DotState {
  hovered: boolean
  selected: boolean
  shadowed: boolean
}
