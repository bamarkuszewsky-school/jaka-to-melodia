import { ref, remove, serverTimestamp, set, update } from 'firebase/database'
import { db } from '../firebase'
import { elapsedOf, lowestStation, resumesAfterWrong, roundValue } from './rules'
import { STATION_KEYS, type GameState, type Question, type RoundNo, type StationKey } from './types'

/**
 * Akcje prowadzącego. Zapisuje tylko host (pilnują tego reguły bazy).
 * Tytuły i wykonawcy trafiają do bazy dopiero przy odsłonięciu.
 */

const gra = (path = '') => ref(db, path ? `gra/${path}` : 'gra')

const hiddenTiles = (questions: Question[]) => questions.map((q) => ({ haslo: q.haslo, stan: 'ukryte' }))

/** Nowa gra: zeruje punkty i wykłada hasła rundy 1 (bez odpowiedzi). */
export function startRound1(questions: Question[], wybiera: StationKey = '1'): Promise<void> {
  return update(gra(), {
    runda: 1,
    punkty: { '1': 0, '2': 0, '3': 0 },
    runda1: { hasla: hiddenTiles(questions), wybiera },
    runda2: null,
    pytanie: null,
    zgloszenie: null,
  })
}

/** Runda 2: punkty zostają, zaczyna stanowisko z najmniejszą liczbą punktów. */
export function startRound2(game: GameState, questions: Question[], dogrywki: Question[]): Promise<void> {
  return update(gra(), {
    runda: 2,
    runda2: {
      hasla: hiddenTiles(questions),
      dogrywki: dogrywki.length ? hiddenTiles(dogrywki) : null,
      wybiera: lowestStation(game.punkty),
    },
    pytanie: null,
    zgloszenie: null,
  })
}

export function setChooser(runda: RoundNo, stanowisko: StationKey): Promise<void> {
  return set(gra(`runda${runda}/wybiera`), stanowisko)
}

/** Host klika kafelek na tablicy (zwykłe hasło albo dogrywkę). */
export function selectTile(
  runda: RoundNo,
  index: number,
  dogrywka?: { poza: StationKey[] },
): Promise<void> {
  const poza = dogrywka ? Object.fromEntries(dogrywka.poza.map((k) => [k, true])) : null
  return update(gra(), {
    pytanie: {
      runda,
      haslo: index,
      faza: 'wybrane',
      ...(dogrywka ? { dogrywka: true, poza, zablokowane: poza } : {}),
    },
    zgloszenie: null,
  })
}

/** Host cofa wybór kafelka, zanim piosenka zagra. */
export function cancelTile(): Promise<void> {
  return update(gra(), { pytanie: null, zgloszenie: null })
}

/** Muzyka startuje (od początku albo wznawia po złej odpowiedzi w rundzie 2). */
export function songStarted(): Promise<void> {
  return update(gra(), {
    'pytanie/faza': 'gra',
    'pytanie/start': serverTimestamp(),
    'pytanie/odpowiada': null,
    'pytanie/wartosc': null,
    'pytanie/odpowiedzStart': null,
    zgloszenie: null,
  })
}

/** Minęło 15 s i nikt się nie zgłosił. */
export function songTimedOut(): Promise<void> {
  return update(gra(), { 'pytanie/faza': 'brak' })
}

/**
 * Ktoś wcisnął przycisk. Wartość liczymy z czasów serwera
 * (start piosenki → zgłoszenie), więc jest uczciwa niezależnie od opóźnień.
 */
export function buzzAccepted(state: GameState): Promise<void> {
  const { pytanie, zgloszenie } = state
  if (!pytanie || !zgloszenie || pytanie.start === undefined) return Promise.resolve()
  const grane = elapsedOf(pytanie, zgloszenie.czas)
  return update(gra(), {
    'pytanie/faza': 'odpowiedz',
    'pytanie/odpowiada': zgloszenie.stanowisko,
    'pytanie/grane': grane,
    'pytanie/wartosc': pytanie.dogrywka ? 0 : roundValue(pytanie.runda, grane),
    'pytanie/odpowiedzStart': serverTimestamp(),
  })
}

function tilePath(state: GameState): string | null {
  const p = state.pytanie
  if (!p) return null
  return `runda${p.runda}/${p.dogrywka ? 'dogrywki' : 'hasla'}/${p.haslo}`
}

/**
 * Dobra odpowiedź: punkty (albo awans w dogrywce), odsłonięcie,
 * odgadujący wybiera następne hasło.
 */
export function markCorrect(state: GameState, q: Question): Promise<void> {
  const { pytanie } = state
  const path = tilePath(state)
  if (!pytanie?.odpowiada || pytanie.wartosc === undefined || !path) return Promise.resolve()
  const s = pytanie.odpowiada
  const points = pytanie.dogrywka ? 0 : pytanie.wartosc

  const changes: Record<string, unknown> = {
    [path]: {
      haslo: q.haslo,
      stan: 'odgadniete',
      stanowisko: s,
      punkty: points,
      tytul: q.tytul,
      wykonawca: q.wykonawca,
    },
    'pytanie/faza': 'odslona',
    'pytanie/wynik': { stanowisko: s, punkty: points, tytul: q.tytul, wykonawca: q.wykonawca },
    zgloszenie: null,
  }
  if (pytanie.dogrywka) {
    changes[`runda${pytanie.runda}/awans/${s}`] = true
  } else {
    changes[`punkty/${s}`] = state.punkty[s] + points
    changes[`runda${pytanie.runda}/wybiera`] = s
  }
  return update(gra(), changes)
}

/**
 * Zła odpowiedź: zawodnik zablokowany do końca piosenki.
 * Runda 1: piosenka od początku (licznik znów od 100).
 * Runda 2: muzyka gra dalej od miejsca zatrzymania (stawka dalej maleje).
 * Zwraca true, jeśli ktoś jeszcze może grać (wtedy host puszcza muzykę).
 */
export async function markWrong(state: GameState): Promise<boolean> {
  const { pytanie } = state
  if (!pytanie?.odpowiada) return false
  const blocked = { ...(pytanie.zablokowane ?? {}), [pytanie.odpowiada]: true as const }
  const anyoneLeft = STATION_KEYS.some((k) => !blocked[k])
  const resume = resumesAfterWrong(pytanie.runda)
  await update(gra(), {
    'pytanie/zablokowane': blocked,
    'pytanie/faza': anyoneLeft ? 'wybrane' : 'brak',
    'pytanie/przesuniecie': resume ? (pytanie.grane ?? 0) : null,
    'pytanie/start': null,
    'pytanie/odpowiada': null,
    'pytanie/wartosc': null,
    'pytanie/odpowiedzStart': null,
    zgloszenie: null,
  })
  return anyoneLeft
}

/** Nikt nie zgadł — odsłaniamy tytuł. */
export function revealUnsolved(state: GameState, q: Question): Promise<void> {
  const path = tilePath(state)
  if (!path) return Promise.resolve()
  return update(gra(), {
    [path]: { haslo: q.haslo, stan: 'nieodgadniete', tytul: q.tytul, wykonawca: q.wykonawca },
    'pytanie/faza': 'odslona',
    'pytanie/wynik': { tytul: q.tytul, wykonawca: q.wykonawca },
    zgloszenie: null,
  })
}

/** Powrót do tablicy haseł. */
export function closeQuestion(): Promise<void> {
  return update(gra(), { pytanie: null, zgloszenie: null })
}

/** Ogłoszenie wyników rundy 2: kto odpada. */
export function announceRound2(odpada: StationKey): Promise<void> {
  return set(gra('runda2/odpada'), odpada)
}

/** Cofnięcie ogłoszenia (pomyłka). */
export function undoAnnounceRound2(): Promise<void> {
  return remove(gra('runda2/odpada'))
}

/** Ręczna korekta punktów (np. pomyłka prowadzącego). */
export function adjustScore(state: GameState, s: StationKey, delta: number): Promise<void> {
  return set(gra(`punkty/${s}`), Math.max(0, state.punkty[s] + delta))
}

/** Czyści całą grę (punkty, rundy, pytanie). Nazwy klas zostają. */
export function resetGame(): Promise<void> {
  return update(gra(), {
    runda: null,
    runda1: null,
    runda2: null,
    runda3: null,
    pytanie: null,
    pytanie3: null,
    ruch: null,
    zagrane: null,
    zgloszenie: null,
    punkty: { '1': 0, '2': 0, '3': 0 },
  })
}

/** Czołówka startuje — tablica i OBS liczą animację od tej chwili. */
export function startIntro(dlugoscMs: number): Promise<void> {
  return set(gra('czolowka'), { start: serverTimestamp(), dlugosc: Math.round(dlugoscMs) })
}

export function stopIntro(): Promise<void> {
  return remove(gra('czolowka'))
}
