import type { Bidding, BidMove, GameState, StationKey } from './types'

/**
 * Zasady rundy 3 — licytacja nut (wg TVP, punkty zamiast złotówek):
 * - 6 ponumerowanych zagadek, wybierane naprzemiennie; zaczyna klasa z większą liczbą punktów,
 * - po wybraniu numeru widać wykonawcę, prowadzący czyta podpowiedź,
 * - licytację zaczyna klasa, która NIE wybierała numeru; od 7 nut w dół do 1,
 *   można przebić (mniej nut) albo spasować („Graj, …!”); zejście do 1 nuty kończy licytację,
 * - zgadujący słucha wylicytowanej liczby nut (gra muzyk) i ma 10 s na tytuł,
 * - trafienie: wygrana zagadki + wartość piosenki; pudło: wygrana i wartość dla rywala,
 * - gra do 3 wygranych zagadek, zwycięzca przechodzi do finału.
 */

export const MAX_NOTES = 7
export const WINS_TO_FINAL = 3
export const R3_TILES = 6
export const R3_VALUE = 200
export const R3_BIG_VALUE = 400

export function opponent(gracze: readonly [StationKey, StationKey], k: StationKey): StationKey {
  return gracze[0] === k ? gracze[1] : gracze[0]
}

/** Rundę 3 zaczyna klasa z większą liczbą punktów (przy remisie — niższy numer stanowiska). */
export function firstChooser(points: Record<StationKey, number>, gracze: [StationKey, StationKey]): StationKey {
  const [a, b] = gracze
  if (points[a] !== points[b]) return points[a] > points[b] ? a : b
  return Number(a) < Number(b) ? a : b
}

/** Jakie oferty może teraz złożyć klasa, której jest kolej. */
export function allowedBids(l: Bidding): number[] {
  const top = l.nuty === undefined ? MAX_NOTES : l.nuty - 1
  return Array.from({ length: top }, (_, i) => top - i)
}

/** Czy można spasować („Graj, …!”) — tylko gdy jest już jakaś oferta. */
export function canPass(l: Bidding): boolean {
  return l.nuty !== undefined && l.prowadzi !== undefined
}

export type BidResult =
  | { status: 'invalid'; reason: string }
  | { status: 'continue'; licytacja: Bidding }
  | { status: 'done'; licytacja: Bidding; gra: StationKey; nuty: number }

/** Przetwarza ruch w licytacji. */
export function applyBid(l: Bidding, move: Pick<BidMove, 'stanowisko' | 'nuty' | 'pas'>, gracze: [StationKey, StationKey]): BidResult {
  if (move.stanowisko !== l.kolej) return { status: 'invalid', reason: 'Nie jest kolej tej klasy.' }

  if (move.pas) {
    if (!canPass(l)) return { status: 'invalid', reason: 'Nie można spasować przed pierwszą ofertą.' }
    return { status: 'done', licytacja: l, gra: l.prowadzi!, nuty: l.nuty! }
  }

  const n = move.nuty
  if (n === undefined || !Number.isInteger(n) || !allowedBids(l).includes(n)) {
    return { status: 'invalid', reason: 'Oferta musi być mniejsza od aktualnej (od 7 do 1 nuty).' }
  }
  const next: Bidding = { kolej: opponent(gracze, move.stanowisko), nuty: n, prowadzi: move.stanowisko }
  if (n === 1) return { status: 'done', licytacja: next, gra: move.stanowisko, nuty: 1 }
  return { status: 'continue', licytacja: next }
}

/** Kto przechodzi do finału (pierwszy z 3 wygranymi). */
export function round3Winner(game: GameState): StationKey | undefined {
  const r3 = game.runda3
  if (!r3) return undefined
  return r3.gracze.find((k) => (r3.wygrane[k] ?? 0) >= WINS_TO_FINAL)
}

/** „nutę / nuty / nut” — do zdań typu „Zagraj 3 nuty”. */
export function nut(n: number): string {
  if (n === 1) return 'nutę'
  const last = n % 10
  const lastTwo = n % 100
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'nuty'
  return 'nut'
}

/** „nuta / nuty / nut” — do zdań typu „po 3 nutach”. */
export function poNutach(n: number): string {
  return n === 1 ? 'po 1 nucie' : `po ${n} nutach`
}
