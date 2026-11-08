export type Color = string

export interface Pokemon {
  id: number
  name: string
  colors: Color[]
}

export interface Question {
  colors: Color[]
}

export type GamePhase = 'idle' | 'playing' | 'finished'
