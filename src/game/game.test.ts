import { describe, expect, it } from 'vitest'
import { normalize } from './normalize'
import { answersFor, buildQuestionPool } from './question'
import { GameSession } from './session'
import type { Pokemon } from './types'

const data: Pokemon[] = [
  { id: 1, name: 'クチート', colors: ['黒', '黄'] },
  { id: 2, name: 'ピカチュウ', colors: ['黄', '黒', '赤'] },
  { id: 3, name: 'プリン', colors: ['ピンク'] },
]

describe('normalize', () => {
  it('ひらがな・カタカナ・空白を吸収する', () => {
    expect(normalize('くちーと')).toBe(normalize(' クチート '))
  })
})

describe('question', () => {
  it('指定色をすべて含むポケモンだけが答えになる', () => {
    expect(answersFor(data, ['黒', '黄']).map((p) => p.name)).toEqual(['クチート', 'ピカチュウ'])
  })

  it('該当なしの組み合わせは出題プールに含まれない', () => {
    const pool = buildQuestionPool(data, 2).map((q) => q.colors.join('+'))
    expect(pool).not.toContain('ピンク+黒')
    expect(pool).toContain('黄+黒')
  })
})

describe('GameSession', () => {
  it('正解で時間とスコアが増え、不正解はペナルティなし', () => {
    const s = new GameSession(data, () => 0)
    s.start()
    const before = s.timeLeftSec
    expect(s.answer('ぜんぜんちがう')).toBe('wrong')
    expect(s.timeLeftSec).toBe(before)
    const name = answersFor(data, s.question.colors)[0].name
    expect(s.answer(name)).toBe('correct')
    expect(s.timeLeftSec).toBeGreaterThan(before)
    expect(s.score).toBeGreaterThan(0)
  })

  it('時間切れで終了する', () => {
    const s = new GameSession(data)
    s.start()
    s.tick(999)
    expect(s.phase).toBe('finished')
  })
})
