export type Color = string

export interface Pokemon {
  id: number
  // フォームの場合の元ポケモンの図鑑番号
  dex?: number
  name: string
  colors: Color[]
  // 色違いの色（通常名で答えたときも、この色の組み合わせで正解になる）
  shinyColors?: Color[]
}

export interface Question {
  colors: Color[]
}

export type GamePhase = 'idle' | 'playing' | 'finished'
