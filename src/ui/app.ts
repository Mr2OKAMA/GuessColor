import { CONFIG } from '../game/config'
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

const BEST_KEY = 'guesscolor.best'

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function saveBest(score: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(score))
  } catch {
    // 保存できない環境では無視する
  }
}

function chipsHtml(colors: string[]): string {
  return colors
    .map((c) => `<span class="chip" style="background:${COLOR_CSS[c] ?? '#ccc'}">${c}</span>`)
    .join('')
}

export function mountApp(root: HTMLElement, pokemons: Pokemon[]): void {
  const session = new GameSession(pokemons)
  let timer: number | undefined
  let last = 0
  let best = loadBest()

  function stop(): void {
    if (timer !== undefined) cancelAnimationFrame(timer)
    timer = undefined
  }

  function renderMenu(): void {
    stop()
    root.innerHTML = `
      <main class="card menu">
        <div class="logo" aria-hidden="true">
          <span style="background:${COLOR_CSS['赤']}"></span>
          <span style="background:${COLOR_CSS['黄']}"></span>
          <span style="background:${COLOR_CSS['青']}"></span>
        </div>
        <h1>GuessColor</h1>
        <p class="lead">出された色をすべて含む<br />ポケモンの名前を答えるタイムアタック！</p>
        <p class="best">ハイスコア <strong>${best}</strong> 点</p>
        <button id="start" class="primary">スタート</button>
        <button id="how" class="sub">あそびかた</button>
        <p class="note">非公式のファンメイド作品です。画像は使用していません。</p>
      </main>`
    document.getElementById('start')!.onclick = startGame
    document.getElementById('how')!.onclick = renderHowTo
  }

  function renderHowTo(): void {
    root.innerHTML = `
      <main class="card howto">
        <h2>あそびかた</h2>
        <ol>
          <li>表示された色をすべて持つポケモンの名前を入力します。</li>
          <li>正解すると残り時間が <strong>+${CONFIG.correctBonusSec}秒</strong>。</li>
          <li>パスは <strong>-${CONFIG.passPenaltySec}秒</strong>でコンボが途切れます。</li>
          <li>不正解にペナルティはありません。</li>
          <li>${CONFIG.threeColorCombo}コンボ以上で3色の問題が出ます。</li>
          <li>同じポケモンは1回しか使えません。</li>
        </ol>
        <p class="hint">初期時間は ${CONFIG.initialTimeSec} 秒です。</p>
        <button id="back" class="primary">もどる</button>
      </main>`
    document.getElementById('back')!.onclick = renderMenu
  }

  function loop(now: number): void {
    session.tick((now - last) / 1000)
    last = now
    if (session.phase === 'finished') {
      renderResult()
      return
    }
    updateTime()
    timer = requestAnimationFrame(loop)
  }

  function updateTime(): void {
    const t = session.timeLeftSec
    const text = document.getElementById('time')
    const bar = document.getElementById('bar')
    if (text) text.textContent = t.toFixed(1)
    if (bar) {
      bar.style.width = `${Math.min(1, t / CONFIG.initialTimeSec) * 100}%`
      bar.classList.toggle('low', t <= 10)
    }
  }

  function updateStats(): void {
    document.getElementById('score')!.textContent = String(session.score)
    const combo = document.getElementById('combo')!
    combo.textContent = String(session.combo)
    combo.parentElement!.classList.toggle('hot', session.combo >= CONFIG.threeColorCombo)
    document.getElementById('chips')!.innerHTML = chipsHtml(session.question.colors)
  }

  function showFeedback(kind: 'correct' | 'wrong' | 'duplicate' | 'pass'): void {
    const text = {
      correct: `正解！ +${CONFIG.correctBonusSec}秒`,
      wrong: '違います',
      duplicate: '回答済みです',
      pass: `パス -${CONFIG.passPenaltySec}秒`,
    }[kind]
    const el = document.getElementById('feedback')!
    el.textContent = text
    el.className = `feedback ${kind}`
    // アニメーションを再生し直す
    void el.offsetWidth
    el.classList.add('pop')
  }

  function startGame(): void {
    session.start()
    renderPlay()
    last = performance.now()
    timer = requestAnimationFrame(loop)
  }

  function renderPlay(): void {
    root.innerHTML = `
      <main class="card play">
        <div class="timer">
          <div class="bar-bg"><div id="bar" class="bar"></div></div>
          <span class="time"><strong id="time"></strong> 秒</span>
        </div>
        <div class="status">
          <span>スコア <strong id="score"></strong></span>
          <span>コンボ <strong id="combo"></strong></span>
        </div>
        <p class="prompt">この色をすべて含むポケモンは？</p>
        <div id="chips" class="chips"></div>
        <form id="form">
          <input id="answer" autocomplete="off" placeholder="ポケモンの名前" />
          <button type="submit" class="primary">答える</button>
        </form>
        <p id="feedback" class="feedback"></p>
        <div class="actions">
          <button id="pass" class="sub">パス（-${CONFIG.passPenaltySec}秒）</button>
          <button id="quit" class="sub">やめる</button>
        </div>
      </main>`
    const input = document.getElementById('answer') as HTMLInputElement
    input.focus()
    updateStats()
    updateTime()
    ;(document.getElementById('form') as HTMLFormElement).onsubmit = (e) => {
      e.preventDefault()
      if (!input.value.trim()) return
      const result = session.answer(input.value)
      if (session.phase !== 'playing') return
      showFeedback(result)
      if (result !== 'duplicate') input.value = ''
      if (result === 'correct') updateStats()
      input.focus()
    }
    document.getElementById('pass')!.onclick = () => {
      session.pass()
      if (session.phase !== 'playing') return
      showFeedback('pass')
      updateStats()
      input.focus()
    }
    document.getElementById('quit')!.onclick = renderMenu
  }

  function renderResult(): void {
    stop()
    const isNew = session.score > best
    if (isNew) {
      best = session.score
      saveBest(best)
    }
    root.innerHTML = `
      <main class="card result">
        <h1>終了！</h1>
        <p class="big">${session.score} 点</p>
        ${isNew ? '<p class="newbest">ハイスコア更新！</p>' : `<p class="best">ハイスコア ${best} 点</p>`}
        <p>正解数 ${session.correctCount} / 最大コンボ ${session.maxCombo}</p>
        <button id="retry" class="primary">もう一度</button>
        <button id="menu" class="sub">メニューへ</button>
      </main>`
    document.getElementById('retry')!.onclick = startGame
    document.getElementById('menu')!.onclick = renderMenu
  }

  renderMenu()
}
