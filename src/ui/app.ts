import { GameSession } from '../game/session'
import type { Pokemon } from '../game/types'

const COLOR_CSS: Record<string, string> = {
  赤: '#e53935',
  青: '#1e88e5',
  黄: '#fdd835',
  緑: '#43a047',
  黒: '#212121',
  白: '#f5f5f5',
  茶: '#795548',
  ピンク: '#f48fb1',
  紫: '#8e24aa',
  灰: '#9e9e9e',
  オレンジ: '#fb8c00',
}

export function mountApp(root: HTMLElement, pokemons: Pokemon[]): void {
  const session = new GameSession(pokemons)
  let timer: number | undefined
  let last = 0

  function stop(): void {
    if (timer !== undefined) cancelAnimationFrame(timer)
    timer = undefined
  }

  function loop(now: number): void {
    session.tick((now - last) / 1000)
    last = now
    if (session.phase === 'finished') {
      renderResult()
      return
    }
    const el = document.getElementById('time')
    if (el) el.textContent = session.timeLeftSec.toFixed(1)
    timer = requestAnimationFrame(loop)
  }

  function renderTitle(): void {
    stop()
    root.innerHTML = `
      <main class="card">
        <h1>GuessColor</h1>
        <p>出された色をすべて含むポケモンの名前を入力しよう。<br />正解するほど時間が伸びる！</p>
        <button id="start">スタート</button>
        <p class="note">非公式のファンメイド作品です。画像は使用していません。</p>
      </main>`
    document.getElementById('start')!.onclick = startGame
  }

  function startGame(): void {
    session.start()
    renderPlay()
    last = performance.now()
    timer = requestAnimationFrame(loop)
  }

  function renderPlay(feedback = ''): void {
    const chips = session.question.colors
      .map((c) => `<span class="chip" style="background:${COLOR_CSS[c] ?? '#ccc'}">${c}</span>`)
      .join('')
    root.innerHTML = `
      <main class="card">
        <div class="status">
          <span>残り <strong id="time">${session.timeLeftSec.toFixed(1)}</strong> 秒</span>
          <span>スコア ${session.score}</span>
          <span>コンボ ${session.combo}</span>
        </div>
        <div class="chips">${chips}</div>
        <form id="form">
          <input id="answer" autocomplete="off" placeholder="ポケモンの名前" />
          <button type="submit">答える</button>
        </form>
        <p class="feedback">${feedback}</p>
        <button id="pass" class="sub">パス（-1秒）</button>
      </main>`
    const input = document.getElementById('answer') as HTMLInputElement
    input.focus()
    ;(document.getElementById('form') as HTMLFormElement).onsubmit = (e) => {
      e.preventDefault()
      const result = session.answer(input.value)
      if (session.phase !== 'playing') return
      const msg = { correct: '正解！', wrong: '違います', duplicate: '回答済みです' }[result]
      renderPlay(msg)
    }
    document.getElementById('pass')!.onclick = () => {
      session.pass()
      if (session.phase === 'playing') renderPlay()
    }
  }

  function renderResult(): void {
    stop()
    root.innerHTML = `
      <main class="card">
        <h1>終了！</h1>
        <p class="big">${session.score} 点</p>
        <p>正解数 ${session.correctCount} / 最大コンボ ${session.maxCombo}</p>
        <button id="retry">もう一度</button>
      </main>`
    document.getElementById('retry')!.onclick = startGame
  }

  renderTitle()
}
