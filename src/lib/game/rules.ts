/**
 * Zasady rundy 1 (wg TVP, punkty zamiast złotówek):
 * - piosenka gra dokładnie 15 s, wartość rośnie od 100 do 200 pkt co 10 pkt,
 * - kto pierwszy wciśnie przycisk, ma 10 s na tytuł (w TVP 5 s),
 * - zła odpowiedź: zawodnik zablokowany do końca piosenki, piosenka od początku,
 *   licznik znów od 100.
 */

export const SONG_MS = 15_000
export const ANSWER_MS = 10_000

export const R1_MIN = 100
export const R1_MAX = 200
export const R1_STEP = 10

/** Wartość hasła w rundzie 1 po `elapsedMs` grania: 100 → 200 co 10 pkt. */
export function round1Value(elapsedMs: number): number {
  const t = Math.min(Math.max(elapsedMs, 0), SONG_MS) / SONG_MS
  const steps = (R1_MAX - R1_MIN) / R1_STEP
  return R1_MIN + Math.floor(t * steps) * R1_STEP
}

/** Ile zostało czasu (w ms, nie mniej niż 0). */
export function remaining(totalMs: number, startedAt: number | undefined, now: number): number {
  if (startedAt === undefined) return totalMs
  return Math.min(totalMs, Math.max(0, totalMs - (now - startedAt)))
}

/** Pełne sekundy do wyświetlenia (10, 9, … 1, 0). */
export function secondsLeft(ms: number): number {
  return Math.ceil(ms / 1000)
}
