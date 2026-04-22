export interface LunarLocation {
  id: string
  name: string
  lat: number
  lon: number
  diameter?: string
  significance: string
  isProposed: boolean
  coords: string
}

export interface DotState {
  hovered: boolean
  selected: boolean
  shadowed: boolean
}
