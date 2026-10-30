/**
 * Oś czasu czołówki — ułożona pod podkład z folderu edycji (17,5 s, ok. 152 BPM).
 * Czasy bitów zostały odczytane z nagrania; jeśli zmienicie podkład, trzeba je
 * zmierzyć na nowo (np. w Audacity: Analiza → Wykrywanie rytmu).
 */

export const INTRO_LENGTH = 17.5

/** Bity podkładu (s). */
export const BEATS = [
  0.28, 0.67, 1.07, 1.46, 1.83, 2.21, 2.58, 2.97, 3.34, 3.74, 4.13, 4.5, 4.9, 5.29, 5.69, 6.06, 6.46, 6.83, 7.22,
  7.59, 7.99, 8.38, 8.75, 9.15, 9.52, 9.91, 10.29, 10.66, 11.05, 11.42, 11.82, 12.21, 12.59, 12.98, 13.35, 13.72,
  14.09, 14.49, 14.86, 15.26, 15.65, 16.11, 16.58, 17.0,
]

/** Najważniejsze momenty muzyki. */
export const MOMENTS = {
  owlAppears: 3.34,
  drop: 5.09,
  words: [6.06, 6.46, 6.83, 7.22],
  subtitle: 7.99,
  glitchFrom: 9.52,
  glitchTo: 15.26,
  finalHits: [16.11, 16.58, 17.0],
  fadeOut: 17.15,
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

/** 0 → 1 między `from` a `to`. */
export const ramp = (t: number, from: number, to: number) => clamp((t - from) / (to - from))

export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/** Sprężyste „wskoczenie” (lekko przestrzeliwuje i wraca do 1). */
export const easeBack = (x: number) => {
  const c1 = 1.9
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

/** Impuls po ostatnim bicie: 1 w chwili bitu, gaśnie w ~0,25 s. */
export function beatPulse(t: number, beats: readonly number[] = BEATS, decay = 0.12): number {
  let last = -Infinity
  for (const b of beats) {
    if (b <= t) last = b
    else break
  }
  return t - last < 1 ? Math.exp(-(t - last) / decay) : 0
}

/** Numer ostatniego bitu (do „losowania” wysokości słupków equalizera). */
export function beatIndex(t: number): number {
  let i = -1
  for (const b of BEATS) {
    if (b <= t) i++
    else break
  }
  return i
}

/** Powtarzalna pseudolosowość (ta sama na każdym urządzeniu). */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
