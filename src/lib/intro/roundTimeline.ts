/**
 * Oś czasu intra rundy — pod plik „Jaka to melodia runda intro” z folderu SYSTEMOWE (6,1 s).
 * Dwa mocne uderzenia: numer rundy wskakuje na pierwszym, podtytuł na drugim.
 */
export const ROUND_INTRO_LENGTH = 6.1

export const ROUND_BEATS = [0.18, 0.73, 1.18, 1.64, 1.87, 2.79, 3.02, 3.24, 3.48, 3.69, 3.92, 4.38, 4.82, 5.28, 5.53]
export const ROUND_HITS = { number: 1.87, subtitle: 3.92, fadeOut: 5.55 }

export const ROUND_TITLES: Record<number, { label: string; number?: string; subtitle: string }> = {
  1: { label: 'Runda', number: '1', subtitle: 'Im szybciej, tym więcej punktów' },
  2: { label: 'Runda', number: '2', subtitle: 'Stawka maleje z każdą sekundą' },
  3: { label: 'Runda', number: '3', subtitle: 'Licytacja nut' },
  4: { label: 'Wielki', number: 'FINAŁ', subtitle: '7 melodii w 30 sekund' },
}
