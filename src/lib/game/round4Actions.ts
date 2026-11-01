import { ref, serverTimestamp, set, update } from 'firebase/database'
import { db } from '../firebase'
import { clockLeft, FINAL_BONUS, FINAL_MS, FINAL_POINTS, FINAL_SONGS, guessedCount, nextSong } from './rules4'
import type { FinalQuestion, FinalSong, GameState, StationKey } from './types'

/**
 * Akcje finału. Muzyka gra z MacBooka hosta; zegar liczy się z czasów serwera,
 * więc tablica, iPad i OBS pokazują to samo. iPad finalisty zapisuje tylko /gra/stop4.
 */

const gra = (path = '') => ref(db, path ? `gra/${path}` : 'gra')

export function startRound4(game: GameState): Promise<void> {
  const gracz = game.runda3?.zwyciezca
  if (!gracz) return Promise.resolve()
  return update(gra(), {
    runda: 4,
    runda4: {
      gracz,
      utwory: Array.from({ length: FINAL_SONGS }, () => ({ stan: 'czeka' })),
      biezacy: 0,
      faza: 'gotowe',
      czasZostal: FINAL_MS,
      zdobyte: 0,
    },
    pytanie3: null,
    ruch: null,
    zagrane: null,
    stop4: null,
  })
}

/** Zegar (i muzyka) rusza: start finału albo kolejna melodia. */
export function clockRun(biezacy: number, czasZostal: number): Promise<void> {
  return update(gra(), {
    'runda4/biezacy': biezacy,
    'runda4/faza': 'gra',
    'runda4/czasZostal': czasZostal,
    'runda4/start': serverTimestamp(),
    'runda4/odpowiedzStart': null,
    'runda4/ostatnia': null,
    stop4: null,
  })
}

/**
 * Zatrzymanie zegara: przycisk finalisty (czas z /gra/stop4) albo koniec czasu.
 * Zapisujemy, ile zostało, i zaczynamy odliczanie na odpowiedź.
 */
export function clockStop(game: GameState, at: number, ostatnia = false): Promise<void> {
  const r = game.runda4
  if (!r || r.faza !== 'gra') return Promise.resolve()
  return update(gra(), {
    'runda4/faza': 'stop',
    'runda4/czasZostal': ostatnia ? 0 : clockLeft(r, at),
    'runda4/start': null,
    'runda4/odpowiedzStart': serverTimestamp(),
    'runda4/ostatnia': ostatnia || null,
    stop4: null,
  })
}

function revealAll(songs: FinalSong[], questions: FinalQuestion[]): FinalSong[] {
  return songs.map((s, i) => ({ ...s, tytul: questions[i]?.tytul, wykonawca: questions[i]?.wykonawca }))
}

type Next = { kind: 'play'; index: number; czasZostal: number } | { kind: 'end' }

/**
 * Dobra odpowiedź: +250 pkt. Komplet 7/7 = bonus i koniec.
 * Zwraca, czy grać następną melodię (host wtedy ją puszcza).
 */
export async function finalCorrect(game: GameState, questions: FinalQuestion[]): Promise<Next> {
  const r = game.runda4
  if (!r) return { kind: 'end' }
  const q = questions[r.biezacy]
  const songs = r.utwory.map((s, i) =>
    i === r.biezacy ? { stan: 'odgadnieta' as const, tytul: q?.tytul, wykonawca: q?.wykonawca } : s,
  )
  const all = guessedCount(songs) === FINAL_SONGS
  const zdobyte = r.zdobyte + FINAL_POINTS + (all ? FINAL_BONUS : 0)
  const next = all || r.ostatnia || r.czasZostal <= 0 ? undefined : nextSong(songs, r.biezacy)

  const changes: Record<string, unknown> = {
    'runda4/utwory': next === undefined ? revealAll(songs, questions) : songs,
    'runda4/zdobyte': zdobyte,
    [`punkty/${r.gracz}`]: game.punkty[r.gracz] + FINAL_POINTS + (all ? FINAL_BONUS : 0),
  }
  if (next === undefined) {
    changes['runda4/faza'] = 'koniec'
    changes['runda4/wynik'] = all ? 'komplet' : 'czas'
    if (all) changes['runda4/bonus'] = FINAL_BONUS
    changes['runda4/odpowiedzStart'] = null
  }
  await update(gra(), changes)
  return next === undefined ? { kind: 'end' } : { kind: 'play', index: next, czasZostal: r.czasZostal }
}

/** „Dalej” — melodia pominięta, gramy następną (o ile jest czas). */
export async function finalSkip(game: GameState, questions: FinalQuestion[]): Promise<Next> {
  const r = game.runda4
  if (!r || r.ostatnia) return { kind: 'end' }
  const songs = r.utwory.map((s, i) => (i === r.biezacy ? { stan: 'pominieta' as const } : s))
  const next = nextSong(songs, r.biezacy)
  if (next === undefined || r.czasZostal <= 0) {
    await update(gra(), {
      'runda4/utwory': revealAll(songs, questions),
      'runda4/faza': 'koniec',
      'runda4/wynik': 'czas',
    })
    return { kind: 'end' }
  }
  await set(gra('runda4/utwory'), songs)
  return { kind: 'play', index: next, czasZostal: r.czasZostal }
}

/** Zła odpowiedź (albo brak odpowiedzi) — koniec finału, punkty zostają. */
export function finalWrong(game: GameState, questions: FinalQuestion[]): Promise<void> {
  const r = game.runda4
  if (!r) return Promise.resolve()
  const songs = r.utwory.map((s, i) => (i === r.biezacy ? { stan: 'zla' as const } : s))
  return update(gra(), {
    'runda4/utwory': revealAll(songs, questions),
    'runda4/faza': 'koniec',
    'runda4/wynik': 'blad',
    'runda4/odpowiedzStart': null,
  })
}

// ---------- iPad finalisty ----------

export function finalistStop(stanowisko: StationKey): Promise<void> {
  return set(gra('stop4'), { stanowisko, czas: serverTimestamp() })
}
