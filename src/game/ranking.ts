export interface RankEntry {
  player_id: string
  name: string
  score: number
}

const URL_BASE = (import.meta.env?.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined

const PLAYER_KEY = 'guesscolor.playerId'
const NAME_KEY = 'guesscolor.playerName'

export const MAX_NAME_LENGTH = 12

export function rankingEnabled(): boolean {
  return Boolean(URL_BASE && ANON_KEY)
}

function headers(): Record<string, string> {
  return {
    apikey: ANON_KEY!,
    Authorization: `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  }
}

export function getPlayerId(): string {
  try {
    let id = localStorage.getItem(PLAYER_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(PLAYER_KEY, id)
    }
    return id
  } catch {
    return 'anonymous'
  }
}

export function getPlayerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // 保存できない環境では無視する
  }
}

export function cleanName(raw: string): string {
  return raw.trim().slice(0, MAX_NAME_LENGTH) || 'ななし'
}

// ユーザーごとの最高スコアだけを残し、スコア降順で並べる
export function bestPerPlayer(rows: RankEntry[], limit: number): RankEntry[] {
  const best = new Map<string, RankEntry>()
  for (const r of rows) {
    const cur = best.get(r.player_id)
    if (!cur || r.score > cur.score) best.set(r.player_id, r)
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit)
}

export async function submitScore(name: string, score: number, correct: number, maxCombo: number): Promise<void> {
  const res = await fetch(`${URL_BASE}/rest/v1/scores`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ player_id: getPlayerId(), name, score, correct, max_combo: maxCombo }),
  })
  if (!res.ok) throw new Error(`submit failed: ${res.status}`)
}

export async function fetchRanking(limit = 10): Promise<RankEntry[]> {
  const res = await fetch(`${URL_BASE}/rest/v1/scores?select=player_id,name,score&order=score.desc&limit=500`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
  return bestPerPlayer((await res.json()) as RankEntry[], limit)
}
