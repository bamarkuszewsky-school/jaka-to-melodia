import type { FinalSong, Round4State } from './types'

/**
 * Finał (runda 4) wg TVP, punkty zamiast złotówek:
 * - 30 s na 7 melodii, zegar rusza z pierwszą melodią,
 * - przycisk zatrzymuje zegar i muzykę; zawodnik podaje tytuł albo prosi o następną melodię,
 * - po przejściu wszystkich można wracać do pominiętych, dopóki jest czas,
 * - 250 pkt za każdą odgadniętą melodię, komplet 7/7 = bonus i tytuł mistrza edycji,
 * - zła odpowiedź kończy finał (zdobyte punkty zostają),
 * - gdy zegar dojdzie do zera, zawodnik ma jeszcze jedną (ostatnią) szansę na odpowiedź.
 */

export const FINAL_SONGS = 7
export const FINAL_MS = 30_000
export const FINAL_POINTS = 250
export const FINAL_BONUS = 1000

/** Ile ms zostało na zegarze. */
export function clockLeft(r: Pick<Round4State, 'faza' | 'czasZostal' | 'start'>, now: number): number {
  if (r.faza === 'gra' && r.start !== undefined) return Math.max(0, r.czasZostal - Math.max(0, now - r.start))
  return Math.max(0, r.czasZostal)
}

/** Zegar w formacie 29,4 (sekundy z dziesiątymi). */
export function formatClock(ms: number): string {
  return (Math.ceil(ms / 100) / 10).toFixed(1).replace('.', ',')
}

/**
 * Następna melodia po `current`: najpierw kolejne, których jeszcze nie grano,
 * potem pominięte (od początku listy). Brak = wszystkie rozstrzygnięte.
 */
export function nextSong(songs: FinalSong[], current: number): number | undefined {
  const n = songs.length
  for (let step = 1; step <= n; step++) {
    const i = (current + step) % n
    if (songs[i].stan === 'czeka' && i > current) return i
  }
  for (let step = 1; step <= n; step++) {
    const i = (current + step) % n
    if (songs[i].stan === 'czeka') return i
  }
  for (let step = 1; step <= n; step++) {
    const i = (current + step) % n
    if (songs[i].stan === 'pominieta') return i
  }
  return undefined
}

export function guessedCount(songs: FinalSong[]): number {
  return songs.filter((s) => s.stan === 'odgadnieta').length
}
