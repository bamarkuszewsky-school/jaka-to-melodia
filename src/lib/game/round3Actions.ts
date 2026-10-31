import { ref, remove, serverTimestamp, set, update } from 'firebase/database'
import { db } from '../firebase'
import { applyBid, firstChooser, opponent, R3_TILES, WINS_TO_FINAL } from './rules3'
import { STATION_KEYS, type BidMove, type GameState, type Round3Question, type StationKey } from './types'

/**
 * Akcje rundy 3 (licytacja nut).
 * Host zapisuje stan w /gra/pytanie3 i /gra/runda3, iPady zapisują tylko ruch w /gra/ruch,
 * muzyk tylko /gra/zagrane. Nuty i tytuł dla muzyka leżą osobno w /muzyk (nie widzą ich zawodnicy).
 */

const gra = (path = '') => ref(db, path ? `gra/${path}` : 'gra')

// ---------- Host ----------

export function startRound3(game: GameState): Promise<void> {
  const odpada = game.runda2?.odpada
  const gracze = STATION_KEYS.filter((k) => k !== odpada).slice(0, 2) as [StationKey, StationKey]
  return update(gra(), {
    runda: 3,
    runda3: {
      hasla: Array.from({ length: R3_TILES }, () => ({ stan: 'ukryte' })),
      gracze,
      wybiera: firstChooser(game.punkty, gracze),
      wygrane: { [gracze[0]]: 0, [gracze[1]]: 0 },
    },
    pytanie: null,
    pytanie3: null,
    zgloszenie: null,
    ruch: null,
    zagrane: null,
  })
}

export function setChooser3(k: StationKey): Promise<void> {
  return set(gra('runda3/wybiera'), k)
}

/**
 * Host klika numer zagadki: widać wykonawcę, licytację zaczyna klasa, która nie wybierała.
 * Muzyk dostaje tytuł i nuty (obrazek skompresowany do JPEG, jako tekst w bazie).
 */
export async function selectTile3(game: GameState, index: number, q: Round3Question, sheet: string | null): Promise<void> {
  const r3 = game.runda3
  if (!r3) return
  const wybral = r3.wybiera
  await set(ref(db, 'muzyk/biezace'), { tytul: q.tytul, wykonawca: q.wykonawca, nuty: sheet })
  await update(gra(), {
    pytanie3: {
      haslo: index,
      faza: 'licytacja',
      wybral,
      wykonawca: q.wykonawca,
      wartosc: q.wartosc,
      licytacja: { kolej: opponent(r3.gracze, wybral) },
    },
    ruch: null,
    zagrane: null,
  })
}

/** Cofnięcie wyboru numeru (przed końcem licytacji). */
export async function cancelTile3(): Promise<void> {
  await update(gra(), { pytanie3: null, ruch: null, zagrane: null })
  await remove(ref(db, 'muzyk/biezace'))
}

/**
 * Ruch w licytacji — z iPada (przez /gra/ruch) albo wpisany przez hosta.
 * Zwraca komunikat błędu, jeśli ruch był niepoprawny.
 */
export async function processBid(game: GameState, move: Pick<BidMove, 'stanowisko' | 'nuty' | 'pas'>): Promise<string | null> {
  const p = game.pytanie3
  const r3 = game.runda3
  if (!p || !r3 || p.faza !== 'licytacja') return null
  const result = applyBid(p.licytacja, move, r3.gracze)
  if (result.status === 'invalid') {
    await set(gra('ruch'), null)
    return result.reason
  }
  const changes: Record<string, unknown> = { 'pytanie3/licytacja': result.licytacja, ruch: null }
  if (result.status === 'done') {
    changes['pytanie3/faza'] = 'granie'
    changes['pytanie3/gra'] = result.gra
    changes['pytanie3/nuty'] = result.nuty
  }
  await update(gra(), changes)
  return null
}

/** Muzyk zagrał nuty (albo host kliknął za niego) — start 10 s na odpowiedź. */
export function notesPlayed(): Promise<void> {
  return update(gra(), {
    'pytanie3/faza': 'odpowiedz',
    'pytanie3/odpowiedzStart': serverTimestamp(),
    zagrane: null,
  })
}

/** Ponowne zagranie (np. muzyk się pomylił) — wraca do grania, odliczanie od nowa później. */
export function replayNotes(): Promise<void> {
  return update(gra(), { 'pytanie3/faza': 'granie', 'pytanie3/odpowiedzStart': null, zagrane: null })
}

/**
 * Ocena odpowiedzi. Trafienie: wygrana i punkty dla zgadującego.
 * Pudło (albo brak odpowiedzi): wygrana i punkty dla rywala.
 */
export function judge3(game: GameState, q: Round3Question, trafil: boolean): Promise<void> {
  const p = game.pytanie3
  const r3 = game.runda3
  if (!p || !r3 || !p.gra) return Promise.resolve()
  const winner = trafil ? p.gra : opponent(r3.gracze, p.gra)
  const wins = (r3.wygrane[winner] ?? 0) + 1
  const changes: Record<string, unknown> = {
    [`punkty/${winner}`]: game.punkty[winner] + p.wartosc,
    [`runda3/wygrane/${winner}`]: wins,
    [`runda3/hasla/${p.haslo}`]: {
      stan: trafil ? 'odgadniete' : 'nieodgadniete',
      wykonawca: q.wykonawca,
      tytul: q.tytul,
      stanowisko: winner,
      punkty: p.wartosc,
      trafil,
      zgadywal: p.gra,
      nuty: p.nuty ?? null,
    },
    // Numery wybiera się naprzemiennie.
    'runda3/wybiera': opponent(r3.gracze, p.wybral),
    'pytanie3/faza': 'odslona',
    'pytanie3/wynik': { tytul: q.tytul, wykonawca: q.wykonawca, stanowisko: winner, punkty: p.wartosc, trafil },
  }
  if (wins >= WINS_TO_FINAL) changes['runda3/zwyciezca'] = winner
  return update(gra(), changes)
}

export async function closeQuestion3(): Promise<void> {
  await update(gra(), { pytanie3: null, ruch: null, zagrane: null })
  await remove(ref(db, 'muzyk/biezace'))
}

// ---------- iPad zawodnika ----------

/** Oferta albo pas z iPada. Reguły bazy przyjmą ją tylko od klasy, której jest kolej. */
export function sendBid(stanowisko: StationKey, bid: { nuty?: number; pas?: boolean }): Promise<void> {
  return set(gra('ruch'), { stanowisko, ...bid, czas: serverTimestamp() })
}

// ---------- Muzyk ----------

export function musicianPlayed(): Promise<void> {
  return set(gra('zagrane'), serverTimestamp())
}

// ---------- Nuty dla muzyka ----------

/** Zmniejsza zrzut nut i zamienia na tekst (JPEG), żeby zmieścił się w bazie bez płatnego Storage. */
export async function sheetToDataUrl(file: File, maxWidth = 1800): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}
