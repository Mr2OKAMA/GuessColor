import { describe, expect, it } from 'vitest'
import { backspace, pressKey } from './kana'
import { normalize } from './normalize'
import { answersFor, buildQuestionPool } from './question'
import { GameSession } from './session'
import { suggest } from './suggest'
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
    s.tick(20)
    const name = answersFor(data, s.question.colors)[0].name
    expect(s.answer(name)).toBe('correct')
    expect(s.timeLeftSec).toBe(before - 20 + 30)
    s.timeLeftSec = 170
    const next = answersFor(data, s.question.colors)[0].name
    expect(s.answer(next)).toBe("correct")
    expect(s.timeLeftSec).toBe(180)
    expect(s.score).toBeGreaterThan(0)
  })

  it('時間切れで終了する', () => {
    const s = new GameSession(data)
    s.start()
    s.tick(999)
    expect(s.phase).toBe('finished')
  })
})

describe('kana', () => {
  it('濁点・半濁点・小文字を直前の文字に適用し、再度押すと戻る', () => {
    expect(pressKey('ピカ', '゛')).toBe('ピガ')
    expect(pressKey('ピガ', '゛')).toBe('ピカ')
    expect(pressKey('ハ', '゜')).toBe('パ')
    expect(pressKey('パ', '゛')).toBe('バ')
    expect(pressKey('ウ', '゛')).toBe('ヴ')
    expect(pressKey('ケー', '小')).toBe('ケー')
    expect(pressKey('チユ', '小')).toBe('チュ')
    expect(pressKey('チュ', '小')).toBe('チユ')
    expect(pressKey('ツ', '小')).toBe('ッ')
    expect(pressKey('ヤ', '小')).toBe('ャ')
  })

  it('適用できない文字や空文字は変化しない', () => {
    expect(pressKey('ナ', '゜')).toBe('ナ')
    expect(pressKey('', '゛')).toBe('')
    expect(pressKey('ピ', 'カ')).toBe('ピカ')
  })

  it('1文字削除できる', () => {
    expect(backspace('ピカ')).toBe('ピ')
    expect(backspace('')).toBe('')
  })
})

describe('suggest', () => {
  const names: Pokemon[] = [
    { id: 1, name: 'ピカチュウ', colors: [] },
    { id: 2, name: 'ピジョン', colors: [] },
    { id: 3, name: 'ライチュウ', colors: [] },
  ]

  it('前方一致を先に、部分一致を後ろに返す', () => {
    expect(suggest(names, 'ぴ').items.map((p) => p.name)).toEqual(['ピカチュウ', 'ピジョン'])
    expect(suggest(names, 'チュウ').items.map((p) => p.name)).toEqual(['ピカチュウ', 'ライチュウ'])
  })

  it('入力が空なら候補なし、上限と総数を返す', () => {
    expect(suggest(names, '').items).toEqual([])
    const r = suggest(names, 'ピ', 1)
    expect(r.items).toHaveLength(1)
    expect(r.total).toBe(2)
  })
})

describe('色違い', () => {
  const pokes: Pokemon[] = [
    { id: 1, name: 'ライチュウ', colors: ['黄', 'オレンジ'], shinyColors: ['茶', '白'] },
    { id: 2, name: 'ピジョン', colors: ['茶', '赤'] },
  ]

  it('通常色でも色違いの色でも、同じ名前が正解になる', () => {
    expect(answersFor(pokes, ['黄', 'オレンジ']).map((p) => p.name)).toEqual(['ライチュウ'])
    expect(answersFor(pokes, ['茶', '白']).map((p) => p.name)).toEqual(['ライチュウ'])
  })

  it('通常色と色違いの色を混ぜた組み合わせは正解にならない', () => {
    expect(answersFor(pokes, ['黄', '白'])).toEqual([])
  })

  it('色違いの色も出題プールに含まれる', () => {
    const pool = buildQuestionPool(pokes, 2).map((q) => q.colors.join('+'))
    expect(pool).toContain('白+茶')
    expect(pool).not.toContain('白+黄')
  })
})

describe('出題の色数', () => {
  const many: Pokemon[] = [
    { id: 1, name: 'アア', colors: ['赤', '青', '黄'] },
    { id: 2, name: 'イイ', colors: ['赤', '青', '黄'] },
    { id: 3, name: 'ウウ', colors: ['赤', '青', '黄'] },
    { id: 4, name: 'エエ', colors: ['赤', '青', '黄'] },
    { id: 5, name: 'オオ', colors: ['赤', '青', '黄'] },
    { id: 6, name: 'カカ', colors: ['赤', '青', '黄'] },
    { id: 7, name: 'キキ', colors: ['赤', '青', '黄'] },
    { id: 8, name: 'クク', colors: ['赤', '青', '黄'] },
    { id: 9, name: 'ケケ', colors: ['赤', '青', '黄'] },
    { id: 10, name: 'ココ', colors: ['赤', '青', '黄'] },
    { id: 11, name: 'ササ', colors: ['赤', '青', '黄'] },
  ]

  it('通常は75%で1色、25%で2色（乱数で切り替わる）', () => {
    const low = new GameSession(many, () => 0.5)
    low.start()
    expect(low.question.colors).toHaveLength(1)
    const high = new GameSession(many, () => 0.8)
    high.start()
    expect(high.question.colors).toHaveLength(2)
  })

  it('10コンボごとに3色が出て、その次は通常に戻る', () => {
    const s = new GameSession(many, () => 0)
    s.start()
    for (let i = 0; i < 9; i++) {
      expect(s.question.colors).toHaveLength(1)
      s.answer(many[i].name)
    }
    expect(s.combo).toBe(9)
    expect(s.question.colors).toHaveLength(1)
    s.answer(many[9].name)
    expect(s.combo).toBe(10)
    expect(s.question.colors).toHaveLength(3)
    s.answer(many[10].name)
    expect(s.question.colors).toHaveLength(1)
  })

  it('パスでコンボが切れると3色は出ない', () => {
    const s = new GameSession(many, () => 0)
    s.start()
    for (let i = 0; i < 9; i++) s.answer(many[i].name)
    s.pass()
    expect(s.question.colors).toHaveLength(1)
  })
})

describe('色数による得点倍率', () => {
  const pokes: Pokemon[] = [
    { id: 1, name: 'アア', colors: ['赤', '青', '黄'] },
    { id: 2, name: 'イイ', colors: ['赤', '青', '黄'] },
  ]

  function scoreAfterFirstAnswer(random: number): number {
    const s = new GameSession(pokes, () => random)
    s.start()
    s.answer(answersFor(pokes, s.question.colors)[0].name)
    return s.score
  }

  it('1色は×1、2色は×5', () => {
    expect(scoreAfterFirstAnswer(0)).toBe(100)
    expect(scoreAfterFirstAnswer(0.8)).toBe(500)
  })

  it('3色は×10、コンボ加点にも倍率がかかる', () => {
    const s = new GameSession(pokes, () => 0)
    s.start()
    const names = ['アア', 'イイ']
    s.combo = 9
    s.question = { colors: ['赤', '青', '黄'] }
    expect(s.answer(names[0])).toBe('correct')
    expect(s.lastGain).toBe((100 + 9 * 10) * 10)
  })
})

describe('ランキング', () => {
  it('ユーザーごとの最高スコアのみ残して降順に並べる', async () => {
    const { bestPerPlayer } = await import('./ranking')
    const rows = [
      { player_id: 'a', name: 'A', score: 100 },
      { player_id: 'b', name: 'B', score: 300 },
      { player_id: 'a', name: 'A', score: 500 },
    ]
    expect(bestPerPlayer(rows, 10).map((r) => r.score)).toEqual([500, 300])
    expect(bestPerPlayer(rows, 1)).toHaveLength(1)
  })
})
