import { normalize } from './normalize'
import type { Pokemon } from './types'

export interface Suggestions {
  items: Pokemon[]
  total: number
}

// 前方一致を優先し、足りなければ部分一致で補う（図鑑番号順）
export function suggest(pokemons: Pokemon[], input: string, limit = 6): Suggestions {
  const q = normalize(input)
  if (!q) return { items: [], total: 0 }
  const prefix: Pokemon[] = []
  const partial: Pokemon[] = []
  for (const p of pokemons) {
    const name = normalize(p.name)
    if (name.startsWith(q)) prefix.push(p)
    else if (name.includes(q)) partial.push(p)
  }
  const all = [...prefix, ...partial]
  return { items: all.slice(0, limit), total: all.length }
}
