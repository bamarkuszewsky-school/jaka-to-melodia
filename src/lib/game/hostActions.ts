import { ref, remove, serverTimestamp, set, update } from 'firebase/database'
import { db } from '../firebase'
import { round1Value } from './rules'
import { STATION_KEYS, type GameState, type Round1Question, type StationKey } from './types'

/**
 * Akcje prowadzącego. Zapisuje tylko host (pilnują tego reguły bazy).
 * Tytuły i wykonawcy trafiają do bazy dopiero przy odsłonięciu.
 */

const gra = (path = '') => ref(db, path ? `gra/${path}` : 'gra')

/** Nowa gra: zeruje punkty i wykłada hasła rundy 1 (bez odpowiedzi). */
export function startRound1(questions: Round1Question[], wybiera: StationKey = '1'): Promise<void> {
  return update(gra(), {
    runda: 1,
    punkty: { '1': 0, '2': 0, '3': 0 },
    runda1: {
      hasla: questions.map((q) => ({ haslo: q.haslo, stan: 'ukryte' })),
      wybiera,
    },
    pytanie: null,
    zgloszenie: null,
  })
}

export function setChooser(stanowisko: StationKey): Promise<void> {
  return set(gra('runda1/wybiera'), stanowisko)
}

/** Host klika kafelek na tablicy. */
export function selectTile(index: number): Promise<void> {
  return update(gra(), {
    pytanie: { haslo: index, faza: 'wybrane' },
    zgloszenie: null,
  })
}

/** Host cofa wybór kafelka, zanim piosenka zagra. */
export function cancelTile(): Promise<void> {
  return update(gra(), { pytanie: null, zgloszenie: null })
}

/** Muzyka startuje (pierwszy raz albo od nowa po złej odpowiedzi). */
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
  return update(gra(), {
    'pytanie/faza': 'odpowiedz',
    'pytanie/odpowiada': zgloszenie.stanowisko,
    'pytanie/wartosc': round1Value(zgloszenie.czas - pytanie.start),
    'pytanie/odpowiedzStart': serverTimestamp(),
  })
}

/** Dobra odpowiedź: punkty, odsłonięcie, odgadujący wybiera następne hasło. */
export function markCorrect(state: GameState, q: Round1Question): Promise<void> {
  const { pytanie } = state
  if (!pytanie?.odpowiada || pytanie.wartosc === undefined) return Promise.resolve()
  const s = pytanie.odpowiada
  const points = pytanie.wartosc
  return update(gra(), {
    [`punkty/${s}`]: state.punkty[s] + points,
    [`runda1/hasla/${pytanie.haslo}`]: {
      haslo: q.haslo,
      stan: 'odgadniete',
      stanowisko: s,
      punkty: points,
      tytul: q.tytul,
      wykonawca: q.wykonawca,
    },
    'runda1/wybiera': s,
    'pytanie/faza': 'odslona',
    'pytanie/wynik': { stanowisko: s, punkty: points, tytul: q.tytul, wykonawca: q.wykonawca },
    zgloszenie: null,
  })
}

/**
 * Zła odpowiedź: zawodnik zablokowany do końca piosenki.
 * Zwraca true, jeśli ktoś jeszcze może grać (wtedy host puszcza piosenkę od nowa).
 */
export async function markWrong(state: GameState): Promise<boolean> {
  const { pytanie } = state
  if (!pytanie?.odpowiada) return false
  const blocked = { ...(pytanie.zablokowane ?? {}), [pytanie.odpowiada]: true as const }
  const anyoneLeft = STATION_KEYS.some((k) => !blocked[k])
  await update(gra(), {
    'pytanie/zablokowane': blocked,
    'pytanie/faza': anyoneLeft ? 'wybrane' : 'brak',
    'pytanie/odpowiada': null,
    'pytanie/wartosc': null,
    'pytanie/odpowiedzStart': null,
    zgloszenie: null,
  })
  return anyoneLeft
}

/** Nikt nie zgadł — odsłaniamy tytuł. */
export function revealUnsolved(state: GameState, q: Round1Question): Promise<void> {
  const { pytanie } = state
  if (!pytanie) return Promise.resolve()
  return update(gra(), {
    [`runda1/hasla/${pytanie.haslo}`]: { haslo: q.haslo, stan: 'nieodgadniete', tytul: q.tytul, wykonawca: q.wykonawca },
    'pytanie/faza': 'odslona',
    'pytanie/wynik': { tytul: q.tytul, wykonawca: q.wykonawca },
    zgloszenie: null,
  })
}

/** Powrót do tablicy haseł. */
export function closeQuestion(): Promise<void> {
  return update(gra(), { pytanie: null, zgloszenie: null })
}

/** Ręczna korekta punktów (np. pomyłka prowadzącego). */
export function adjustScore(state: GameState, s: StationKey, delta: number): Promise<void> {
  return set(gra(`punkty/${s}`), Math.max(0, state.punkty[s] + delta))
}

/** Czyści całą grę (punkty, rundę, pytanie). Nazwy klas zostają. */
export function resetGame(): Promise<void> {
  return Promise.all([
    remove(gra('runda')),
    remove(gra('runda1')),
    remove(gra('pytanie')),
    remove(gra('zgloszenie')),
    set(gra('punkty'), { '1': 0, '2': 0, '3': 0 }),
  ]).then(() => undefined)
}
