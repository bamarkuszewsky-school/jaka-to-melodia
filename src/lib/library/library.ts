import type { GameState, StationKey } from '../game/types'
import { STATION_KEYS } from '../game/types'

/**
 * BAZA UTWORÓW — czysta logika (bez Firebase), żeby dało się ją testować.
 *
 * Folder z muzyką leży na MacBooku hosta:
 *   Muzyka/RUNDA 1/Takie Tango - Budka Suflera.mp3
 *   Muzyka/RUNDA 2/…
 *   Muzyka/RUNDA 3/Takie Tango - Budka Suflera.png   ← nuty (mp3 obok opcjonalnie, na refren)
 *   Muzyka/FINAŁ/…
 *   Muzyka/SYSTEMOWE/czołówka.mp3, intro rundy (…runda….mp3 albo osobno „runda 1”, „finał”)
 * Nazwa pliku = „Tytuł - Wykonawca”. Ustawienia (start, refren, hasło, anegdota, historia)
 * trzyma baza w Firebase pod /baza/utwory — czyta i pisze tylko host.
 */

export type LibRound = '1' | '2' | '3' | 'F'
export const LIB_ROUNDS: readonly LibRound[] = ['1', '2', '3', 'F']
export const ROUND_LABEL: Record<LibRound, string> = { '1': 'Runda 1', '2': 'Runda 2', '3': 'Runda 3', F: 'Finał' }

/** Jedno zagranie utworu w edycji. */
export interface SongPlay {
  nazwa: string
  data: number
  odgadniety: boolean
  klasa?: string
}

export interface SongRecord {
  runda: LibRound
  tytul: string
  wykonawca: string
  /** Ścieżka pliku audio w folderze (bez nazwy folderu głównego). */
  plik?: string
  /** Ścieżka zrzutu nut (runda 3). */
  nuty?: string
  /** Sekunda startu fragmentu. */
  start?: number
  /** Sekunda, od której zaczyna się refren. */
  refren?: number
  /** Hasło na tablicy (runda 2 i dogrywka). */
  haslo?: string
  /** Anegdota, którą czyta host (runda 3). */
  podpowiedz?: string
  /** Pliku nie było przy ostatnim wczytaniu folderu. */
  brak?: boolean
  /** Zagrania: klucz = id edycji. */
  historia?: Record<string, SongPlay>
  /** Host odznaczył „zagrany” — utwór wraca do losowania. */
  odblokowany?: boolean
}

export type Songs = Record<string, SongRecord>

/** Utwory wylosowane do edycji (id z /baza/utwory). */
export interface DrawnSongs {
  runda1: string[]
  runda2: string[]
  dogrywka2: string[]
  runda3: string[]
  final: string[]
}
export type DrawKey = keyof DrawnSongs
export const DRAW_KEYS: readonly DrawKey[] = ['runda1', 'runda2', 'dogrywka2', 'runda3', 'final']
export const DRAW_ROUND: Record<DrawKey, LibRound> = { runda1: '1', runda2: '2', dogrywka2: '2', runda3: '3', final: 'F' }
export const DRAW_COUNT: Record<DrawKey, number> = { runda1: 5, runda2: 3, dogrywka2: 2, runda3: 6, final: 7 }
export const DRAW_LABEL: Record<DrawKey, string> = {
  runda1: 'Runda 1',
  runda2: 'Runda 2',
  dogrywka2: 'Dogrywka',
  runda3: 'Runda 3',
  final: 'Finał',
}

export interface StationResult {
  klasa: string
  punkty: number
  miejsce: number
}

export interface EditionRecord {
  nazwa: string
  numer: number
  utworzono: number
  zakonczono?: number
  utwory: DrawnSongs
  wyniki?: Partial<Record<StationKey, StationResult>>
  finalista?: StationKey
  /** Komplet 7/7 w finale. */
  mistrz?: boolean
  /** Ile melodii finału odgadnięto. */
  final?: number
}

// ---------- Folder ----------

export interface FileLike {
  name: string
  webkitRelativePath?: string
}

const AUDIO = /\.(mp3|m4a|wav|aac|ogg)$/i
const IMAGE = /\.(png|jpe?g|webp)$/i

function plain(s: string): string {
  return s
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** „RUNDA 1”, „Runda_2”, „FINAŁ” → runda. Inne nazwy → null. */
export function parseRoundFolder(name: string): LibRound | null {
  const n = plain(name).toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (n === 'RUNDA1') return '1'
  if (n === 'RUNDA2') return '2'
  if (n === 'RUNDA3') return '3'
  if (n === 'FINAL' || n === 'RUNDA4') return 'F'
  return null
}

/** „Takie Tango - Budka Suflera” → tytuł i wykonawca. */
export function parseSongName(base: string): { tytul: string; wykonawca: string } {
  const m = base.match(/^(.*?)\s+[-–—]\s+(.*)$/)
  if (!m) return { tytul: base.trim(), wykonawca: '' }
  return { tytul: m[1].trim(), wykonawca: m[2].trim() }
}

export function slug(s: string): string {
  return plain(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

/** Klucz utworu w bazie: runda + nazwa pliku (bez rozszerzenia). */
export function songId(runda: LibRound, base: string): string {
  return `${runda === 'F' ? 'f' : `r${runda}`}-${slug(base) || 'bez-nazwy'}`
}

export interface ScannedSong<F extends FileLike = FileLike> {
  id: string
  runda: LibRound
  tytul: string
  wykonawca: string
  audio?: F
  audioPath?: string
  nuty?: F
  nutyPath?: string
}

/** Klucz intra rundy: konkretna runda (4 = finał) albo „wszystkie”. */
export type RoundIntroKey = '1' | '2' | '3' | '4' | 'wszystkie'

export interface ScanResult<F extends FileLike = FileLike> {
  songs: Map<string, ScannedSong<F>>
  /** Czołówka (SYSTEMOWE/…czołówka… albo czolowka.* w folderze głównym). */
  intro?: F
  /** Intra rund z folderu SYSTEMOWE. */
  roundIntros: Partial<Record<RoundIntroKey, F>>
  /** Pliki poza folderami rund (poza czołówką). */
  skipped: string[]
}

/** „SYSTEMOWE”, „Systemowe”, „SYSTEM” → folder z dźwiękami systemowymi. */
export function isSystemFolder(name: string): boolean {
  const n = plain(name).toUpperCase().replace(/[^A-Z]/g, '')
  return n === 'SYSTEMOWE' || n === 'SYSTEM' || n === 'SYSTEMOWY'
}

/** Rozpoznaje dźwięk systemowy po nazwie pliku. */
export function systemSound(fileName: string): { kind: 'czolowka' } | { kind: 'runda'; key: RoundIntroKey } | null {
  const n = plain(fileName.replace(/\.[^.]+$/, '')).toLowerCase()
  if (n.includes('czolowka')) return { kind: 'czolowka' }
  if (/final/.test(n) || /runda[^a-z0-9]*4/.test(n)) return { kind: 'runda', key: '4' }
  const m = n.match(/runda[^a-z0-9]*([1-3])/)
  if (m) return { kind: 'runda', key: m[1] as RoundIntroKey }
  if (n.includes('runda') || n.includes('round')) return { kind: 'runda', key: 'wszystkie' }
  return null
}

/** Intro dla danej rundy: osobny plik albo wspólny „runda intro”. */
export function roundIntroFor<F>(intros: Partial<Record<RoundIntroKey, F>>, runda: number): F | undefined {
  return intros[String(runda) as RoundIntroKey] ?? intros.wszystkie
}

export function scanLibrary<F extends FileLike>(files: Iterable<F>): ScanResult<F> {
  const roundIntros: Partial<Record<RoundIntroKey, F>> = {}
  let systemIntro: F | undefined
  const songs = new Map<string, ScannedSong<F>>()
  const skipped: string[] = []
  let intro: F | undefined
  for (const f of files) {
    if (f.name.startsWith('.')) continue
    const parts = (f.webkitRelativePath || f.name).split('/')
    const rel = parts.length > 1 ? parts.slice(1).join('/') : f.name
    const isAudio = AUDIO.test(f.name)
    const isImage = IMAGE.test(f.name)
    let runda: LibRound | null = null
    for (let i = 0; i < parts.length - 1; i++) {
      runda = parseRoundFolder(parts[i]) ?? runda
    }
    if (!runda && isAudio && parts.slice(0, -1).some(isSystemFolder)) {
      const snd = systemSound(f.name)
      if (snd?.kind === 'czolowka') systemIntro = f
      else if (snd?.kind === 'runda') roundIntros[snd.key] = f
      else skipped.push(rel)
      continue
    }
    if (!runda) {
      if (isAudio && /^czolowka\./i.test(f.name)) intro = f
      else if (isAudio || isImage) skipped.push(rel)
      continue
    }
    if (!isAudio && !isImage) continue
    const base = f.name.replace(/\.[^.]+$/, '')
    const id = songId(runda, base)
    const s = songs.get(id) ?? { id, runda, ...parseSongName(base) }
    if (isAudio) {
      s.audio = f
      s.audioPath = rel
    } else {
      s.nuty = f
      s.nutyPath = rel
    }
    songs.set(id, s)
  }
  return { songs, intro: systemIntro ?? intro, roundIntros, skipped }
}

/**
 * Zmiany w bazie po wczytaniu folderu: nowe utwory dostają tytuł i wykonawcę z nazwy pliku,
 * istniejące — aktualne ścieżki. Ustawień (start, hasło…) nie ruszamy. Zniknięte pliki → „brak”.
 */
export function syncChanges(scan: ScanResult, songs: Songs): Record<string, unknown> {
  const changes: Record<string, unknown> = {}
  for (const s of scan.songs.values()) {
    const old = songs[s.id]
    if (!old) {
      changes[s.id] = {
        runda: s.runda,
        tytul: s.tytul,
        wykonawca: s.wykonawca,
        plik: s.audioPath ?? null,
        nuty: s.nutyPath ?? null,
      }
      continue
    }
    if ((old.plik ?? null) !== (s.audioPath ?? null)) changes[`${s.id}/plik`] = s.audioPath ?? null
    if ((old.nuty ?? null) !== (s.nutyPath ?? null)) changes[`${s.id}/nuty`] = s.nutyPath ?? null
    if (old.brak) changes[`${s.id}/brak`] = null
  }
  for (const [id, old] of Object.entries(songs)) {
    if (!scan.songs.has(id) && !old.brak) changes[`${id}/brak`] = true
  }
  return changes
}

// ---------- Gotowość i losowanie ----------

export type Missing = 'plik' | 'nuty' | 'start' | 'haslo' | 'podpowiedz' | 'wykonawca'
export const MISSING_LABEL: Record<Missing, string> = {
  plik: 'plik MP3',
  nuty: 'nuty (PNG)',
  start: 'start',
  haslo: 'hasło',
  podpowiedz: 'anegdota',
  wykonawca: 'wykonawca',
}

/** Czego brakuje, żeby utwór mógł być losowany do swojej rundy. */
export function missingFor(rec: SongRecord): Missing[] {
  const m: Missing[] = []
  const has = (v: string | undefined) => Boolean(v && v.trim())
  if (!has(rec.wykonawca)) m.push('wykonawca')
  if (rec.runda === '3') {
    if (!rec.nuty || rec.brak) m.push('nuty')
    if (!has(rec.podpowiedz)) m.push('podpowiedz')
    return m
  }
  if (!rec.plik || rec.brak) m.push('plik')
  if (rec.start === undefined || rec.start === null) m.push('start')
  if (rec.runda === '2' && !has(rec.haslo)) m.push('haslo')
  return m
}

export function isPlayed(rec: SongRecord): boolean {
  return Boolean(rec.historia && Object.keys(rec.historia).length > 0 && !rec.odblokowany)
}

export function isReady(rec: SongRecord): boolean {
  return missingFor(rec).length === 0
}

/** Utwory, które mogą trafić do losowania danej rundy. */
export function pool(songs: Songs, runda: LibRound, exclude: Set<string> = new Set()): string[] {
  return Object.entries(songs)
    .filter(([id, s]) => s.runda === runda && !exclude.has(id) && isReady(s) && !isPlayed(s))
    .map(([id]) => id)
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Wybiera `count` utworów, w miarę możliwości bez powtórzonego wykonawcy. */
function pick(ids: string[], count: number, songs: Songs, usedArtists: Set<string>, rng: () => number): string[] {
  const shuffled = shuffle(ids, rng)
  const out: string[] = []
  const artist = (id: string) => slug(songs[id].wykonawca)
  for (const id of shuffled) {
    if (out.length === count) break
    if (!usedArtists.has(artist(id))) {
      out.push(id)
      usedArtists.add(artist(id))
    }
  }
  for (const id of shuffled) {
    if (out.length === count) break
    if (!out.includes(id)) out.push(id)
  }
  return out
}

export interface DrawShortage {
  key: DrawKey
  potrzeba: number
  jest: number
}

export interface DrawResult {
  utwory: DrawnSongs
  braki: DrawShortage[]
}

/** Losuje utwory do nowej edycji. Dogrywka nie jest obowiązkowa (0–2). */
export function drawEdition(songs: Songs, rng: () => number = Math.random): DrawResult {
  const used = new Set<string>()
  const artists = new Set<string>()
  const utwory = { runda1: [], runda2: [], dogrywka2: [], runda3: [], final: [] } as DrawnSongs
  const braki: DrawShortage[] = []
  for (const key of DRAW_KEYS) {
    const ids = pool(songs, DRAW_ROUND[key], used)
    const chosen = pick(ids, DRAW_COUNT[key], songs, artists, rng)
    chosen.forEach((id) => used.add(id))
    utwory[key] = chosen
    if (key !== 'dogrywka2' && chosen.length < DRAW_COUNT[key]) {
      braki.push({ key, potrzeba: DRAW_COUNT[key], jest: chosen.length })
    }
  }
  return { utwory, braki }
}

/** Zamienia jeden wylosowany utwór na inny z puli (undefined = nie ma czym). */
export function redrawOne(
  songs: Songs,
  utwory: DrawnSongs,
  key: DrawKey,
  index: number,
  rng: () => number = Math.random,
): string | undefined {
  const used = new Set(DRAW_KEYS.flatMap((k) => utwory[k]))
  const ids = pool(songs, DRAW_ROUND[key], used)
  if (ids.length === 0) return undefined
  const others = new Set(utwory[key].filter((_, i) => i !== index).map((id) => slug(songs[id]?.wykonawca ?? '')))
  const fresh = ids.filter((id) => !others.has(slug(songs[id].wykonawca)))
  const from = fresh.length > 0 ? fresh : ids
  return from[Math.floor(rng() * from.length)]
}

// ---------- Wyniki edycji ----------

export interface SongOutcome {
  id: string
  odgadniety: boolean
  stanowisko?: StationKey
}

/** Które wylosowane utwory naprawdę zagrano i czy ktoś je odgadł (z /gra). */
export function songOutcomes(game: GameState, utwory: DrawnSongs): SongOutcome[] {
  const out: SongOutcome[] = []
  const tiles = (
    list: { stan: string; stanowisko?: StationKey }[] | undefined,
    ids: string[],
  ) =>
    list?.forEach((t, i) => {
      if (ids[i] && (t.stan === 'odgadniete' || t.stan === 'nieodgadniete')) {
        out.push({ id: ids[i], odgadniety: t.stan === 'odgadniete', stanowisko: t.stanowisko })
      }
    })
  tiles(game.runda1?.hasla, utwory.runda1)
  tiles(game.runda2?.hasla, utwory.runda2)
  tiles(game.runda2?.dogrywki, utwory.dogrywka2)
  game.runda3?.hasla.forEach((t, i) => {
    const id = utwory.runda3[i]
    if (id && (t.stan === 'odgadniete' || t.stan === 'nieodgadniete')) {
      out.push({ id, odgadniety: Boolean(t.trafil), stanowisko: t.zgadywal })
    }
  })
  const r4 = game.runda4
  r4?.utwory.forEach((s, i) => {
    const id = utwory.final[i]
    if (!id) return
    if (s.stan === 'odgadnieta' || s.stan === 'zla' || s.stan === 'pominieta') {
      out.push({ id, odgadniety: s.stan === 'odgadnieta', stanowisko: r4.gracz })
    }
  })
  return out
}

/**
 * Miejsca w edycji: finalista 1., przegrany rundy 3 — 2., odpadający w rundzie 2 — 3.
 * Gdy edycję przerwano wcześniej — według punktów.
 */
export function stationResults(game: GameState, klasy: Record<StationKey, string>): Record<StationKey, StationResult> {
  const tier = (k: StationKey) => {
    if (game.runda3?.zwyciezca === k || game.runda4?.gracz === k) return 0
    if (game.runda3?.gracze.includes(k)) return 1
    return 2
  }
  const order = [...STATION_KEYS].sort((a, b) => tier(a) - tier(b) || game.punkty[b] - game.punkty[a])
  const res = {} as Record<StationKey, StationResult>
  order.forEach((k, i) => {
    res[k] = { klasa: klasy[k] || `Stanowisko ${k}`, punkty: game.punkty[k] ?? 0, miejsce: i + 1 }
  })
  return res
}

// ---------- Ranking sezonu ----------

export interface RankingEntry {
  klasa: string
  punkty: number
  edycja: string
  numer: number
  miejsce: number
  finalista: boolean
  mistrz: boolean
}

export function computeRanking(editions: Record<string, EditionRecord>): RankingEntry[] {
  const out: RankingEntry[] = []
  for (const e of Object.values(editions)) {
    if (!e.zakonczono || !e.wyniki) continue
    for (const k of STATION_KEYS) {
      const w = e.wyniki[k]
      if (!w) continue
      out.push({
        klasa: w.klasa,
        punkty: w.punkty,
        edycja: e.nazwa,
        numer: e.numer,
        miejsce: w.miejsce,
        finalista: e.finalista === k,
        mistrz: e.finalista === k && Boolean(e.mistrz),
      })
    }
  }
  return out.sort((a, b) => b.punkty - a.punkty || a.numer - b.numer || a.miejsce - b.miejsce)
}

// ---------- CSV (do pracy w arkuszu albo na czacie) ----------

const CSV_COLS = ['id', 'runda', 'tytul', 'wykonawca', 'start', 'refren', 'haslo', 'podpowiedz', 'zagrany'] as const

function csvCell(v: string): string {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function num(v: number | undefined): string {
  return v === undefined || v === null ? '' : String(v).replace('.', ',')
}

export function exportCsv(songs: Songs): string {
  const rows = Object.entries(songs)
    .sort(([a, x], [b, y]) => x.runda.localeCompare(y.runda) || a.localeCompare(b))
    .map(([id, s]) =>
      [
        id,
        ROUND_LABEL[s.runda],
        s.tytul,
        s.wykonawca,
        num(s.start),
        num(s.refren),
        s.haslo ?? '',
        s.podpowiedz ?? '',
        isPlayed(s) ? Object.values(s.historia ?? {}).map((h) => h.nazwa).join(', ') : '',
      ]
        .map((c) => csvCell(c))
        .join(';'),
    )
  return [CSV_COLS.join(';'), ...rows].join('\n') + '\n'
}

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? ''
  const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"' && cell === '') quoted = true
    else if (c === sep) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

export function parseSeconds(v: string): number | null | undefined {
  const t = v.trim()
  if (t === '') return undefined
  // „1:23,5” albo „83,5”
  const m = t.match(/^(?:(\d+):)?(\d+(?:[.,]\d+)?)$/)
  if (!m) return null
  const sec = Number(m[2].replace(',', '.')) + (m[1] ? Number(m[1]) * 60 : 0)
  return Number.isFinite(sec) && sec >= 0 ? Math.round(sec * 10) / 10 : null
}

export interface CsvImport {
  /** Zmiany do update() pod /baza/utwory. */
  changes: Record<string, unknown>
  updated: number
  unknown: string[]
  errors: string[]
}

/** Wczytuje start, refren, hasło i anegdotę (puste komórki nic nie zmieniają). */
export function importCsv(text: string, songs: Songs): CsvImport {
  const rows = parseCsv(text)
  const res: CsvImport = { changes: {}, updated: 0, unknown: [], errors: [] }
  if (rows.length === 0) return res
  const head = rows[0].map((h) => slug(h))
  const col = (name: string) => head.indexOf(name)
  const iId = col('id')
  if (iId < 0) {
    res.errors.push('Brak kolumny „id” w pierwszym wierszu.')
    return res
  }
  for (const r of rows.slice(1)) {
    const id = (r[iId] ?? '').trim()
    if (!id) continue
    if (!songs[id]) {
      res.unknown.push(id)
      continue
    }
    let touched = false
    for (const key of ['start', 'refren'] as const) {
      const i = col(key)
      if (i < 0) continue
      const v = parseSeconds(r[i] ?? '')
      if (v === null) res.errors.push(`${id}: „${r[i]}” to nie jest liczba sekund (${key}).`)
      else if (v !== undefined && v !== songs[id][key]) {
        res.changes[`${id}/${key}`] = v
        touched = true
      }
    }
    for (const key of ['haslo', 'podpowiedz', 'tytul', 'wykonawca'] as const) {
      const i = col(key)
      if (i < 0) continue
      const v = (r[i] ?? '').trim()
      if (v && v !== (songs[id][key] ?? '')) {
        res.changes[`${id}/${key}`] = v
        touched = true
      }
    }
    if (touched) res.updated++
  }
  return res
}

/** Czas w sekundach do wyświetlenia: 83.5 → „1:23,5”. */
export function formatSec(sec: number | undefined): string {
  if (sec === undefined || sec === null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  const ss = (Math.round(s * 10) / 10).toFixed(1).replace('.', ',').padStart(4, '0')
  return `${m}:${ss}`
}
