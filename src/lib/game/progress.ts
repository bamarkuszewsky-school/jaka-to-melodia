import { guessedCount } from './rules4'
import { WINS_TO_FINAL } from './rules3'
import type { GameState, StationKey } from './types'

/** Postęp edycji — rundy po kolei (koordynator, panel za sceną). */

export type StepState = 'czeka' | 'trwa' | 'koniec'

export interface RoundStep {
  runda: 1 | 2 | 3 | 4
  nazwa: string
  stan: StepState
  /** Ile już rozegrano w rundzie: „3/5 haseł”, „2:1”, „4/7”. */
  opis?: string
}

const NAMES = { 1: 'Runda 1', 2: 'Runda 2', 3: 'Runda 3', 4: 'Finał' } as const

export function editionSteps(game: GameState): RoundStep[] {
  const now = game.runda ?? 0
  const stan = (r: number): StepState => (now > r ? 'koniec' : now === r ? 'trwa' : 'czeka')
  const tiles = (list?: { stan: string }[]) => (list ? `${list.filter((t) => t.stan !== 'ukryte').length}/${list.length} haseł` : undefined)
  const r3 = game.runda3
  const r4 = game.runda4
  return [
    { runda: 1, nazwa: NAMES[1], stan: stan(1), opis: tiles(game.runda1?.hasla) },
    { runda: 2, nazwa: NAMES[2], stan: stan(2), opis: tiles(game.runda2?.hasla) },
    {
      runda: 3,
      nazwa: NAMES[3],
      stan: stan(3),
      opis: r3 ? r3.gracze.map((k) => r3.wygrane[k] ?? 0).join(':') + ` (do ${WINS_TO_FINAL})` : undefined,
    },
    {
      runda: 4,
      nazwa: NAMES[4],
      stan: r4?.faza === 'koniec' ? 'koniec' : stan(4),
      opis: r4 ? `${guessedCount(r4.utwory)}/7 melodii` : undefined,
    },
  ]
}

/** Co dzieje się teraz na scenie — jedno zdanie dla koordynatora. */
export function stageStatus(game: GameState, label: (k: StationKey) => string, introActive: boolean): string {
  if (game.czolowka && introActive) return 'Leci czołówka'
  if (game.runda === undefined) return 'Gra nie trwa — czekamy na start rundy 1'
  if (game.zapowiedz && introActive) return `Intro: ${NAMES[game.zapowiedz.runda as 1 | 2 | 3 | 4] ?? 'runda'}`
  if (game.runda === 4 && game.runda4) {
    const r = game.runda4
    if (r.faza === 'gotowe') return `Finał — ${label(r.gracz)} czeka na start`
    if (r.faza === 'gra') return `Finał trwa — ${label(r.gracz)} słucha`
    if (r.faza === 'stop') return `Finał — ${label(r.gracz)} odpowiada`
    return `Finał zakończony — ${label(r.gracz)}`
  }
  if (game.runda === 3 && game.runda3) {
    const p = game.pytanie3
    if (game.runda3.zwyciezca) return `Do finału przechodzi ${label(game.runda3.zwyciezca)}`
    if (!p) return `Runda 3 — numer wybiera ${label(game.runda3.wybiera)}`
    if (p.faza === 'licytacja') return 'Runda 3 — licytacja nut'
    if (p.faza === 'granie') return `Runda 3 — muzyk gra${p.nuty ? ` ${p.nuty}` : ''} nut`
    if (p.faza === 'odpowiedz' && p.gra) return `Runda 3 — odpowiada ${label(p.gra)}`
    return 'Runda 3 — odsłonięte'
  }
  const r = game.runda === 2 ? game.runda2 : game.runda1
  const p = game.pytanie
  const name = `Runda ${game.runda}`
  if (game.runda === 2 && game.runda2?.odpada) return `Runda 2 zakończona — odpada ${label(game.runda2.odpada)}`
  if (!p) return r?.wybiera ? `${name} — hasło wybiera ${label(r.wybiera)}` : name
  if (p.faza === 'wybrane') return `${name} — hasło ${p.haslo + 1} wybrane${p.dogrywka ? ' (dogrywka)' : ''}`
  if (p.faza === 'gra') return `${name} — muzyka gra`
  if (p.faza === 'odpowiedz' && p.odpowiada) return `${name} — odpowiada ${label(p.odpowiada)}`
  return `${name} — odsłonięte`
}
