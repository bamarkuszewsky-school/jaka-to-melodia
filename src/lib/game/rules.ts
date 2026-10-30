import { STATION_KEYS, type GameState, type LiveQuestion, type RoundNo, type StationKey } from './types'

/**
 * Zasady rund 1–2 (wg TVP, punkty zamiast złotówek):
 * - piosenka gra łącznie 15 s, pierwszy przycisk = 10 s na tytuł (w TVP 5 s),
 * - runda 1: wartość rośnie 100 → 200 co 10 pkt; po złej odpowiedzi piosenka
 *   od początku, licznik znów od 100,
 * - runda 2: wartość maleje 200 → 100 co 10 pkt; po złej odpowiedzi muzyka gra
 *   dalej, a pozostali walczą o aktualną (już niższą) stawkę.
 */

export const SONG_MS = 15_000
export const ANSWER_MS = 10_000

export const R1_MIN = 100
export const R1_MAX = 200
export const R1_STEP = 10

const STEPS = (R1_MAX - R1_MIN) / R1_STEP

function progress(elapsedMs: number): number {
  return Math.min(Math.max(elapsedMs, 0), SONG_MS) / SONG_MS
}

/** Wartość hasła w rundzie 1 po `elapsedMs` grania: 100 → 200 co 10 pkt. */
export function round1Value(elapsedMs: number): number {
  return R1_MIN + Math.floor(progress(elapsedMs) * STEPS) * R1_STEP
}

/** Wartość hasła w rundzie 2: 200 → 100 co 10 pkt (co 1,5 s). */
export function round2Value(elapsedMs: number): number {
  return R1_MAX - Math.floor(progress(elapsedMs) * STEPS) * R1_STEP
}

export function roundValue(runda: RoundNo, elapsedMs: number): number {
  return runda === 2 ? round2Value(elapsedMs) : round1Value(elapsedMs)
}

/** Ile hasła ma runda. */
export const TILES_PER_ROUND: Record<RoundNo, number> = { 1: 5, 2: 3 }

/** Czy po złej odpowiedzi piosenka gra dalej (runda 2), czy od początku (runda 1). */
export function resumesAfterWrong(runda: RoundNo): boolean {
  return runda === 2
}

/** Ile ms piosenki już zagrało (z wznowieniami). */
export function elapsedOf(p: Pick<LiveQuestion, 'start' | 'przesuniecie'>, now: number): number {
  if (p.start === undefined) return p.przesuniecie ?? 0
  return (p.przesuniecie ?? 0) + Math.max(0, now - p.start)
}

/** Ile zostało czasu (w ms, od 0 do totalMs). */
export function remaining(totalMs: number, startedAt: number | undefined, now: number): number {
  if (startedAt === undefined) return totalMs
  return Math.min(totalMs, Math.max(0, totalMs - (now - startedAt)))
}

/** Pełne sekundy do wyświetlenia (10, 9, … 1, 0). */
export function secondsLeft(ms: number): number {
  return Math.ceil(ms / 1000)
}

// ---------- Kolejność i eliminacja ----------

/** Rundę 2 zaczyna stanowisko z najmniejszą liczbą punktów (przy remisie — niższy numer). */
export function lowestStation(points: Record<StationKey, number>): StationKey {
  return [...STATION_KEYS].sort((a, b) => points[a] - points[b] || Number(a) - Number(b))[0]
}

export type Elimination =
  | { status: 'decided'; odpada: StationKey; awans: StationKey[] }
  | { status: 'dogrywka'; contenders: StationKey[]; safe: StationKey[]; chooser?: StationKey }

/**
 * Kto odpada po rundzie 2. Najmniej punktów = odpada.
 * Remis na dole → dogrywka między remisującymi; zwycięzca dogrywki (awans) przechodzi dalej.
 * Kategorię dogrywki wybiera bezpieczny gracz z największą liczbą punktów.
 */
export function elimination(
  points: Record<StationKey, number>,
  awans: Partial<Record<StationKey, true>> = {},
): Elimination {
  const remainingKeys = STATION_KEYS.filter((k) => !awans[k])
  const min = Math.min(...remainingKeys.map((k) => points[k]))
  const bottom = remainingKeys.filter((k) => points[k] === min)

  if (bottom.length === 1) {
    const odpada = bottom[0]
    return { status: 'decided', odpada, awans: STATION_KEYS.filter((k) => k !== odpada) }
  }

  const safe = STATION_KEYS.filter((k) => !bottom.includes(k))
  const chooser = [...safe].sort((a, b) => points[b] - points[a] || Number(a) - Number(b))[0]
  return { status: 'dogrywka', contenders: bottom, safe, chooser }
}

// ---------- Pomocnicze odczyty stanu ----------

export function roundState(game: GameState, runda: RoundNo) {
  return runda === 2 ? game.runda2 : game.runda1
}

/** Czy wszystkie zwykłe hasła rundy są już rozegrane. */
export function roundTilesDone(game: GameState, runda: RoundNo): boolean {
  const r = roundState(game, runda)
  return Boolean(r && r.hasla.length > 0 && r.hasla.every((t) => t.stan !== 'ukryte'))
}

/** Kto teraz wybiera hasło (w dogrywce — bezpieczny gracz). */
export function currentChooser(game: GameState): StationKey | undefined {
  if (game.runda === 2 && game.runda2 && roundTilesDone(game, 2) && !game.runda2.odpada) {
    const e = elimination(game.punkty, game.runda2.awans)
    if (e.status === 'dogrywka') return e.chooser
    return undefined
  }
  return game.runda === 2 ? game.runda2?.wybiera : game.runda1?.wybiera
}
