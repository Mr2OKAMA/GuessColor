export type Sfx = 'tap' | 'correct' | 'wrong' | 'duplicate' | 'pass' | 'finish'

const MUTE_KEY = 'guesscolor.muted'

// C, D, E, G, A のペンタトニックで構成した8小節ループ（周波数Hz）
const N = { C4: 262, D4: 294, E4: 330, G4: 392, A4: 440, C5: 523, D5: 587, E5: 659, G5: 784 }
const MELODY: (number | 0)[] = [
  N.C5, N.E5, N.G5, N.E5, N.D5, N.G4, N.A4, 0,
  N.C5, N.D5, N.E5, N.G5, N.E5, N.D5, N.C5, 0,
  N.A4, N.C5, N.D5, N.E5, N.D5, N.C5, N.A4, 0,
  N.G4, N.A4, N.C5, N.D5, N.E5, N.D5, N.C5, 0,
]
const BASS: number[] = [131, 131, 98, 98, 110, 110, 98, 98]
const STEP_SEC = 0.2

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export class AudioManager {
  muted = loadMuted()
  private ctx?: AudioContext
  private master?: GainNode
  private bgmTimer?: number
  private step = 0
  private nextTime = 0

  // ブラウザの制限により、ユーザー操作の中で呼ぶ必要がある
  private ensure(): AudioContext | undefined {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as any).webkitAudioContext
      if (!Ctor) return undefined
      this.ctx = new Ctor() as AudioContext
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 1
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, at)
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    osc.connect(g).connect(this.master)
    osc.start(at)
    osc.stop(at + dur + 0.02)
  }

  sfx(kind: Sfx): void {
    const ctx = this.ensure()
    if (!ctx || this.muted) return
    const t = ctx.currentTime
    switch (kind) {
      case 'tap':
        this.tone(660, t, 0.07, 'square', 0.12)
        break
      case 'correct':
        this.tone(N.C5, t, 0.12, 'triangle', 0.3)
        this.tone(N.E5, t + 0.08, 0.12, 'triangle', 0.3)
        this.tone(N.G5, t + 0.16, 0.22, 'triangle', 0.3)
        break
      case 'wrong':
        this.tone(200, t, 0.18, 'sawtooth', 0.18)
        this.tone(150, t + 0.1, 0.22, 'sawtooth', 0.18)
        break
      case 'duplicate':
        this.tone(330, t, 0.1, 'square', 0.15)
        this.tone(330, t + 0.14, 0.1, 'square', 0.15)
        break
      case 'pass':
        this.tone(400, t, 0.1, 'triangle', 0.2)
        this.tone(300, t + 0.08, 0.14, 'triangle', 0.2)
        break
      case 'finish':
        ;[N.G5, N.E5, N.C5, N.G4].forEach((f, i) => this.tone(f, t + i * 0.16, 0.3, 'triangle', 0.3))
        break
    }
  }

  startBgm(): void {
    const ctx = this.ensure()
    if (!ctx || this.bgmTimer !== undefined) return
    this.step = 0
    this.nextTime = ctx.currentTime + 0.1
    const schedule = (): void => {
      while (this.nextTime < ctx.currentTime + 0.5) {
        const note = MELODY[this.step % MELODY.length]
        if (note) this.tone(note, this.nextTime, STEP_SEC * 0.9, 'triangle', 0.09)
        if (this.step % 4 === 0) {
          const bass = BASS[(this.step / 4) % BASS.length]
          this.tone(bass, this.nextTime, STEP_SEC * 3.6, 'sine', 0.12)
        }
        this.nextTime += STEP_SEC
        this.step++
      }
    }
    schedule()
    this.bgmTimer = window.setInterval(schedule, 100)
  }

  stopBgm(): void {
    if (this.bgmTimer !== undefined) clearInterval(this.bgmTimer)
    this.bgmTimer = undefined
  }

  get playingBgm(): boolean {
    return this.bgmTimer !== undefined
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02)
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      // 保存できない環境では無視する
    }
  }

  suspend(): void {
    void this.ctx?.suspend()
  }

  resume(): void {
    if (this.ctx) void this.ctx.resume()
  }
}
