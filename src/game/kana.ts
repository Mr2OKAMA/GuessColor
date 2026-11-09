// 画面の五十音キーボード用。行=母音、列=ア行〜ワ行（空文字は空きマス）
export const KANA_GRID: string[][] = [
  ['ア', 'カ', 'サ', 'タ', 'ナ', 'ハ', 'マ', 'ヤ', 'ラ', 'ワ'],
  ['イ', 'キ', 'シ', 'チ', 'ニ', 'ヒ', 'ミ', '', 'リ', ''],
  ['ウ', 'ク', 'ス', 'ツ', 'ヌ', 'フ', 'ム', 'ユ', 'ル', ''],
  ['エ', 'ケ', 'セ', 'テ', 'ネ', 'ヘ', 'メ', '', 'レ', ''],
  ['オ', 'コ', 'ソ', 'ト', 'ノ', 'ホ', 'モ', 'ヨ', 'ロ', 'ヲ'],
]

export const EXTRA_KEYS = ['ン', 'ー', '゛', '゜', '小', '・', '♀', '♂', '2', 'X', 'Y', 'Z']

const DAKUTEN = '\u3099'
const HANDAKUTEN = '\u309a'
const SMALL_PAIRS: [string, string][] = [
  ['ア', 'ァ'], ['イ', 'ィ'], ['ウ', 'ゥ'], ['エ', 'ェ'], ['オ', 'ォ'],
  ['ツ', 'ッ'], ['ヤ', 'ャ'], ['ユ', 'ュ'], ['ヨ', 'ョ'], ['ワ', 'ヮ'],
]

function toggleMark(ch: string, mark: string): string {
  const [base, current] = [...ch.normalize('NFD')]
  if (current === mark) return base
  const composed = (base + mark).normalize('NFC')
  return [...composed].length === 1 && composed !== base + mark ? composed : ch
}

function toggleSmall(ch: string): string {
  for (const [large, small] of SMALL_PAIRS) {
    if (ch === large) return small
    if (ch === small) return large
  }
  return ch
}

function editLast(text: string, edit: (ch: string) => string): string {
  const chars = [...text]
  const last = chars.pop()
  return last === undefined ? text : chars.join('') + edit(last)
}

export function pressKey(text: string, key: string): string {
  switch (key) {
    case '゛':
      return editLast(text, (c) => toggleMark(c, DAKUTEN))
    case '゜':
      return editLast(text, (c) => toggleMark(c, HANDAKUTEN))
    case '小':
      return editLast(text, toggleSmall)
    default:
      return text + key
  }
}

export function backspace(text: string): string {
  return [...text].slice(0, -1).join('')
}
