import type { Color, Pokemon, Question } from './types'

export function matches(pokemon: Pokemon, colors: Color[]): boolean {
  return colors.every((c) => pokemon.colors.includes(c))
}

export function answersFor(pokemons: Pokemon[], colors: Color[]): Pokemon[] {
  return pokemons.filter((p) => matches(p, colors))
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]]
  const result: T[][] = []
  items.forEach((item, i) => {
    for (const rest of combinations(items.slice(i + 1), size - 1)) {
      result.push([item, ...rest])
    }
  })
  return result
}

// 該当ポケモンが1匹以上いる色の組み合わせだけを返す
export function buildQuestionPool(pokemons: Pokemon[], colorCount: 2 | 3): Question[] {
  const allColors = [...new Set(pokemons.flatMap((p) => p.colors))].sort()
  return combinations(allColors, colorCount)
    .filter((colors) => pokemons.some((p) => matches(p, colors)))
    .map((colors) => ({ colors }))
}

export function pickQuestion(
  pool: Question[],
  previous?: Question,
  random: () => number = Math.random,
): Question {
  const candidates =
    pool.length > 1 && previous
      ? pool.filter((q) => q.colors.join() !== previous.colors.join())
      : pool
  return candidates[Math.floor(random() * candidates.length)]
}
