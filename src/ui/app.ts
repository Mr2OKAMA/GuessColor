import { CONFIG } from '../game/config'
import { backspace, EXTRA_KEYS, KANA_GRID, pressKey } from '../game/kana'
import { GameSession } from '../game/session'
import { suggest } from '../game/suggest'
import type { Pokemon } from '../game/types'
import { AudioManager } from './audio'

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
  const audio = new AudioManager()

  const muteBtn = document.createElement('button')
  muteBtn.className = 'mute'
  muteBtn.type = 'button'
  const renderMute = (): void => {
    muteBtn.textContent = audio.muted ? '🔇' : '🔊'
    muteBtn.setAttribute('aria-label', audio.muted ? 'サウンドをオンにする' : 'サウンドをオフにする')
  }
  muteBtn.onclick = (e) => {
    e.stopPropagation()
    audio.setMuted(!audio.muted)
    renderMute()
    audio.sfx('tap')
  }
  renderMute()
  document.body.appendChild(muteBtn)

  // 回答ボタン以外のボタンにタップ音を鳴らす
  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button')
    if (btn && btn.type !== 'submit' && !btn.dataset.silent) audio.sfx('tap')
  })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.suspend()
    else if (audio.playingBgm) audio.resume()
  })

  function stop(): void {
    if (timer !== undefined) cancelAnimationFrame(timer)
    timer = undefined
  }

  function renderMenu(): void {
    stop()
    audio.stopBgm()
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
        <button id="answers" class="sub">答え一覧</button>
        <p class="note">非公式のファンメイド作品です。画像は使用していません。</p>
      </main>`
    document.getElementById('start')!.onclick = startGame
    document.getElementById('how')!.onclick = renderHowTo
    document.getElementById('answers')!.onclick = renderAnswers
  }

  function renderHowTo(): void {
    root.innerHTML = `
      <main class="card howto">
        <h2>あそびかた</h2>
        <ol>
          <li>表示された色をすべて持つポケモンの名前を入力します。</li>
          <li>正解すると残り時間が <strong>${CONFIG.initialTimeSec}秒まで回復</strong>します。</li>
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

  function renderAnswers(): void {
    const rows = pokemons
      .map((p) => `<li><strong>${p.name}</strong> ${chipsHtml(p.colors)}</li>`)
      .join('')
    root.innerHTML = `
      <main class="card answers">
        <h2>答え一覧</h2>
        <ul class="answer-list">${rows}</ul>
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

  function kanaHtml(): string {
    const key = (k: string): string =>
      k
        ? `<button type="button" class="key" data-key="${k}">${k}</button>`
        : '<span class="key blank"></span>'
    const rows = KANA_GRID.map((row) => row.map(key).join('')).join('')
    return rows + EXTRA_KEYS.map(key).join('')
  }

  function showFeedback(kind: 'correct' | 'wrong' | 'duplicate' | 'pass'): void {
    const text = {
      correct: `正解！ 時間回復`,
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
    audio.startBgm()
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
          <input id="answer" autocomplete="off" inputmode="none" placeholder="ポケモンの名前" />
          <button type="button" id="back" class="key-del" aria-label="1文字消す">⌫</button>
          <button type="submit" class="primary">答える</button>
        </form>
        <div id="suggest" class="suggest"></div>
        <div id="kana" class="kana">${kanaHtml()}</div>
        <p id="feedback" class="feedback"></p>
        <div class="actions">
          <button id="pass" class="sub">パス（-${CONFIG.passPenaltySec}秒）</button>
          <button id="quit" class="sub">やめる</button>
        </div>
      </main>`
    const input = document.getElementById('answer') as HTMLInputElement
    // タッチ端末では端末のキーボードを出さず、画面のキーボードを使う
    const touch = window.matchMedia('(pointer: coarse)').matches
    if (touch) input.readOnly = true
    else input.focus()
    updateStats()
    updateTime()

    function renderSuggest(): void {
      const { items, total } = suggest(pokemons, input.value)
      const more = total > items.length ? `<span class="more">ほか ${total - items.length} 件</span>` : ''
      document.getElementById('suggest')!.innerHTML =
        items.map((p) => `<button type="button" data-silent="1" data-name="${p.name}">${p.name}</button>`).join('') + more
    }

    function submit(text: string): void {
      if (!text.trim()) return
      const result = session.answer(text)
      if (session.phase !== 'playing') return
      showFeedback(result)
      audio.sfx(result)
      if (result !== 'duplicate') input.value = ''
      if (result === 'correct') updateStats()
      renderSuggest()
      if (!touch) input.focus()
    }

    input.oninput = renderSuggest
    ;(document.getElementById('form') as HTMLFormElement).onsubmit = (e) => {
      e.preventDefault()
      submit(input.value)
    }
    document.getElementById('kana')!.onclick = (e) => {
      const key = (e.target as HTMLElement).closest<HTMLElement>('[data-key]')?.dataset.key
      if (!key) return
      input.value = pressKey(input.value, key)
      renderSuggest()
    }
    document.getElementById('back')!.onclick = () => {
      input.value = backspace(input.value)
      renderSuggest()
    }
    document.getElementById('suggest')!.onclick = (e) => {
      const name = (e.target as HTMLElement).closest<HTMLElement>('[data-name]')?.dataset.name
      if (name) submit(name)
    }
    document.getElementById('pass')!.onclick = () => {
      session.pass()
      if (session.phase !== 'playing') return
      showFeedback('pass')
      audio.sfx('pass')
      updateStats()
      if (!touch) input.focus()
    }
    document.getElementById('quit')!.onclick = renderMenu
  }

  function renderResult(): void {
    stop()
    audio.stopBgm()
    audio.sfx('finish')
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
