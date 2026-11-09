export const CONFIG = {
  initialTimeSec: 30,
  passPenaltySec: 1,
  scorePerCorrect: 100,
  comboBonus: 10,
  // 出題された色数ごとの得点倍率
  colorCountMultiplier: { 1: 1, 2: 5, 3: 10 } as Record<number, number>,
  // 通常時に1色問題が出る確率（残りは2色）
  oneColorRate: 0.75,
  // このコンボ数ごとに3色問題が出る
  threeColorEvery: 10,
} as const
