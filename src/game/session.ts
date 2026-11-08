import { CONFIG } from './config'
import { normalize } from './normalize'
import { answersFor, buildQuestionPool, pickQuestion } from './question'
import type { GamePhase, Pokemon, Question } from './types'

export type AnswerResult = 'correct' | 'wrong' | 'duplicate'

export class GameSession {
  phase: GamePhase = 'idle'
  timeLeftSec: number = CONFIG.initialTimeSec
  score = 0
  correctCount = 0
  combo = 0
  maxCombo = 0
  question!: Question

  private pool2: Question[]
  private pool3: Question[]
  private used = new Set<number>()

  private pokemons: Pokemon[]
  private random: () => number

  constructor(pokemons: Pokemon[], random: () => number = Math.random) {
    this.pokemons = pokemons
    this.random = random
    this.pool2 = buildQuestionPool(pokemons, 2)
    this.pool3 = buildQuestionPool(pokemons, 3)
  }

  start(): void {
    this.phase = 'playing'
    this.timeLeftSec = CONFIG.initialTimeSec
    this.score = 0
    this.correctCount = 0
    this.combo = 0
    this.maxCombo = 0
    this.used.clear()
    this.nextQuestion()
  }

  tick(deltaSec: number): void {
    if (this.phase !== 'playing') return
    this.timeLeftSec = Math.max(0, this.timeLeftSec - deltaSec)
    if (this.timeLeftSec === 0) this.phase = 'finished'
  }

  // 不正解にペナルティはない（コンボも維持）
  answer(input: string): AnswerResult {
    if (this.phase !== 'playing') return 'wrong'
    const target = normalize(input)
    const hit = answersFor(this.pokemons, this.question.colors).find(
      (p) => normalize(p.name) === target,
    )
    if (!hit) return 'wrong'
    if (this.used.has(hit.id)) return 'duplicate'

    this.used.add(hit.id)
    this.correctCount++
    this.combo++
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    this.score += CONFIG.scorePerCorrect + (this.combo - 1) * CONFIG.comboBonus
    this.timeLeftSec += CONFIG.correctBonusSec
    this.nextQuestion()
    return 'correct'
  }

  pass(): void {
    if (this.phase !== 'playing') return
    this.combo = 0
    this.timeLeftSec = Math.max(0, this.timeLeftSec - CONFIG.passPenaltySec)
    if (this.timeLeftSec === 0) {
      this.phase = 'finished'
      return
    }
    this.nextQuestion()
  }

  private nextQuestion(): void {
    const useThree = this.combo >= CONFIG.threeColorCombo && this.pool3.length > 0
    const pool = useThree || this.pool2.length === 0 ? this.pool3 : this.pool2
    this.question = pickQuestion(pool, this.question, this.random)
  }
}
