export const CONFIG = {
  initialTimeSec: 30,
  passPenaltySec: 1,
  scorePerCorrect: 100,
  comboBonus: 10,
  // 通常時に1色問題が出る確率（残りは2色）
  oneColorRate: 0.75,
  // このコンボ数ごとに3色問題が出る
  threeColorEvery: 10,
} as const
