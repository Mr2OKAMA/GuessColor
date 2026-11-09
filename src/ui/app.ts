import { rankingEnabled, fetchRanking, submitScore, getPlayerId, getPlayerName, savePlayerName, cleanName, MAX_NAME_LENGTH } from '../game/ranking'
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

// 背景が明るく白文字だと読めない色
const LIGHT_COLORS = new Set(['白', '黄'])

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

function escapeHtml(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function chipsHtml(colors: string[]): string {
  return colors
    .map((c) => `<span class="chip${LIGHT_COLORS.has(c) ? ' light' : ''}" style="background:${COLOR_CSS[c] ?? '#ccc'}">${c}</span>`)
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
        ${rankingEnabled() ? '<button id="ranking" class="sub">ランキング</button>' : ''}
        <p class="note">非公式のファンメイド作品です。画像は使用していません。</p>
      </main>`
    document.getElementById('start')!.onclick = startGame
    document.getElementById('how')!.onclick = renderHowTo
    document.getElementById('answers')!.onclick = renderAnswers
    const rk = document.getElementById('ranking')
    if (rk) rk.onclick = renderRanking
  }

  function renderRanking(): void {
    root.innerHTML = `
      <main class="card ranking">
        <h1>ランキング</h1>
        <ol id="rank-list" class="rank-list"><li>読み込み中…</li></ol>
        <button id="back" class="sub">戻る</button>
      </main>`
    document.getElementById('back')!.onclick = renderMenu
    const list = document.getElementById('rank-list')!
    fetchRanking(10)
      .then((rows) => {
        const me = getPlayerId()
        list.innerHTML = rows.length
          ? rows
              .map(
                (r, i) =>
                  `<li class="${r.player_id === me ? 'me' : ''}"><span class="pos">${i + 1}</span><span class="nm">${escapeHtml(r.name)}</span><span class="sc">${r.score}点</span></li>`,
              )
              .join('')
          : '<li>まだ記録がありません</li>'
      })
      .catch(() => {
        list.innerHTML = '<li>ランキングを取得できませんでした</li>'
      })
  }

  function renderHowTo(): void {
    root.innerHTML = `
      <main class="card howto">
        <h2>あそびかた</h2>
        <ol>
          <li>表示された色をすべて持つポケモンの名前を入力します。</li>
          <li>正解すると残り時間が <strong>${CONFIG.correctBonusSec}秒増加</strong>します（最大 ${CONFIG.maxTimeSec} 秒まで）。</li>
          <li>パスは <strong>-${CONFIG.passPenaltySec}秒</strong>でコンボが途切れます。</li>
          <li>不正解にペナルティはありません。</li>
          <li>基本は1色(${CONFIG.oneColorRate * 100}%)か2色の問題で、${CONFIG.threeColorEvery}コンボごとに3色の問題が出ます。</li>
          <li>得点は <strong>1色×1・2色×${CONFIG.colorCountMultiplier[2]}・3色×${CONFIG.colorCountMultiplier[3]}</strong>。コンボが続くほど基本点が増えます。</li>
          <li>同じポケモンは1回しか使えません。</li>
        </ol>
        <p class="hint">初期時間は ${CONFIG.initialTimeSec} 秒です。</p>
        <button id="back" class="primary">もどる</button>
      </main>`
    document.getElementById('back')!.onclick = renderMenu
  }

  function renderAnswers(): void {
    const rows = pokemons
      .map((p) => {
        const shiny = p.shinyColors
          ? `<div class="chips shiny"><span class="star" title="色違い">✨</span>${chipsHtml(p.shinyColors)}</div>`
          : ''
        return `<li><span class="no">${p.dex ?? p.id}</span><span class="name">${p.name}</span><div class="cols"><div class="chips">${chipsHtml(p.colors)}</div>${shiny}</div></li>`
      })
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
      bar.style.width = `${Math.min(1, t / CONFIG.maxTimeSec) * 100}%`
      bar.classList.toggle('low', t <= 10)
    }
  }

  function updateStats(): void {
    document.getElementById('score')!.textContent = String(session.score)
    const combo = document.getElementById('combo')!
    combo.textContent = String(session.combo)
    combo.parentElement!.classList.toggle('hot', session.combo > 0 && session.combo % CONFIG.threeColorEvery === 0)
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
      correct: `正解！ +${session.lastGain}点`,
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
        ${
          rankingEnabled() && session.score > 0
            ? `<div class="submit-box">
          <input id="pname" maxlength="${MAX_NAME_LENGTH}" placeholder="なまえ" value="${escapeHtml(getPlayerName())}" />
          <button id="submit-score" class="sub">ランキングに登録</button>
          <p id="submit-msg" class="note"></p>
        </div>`
            : ''
        }
        <button id="retry" class="primary">もう一度</button>
        <button id="menu" class="sub">メニューへ</button>
      </main>`
    document.getElementById('retry')!.onclick = startGame
    document.getElementById('menu')!.onclick = renderMenu
    const sb = document.getElementById('submit-score') as HTMLButtonElement | null
    if (sb) {
      sb.onclick = async () => {
        const msg = document.getElementById('submit-msg')!
        const name = cleanName((document.getElementById('pname') as HTMLInputElement).value)
        savePlayerName(name)
        sb.disabled = true
        msg.textContent = '送信中…'
        try {
          await submitScore(name, session.score, session.correctCount, session.maxCombo)
          msg.textContent = '登録しました！'
          sb.textContent = '登録済み'
        } catch {
          msg.textContent = '登録に失敗しました。もう一度お試しください'
          sb.disabled = false
        }
      }
    }
  }

  renderMenu()
}
