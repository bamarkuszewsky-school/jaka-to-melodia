import { onValue, push, ref, remove, serverTimestamp, set, update } from 'firebase/database'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { resetGame } from '../game/hostActions'
import type { GameState, StationKey } from '../game/types'
import {
  computeRanking,
  isPlayed,
  isReady,
  songOutcomes,
  stationResults,
  type DrawnSongs,
  type EditionRecord,
  type RankingEntry,
  type SongRecord,
  type Songs,
} from './library'
import {
  farewells,
  ladderView,
  matchLabel,
  normalizeLadder,
  normalizeSeason,
  stageMatches,
  STAGE_NAME,
  wildcardSlots,
  type Farewell,
  type LadderView,
  type Match,
  type MatchRef,
  type Season,
  type StageKey,
  buildNextStage,
  stageToAutoFill,
  nextStage,
} from './season'

/**
 * Baza utworów i edycji w Firebase:
 *   /baza/utwory/<id>   — ustawienia i historia utworów (tylko host)
 *   /baza/edycje/<id>   — wylosowane utwory i wyniki edycji (tylko host)
 *   /baza/biezaca       — id edycji, która właśnie trwa
 *   /baza/sezony/<id>   — sezon: daty i drabinka (mecze etapów → edycje)
 *   /baza/sezon         — id bieżącego sezonu
 *   /pokaz              — ranking do pokazania na tablicy / w OBS (czytają wszyscy, pisze host)
 */

function useValue<T>(path: string, map: (v: unknown) => T): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined)
  useEffect(() => onValue(ref(db, path), (snap) => setValue(map(snap.val()))), [path, map])
  return value
}

const asSongs = (v: unknown) => (v ?? {}) as Songs
const asEditions = (v: unknown) => {
  const raw = (v ?? {}) as Record<string, EditionRecord>
  for (const e of Object.values(raw)) {
    e.utwory = {
      runda1: e.utwory?.runda1 ?? [],
      runda2: e.utwory?.runda2 ?? [],
      dogrywka2: e.utwory?.dogrywka2 ?? [],
      runda3: e.utwory?.runda3 ?? [],
      final: e.utwory?.final ?? [],
    }
  }
  return raw
}
const asId = (v: unknown) => (typeof v === 'string' ? v : null)

/** undefined = jeszcze się wczytuje. */
export const useSongs = () => useValue('baza/utwory', asSongs)
export const useEditions = () => useValue('baza/edycje', asEditions)
export const useCurrentEditionId = () => useValue('baza/biezaca', asId)
const asSeasons = (v: unknown) => {
  const out: Record<string, Season> = {}
  for (const [id, raw] of Object.entries((v ?? {}) as Record<string, unknown>)) {
    const s = normalizeSeason(raw)
    if (s) out[id] = s
  }
  return out
}
export const useSeasons = () => useValue('baza/sezony', asSeasons)
export const useCurrentSeasonId = () => useValue('baza/sezon', asId)

/** Dzisiejsza data RRRR-MM-DD (czas lokalny). */
export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 2026-11-17 → 17.11.2026 */
export function formatDate(iso?: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso ?? ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function updateSong(id: string, patch: Partial<Record<keyof SongRecord, unknown>>): Promise<void> {
  return update(ref(db, `baza/utwory/${id}`), patch)
}

/** Zastępuje całą bazę utworów (po potwierdzeniu w panelu). */
export function replaceSongs(songs: Songs): Promise<void> {
  return set(ref(db, 'baza/utwory'), songs)
}

export function applySongChanges(changes: Record<string, unknown>): Promise<void> {
  if (Object.keys(changes).length === 0) return Promise.resolve()
  return update(ref(db, 'baza/utwory'), changes)
}

/** Ręczne oznaczenie: zagrany (np. poza aplikacją) albo z powrotem do losowania. */
export function setPlayed(id: string, rec: SongRecord, played: boolean): Promise<void> {
  if (!played) return update(ref(db, `baza/utwory/${id}`), { odblokowany: true })
  const hasHistory = rec.historia && Object.keys(rec.historia).length > 0
  return update(ref(db, `baza/utwory/${id}`), {
    odblokowany: null,
    ...(hasHistory ? {} : { 'historia/recznie': { nazwa: 'oznaczono ręcznie', data: serverTimestamp(), odgadniety: false } }),
  })
}

export interface EditionOptions {
  test?: boolean
  data?: string
  /** Bieżący sezon i mecz z drabinki (gdy edycja to mecz drabinki). */
  sezon?: string | null
  season?: Season
  mecz?: MatchRef
}

/** Napis etapu dla czołówki, intra rund i tablicy („Ćwierćfinał 2”). */
export interface EtapInfo {
  etap?: string
  edycja: string
  data?: string
  /** Czas serwera, kiedy edycję wylosowano (koordynator liczy, ile trwa). */
  od?: number
}

/** Liczby z bazy utworów dla koordynatora (tylko liczby — bez tytułów). */
export interface SongStats {
  /** Gotowe do losowania (niegrane) i zagrane, po rundach: '1', '2', '3', 'F'. */
  gotowe: Record<string, number>
  zagrane: Record<string, number>
}

export async function createEdition(nazwa: string, numer: number, utwory: DrawnSongs, opts: EditionOptions = {}): Promise<string> {
  const r = push(ref(db, 'baza/edycje'))
  const id = r.key!
  const m = opts.mecz
  const changes: Record<string, unknown> = {
    [`edycje/${id}`]: {
      nazwa,
      numer,
      utworzono: serverTimestamp(),
      utwory,
      test: opts.test || null,
      data: opts.data || null,
      sezon: (!opts.test && opts.sezon) || null,
      etap: m?.etap ?? null,
      mecz: m ? m.mecz : null,
    },
    biezaca: id,
  }
  if (m && opts.sezon) changes[`sezony/${opts.sezon}/etapy/${m.etap}/${m.mecz}/edycja`] = id
  await update(ref(db, 'baza'), changes)
  const etap = m ? matchLabel(m, opts.season) : undefined
  await update(ref(db, 'pokaz'), {
    plansza: { tryb: 'start', nazwa, od: serverTimestamp(), etap: etap ?? null, data: opts.data || null },
    etap: { edycja: nazwa, etap: etap ?? null, data: opts.data || null, od: serverTimestamp() },
  })
  return id
}

/** Porzuca wylosowaną edycję (np. test) — utwory wracają do puli. */
export async function cancelEdition(id: string, rec?: EditionRecord): Promise<void> {
  const changes: Record<string, unknown> = { [`edycje/${id}`]: null, biezaca: null }
  // Mecz z drabinki wraca do „do rozegrania”.
  if (rec?.sezon && rec.etap && rec.mecz !== undefined) changes[`sezony/${rec.sezon}/etapy/${rec.etap}/${rec.mecz}/edycja`] = null
  await update(ref(db, 'baza'), changes)
  await update(ref(db, 'pokaz'), { plansza: null, etap: null })
  await resetGame()
}

/**
 * Koniec edycji: wyniki klas do rankingu, zagrane utwory dostają wpis w historii
 * (i wypadają z losowania), gra wraca do stanu początkowego.
 */
export async function finishEdition(
  id: string,
  edition: EditionRecord,
  game: GameState,
  klasy: Record<StationKey, string>,
  season?: Season,
): Promise<void> {
  const wyniki = stationResults(game, klasy)
  // Mecz z drabinki może mieć 2 klasy — puste stanowisko nie trafia do wyników.
  if (edition.etap) {
    for (const k of Object.keys(wyniki) as StationKey[]) if (!klasy[k]?.trim()) delete wyniki[k]
  }
  const finalista = game.runda4?.gracz ?? game.runda3?.zwyciezca
  const changes: Record<string, unknown> = {
    [`edycje/${id}/zakonczono`]: serverTimestamp(),
    [`edycje/${id}/wyniki`]: wyniki,
    [`edycje/${id}/finalista`]: finalista ?? null,
    [`edycje/${id}/mistrz`]: game.runda4?.wynik === 'komplet' || null,
    [`edycje/${id}/final`]: game.runda4 ? game.runda4.utwory.filter((s) => s.stan === 'odgadnieta').length : null,
    biezaca: null,
  }
  // Edycja testowa: wynik zostaje w „Edycjach”, ale utwory nie są oznaczane jako zagrane.
  for (const o of edition.test ? [] : songOutcomes(game, edition.utwory)) {
    changes[`utwory/${o.id}/historia/${id}`] = {
      nazwa: edition.nazwa,
      data: serverTimestamp(),
      odgadniety: o.odgadniety,
      klasa: o.stanowisko ? wyniki[o.stanowisko].klasa : null,
    }
    changes[`utwory/${o.id}/odblokowany`] = null
  }
  await update(ref(db, 'baza'), changes)
  // Tablica: najpierw ranking sezonu, potem napis „Edycja … zakończona”.
  const order = (Object.keys(wyniki) as StationKey[]).sort((a, b) => wyniki[a].miejsce - wyniki[b].miejsce)
  const etap = edition.etap && edition.mecz !== undefined ? matchLabel({ etap: edition.etap, mecz: edition.mecz }, season) : undefined
  const dzikie = edition.etap && season ? wildcardSlots(edition.etap, stageMatches(season, edition.etap)) : 0
  await set(ref(db, 'pokaz/plansza'), {
    tryb: 'koniec',
    nazwa: edition.nazwa,
    klasy: order.map((k) => wyniki[k].klasa),
    od: serverTimestamp(),
    etap: etap ?? null,
    data: edition.data ?? null,
    // Napis na iPadach: „Dziękujemy!” + „Do zobaczenia” / „Do zobaczenia w następnym sezonie!”.
    pozegnania: edition.test ? null : farewells(wyniki, edition.etap, dzikie),
  })
  await resetGame()
}

/** Usuwa edycję z rankingu i z historii utworów (np. edycja testowa). */
export function deleteEdition(id: string, songs: Songs): Promise<void> {
  const changes: Record<string, unknown> = { [`edycje/${id}`]: null }
  for (const [sid, s] of Object.entries(songs)) {
    if (s.historia?.[id]) changes[`utwory/${sid}/historia/${id}`] = null
  }
  return update(ref(db, 'baza'), changes)
}

// ---------- Pokaz rankingu ----------

/** Plansza edycji na tablicy (przed rundą 1 i po zakończeniu edycji): ranking, potem napis. */
export interface Plansza {
  /** start / koniec edycji albo rozpoczęcie / zakończenie sezonu. */
  tryb: 'start' | 'koniec' | 'sezon-start' | 'sezon-koniec'
  nazwa: string
  /** Klasy (przy „koniec” — w kolejności miejsc). Przy „start” bierzemy aktualne nazwy stanowisk. */
  klasy?: string[]
  od: number
  /** Etap drabinki („Ćwierćfinał 2”) i data (RRRR-MM-DD). */
  etap?: string
  data?: string
  /** Po edycji: napisy na iPadach stanowisk. */
  pozegnania?: Partial<Record<StationKey, Farewell>>
  /** Koniec sezonu: mistrzowie. */
  mistrz?: string
  mistrzNauczycieli?: string
}

export interface Pokaz {
  lista: RankingEntry[]
  tablica: boolean
  stream: boolean
  plansza?: Plansza
  /** Drabinka sezonu (kopia do wyświetlania) i gdzie ją pokazać. */
  drabinka?: LadderView
  drabinkaTablica: boolean
  drabinkaStream: boolean
  /** Etap i edycja, która trwa — do czołówki i intra rund. */
  etap?: EtapInfo
  statystyki?: SongStats
}

const asPokaz = (v: unknown): Pokaz => {
  const raw = (v ?? {}) as Partial<Pokaz>
  return {
    lista: raw.lista ?? [],
    tablica: Boolean(raw.tablica),
    stream: Boolean(raw.stream),
    plansza: raw.plansza ?? undefined,
    drabinka: raw.drabinka ? normalizeLadder(raw.drabinka) : undefined,
    drabinkaTablica: Boolean(raw.drabinkaTablica),
    drabinkaStream: Boolean(raw.drabinkaStream),
    etap: raw.etap ?? undefined,
    statystyki: raw.statystyki ?? undefined,
  }
}

export const usePokaz = () => useValue('pokaz', asPokaz)

const asEtap = (v: unknown) => (v && typeof v === 'object' ? (v as EtapInfo) : null)
/** Etap i edycja, która trwa — „Ćwierćfinał 2 · Edycja 12” (czołówka, intro rund, nagłówki rund). */
export const useEtap = () => useValue('pokaz/etap', asEtap)

export function etapLine(e: EtapInfo | null | undefined): string | undefined {
  if (!e) return undefined
  return [e.etap, e.edycja].filter(Boolean).join(' · ') || undefined
}

export function setPokaz(target: 'tablica' | 'stream', on: boolean, lista: RankingEntry[]): Promise<void> {
  // Ranking i drabinka nie zasłaniają się nawzajem — na danym ekranie jedno naraz.
  const other = target === 'tablica' ? 'drabinkaTablica' : 'drabinkaStream'
  return update(ref(db, 'pokaz'), { [target]: on || null, lista, ...(on ? { [other]: null } : {}) })
}

export function setLadderShown(target: 'tablica' | 'stream', on: boolean): Promise<void> {
  const key = target === 'tablica' ? 'drabinkaTablica' : 'drabinkaStream'
  return update(ref(db, 'pokaz'), { [key]: on || null, ...(on ? { [target]: null } : {}) })
}

/** Pokaż ranking na planszy edycji jeszcze raz (od nowa: ranking → napis). */
export function replayPlansza(): Promise<void> {
  return update(ref(db, 'pokaz/plansza'), { od: serverTimestamp() })
}

/** Host trzyma /pokaz/lista w zgodzie z edycjami (tablica i OBS nie czytają /baza). */
export function useRankingSync(
  editions: Record<string, EditionRecord> | undefined,
  pokaz: Pokaz | undefined,
  sezon?: string | null,
  sezonTrwa = false,
) {
  useEffect(() => {
    if (!editions || !pokaz) return
    // Dopóki sezon nie wystartował, wcześniejsze edycje (bez sezonu) też są w rankingu.
    const lista = computeRanking(editions, sezon ?? undefined, !sezonTrwa)
    if (JSON.stringify(lista) !== JSON.stringify(pokaz.lista)) set(ref(db, 'pokaz/lista'), lista).catch(() => {})
  }, [editions, pokaz, sezon, sezonTrwa])
}

// ---------- Sezon i drabinka ----------

/** Nowy sezon z eliminacjami (mecze ułożone z listy klas). Staje się bieżącym. */
export async function createSeason(nazwa: string, eliminacje: Match[], nauczyciele: string[]): Promise<string> {
  const r = push(ref(db, 'baza/sezony'))
  const id = r.key!
  await update(ref(db, 'baza'), {
    [`sezony/${id}`]: {
      nazwa,
      utworzono: serverTimestamp(),
      etapy: { eliminacje, nauczyciele: nauczyciele.some((x) => x.trim()) ? [{ klasy: nauczyciele }] : null },
    },
    sezon: id,
  })
  return id
}

export function setCurrentSeason(id: string | null): Promise<void> {
  return set(ref(db, 'baza/sezon'), id)
}

export function renameSeason(id: string, nazwa: string): Promise<void> {
  return set(ref(db, `baza/sezony/${id}/nazwa`), nazwa)
}

/** Zapis całego etapu (edycja drabinki przez hosta). */
export function saveStage(id: string, etap: StageKey, matches: Match[]): Promise<void> {
  return set(ref(db, `baza/sezony/${id}/etapy/${etap}`), matches.length ? matches.map((m) => ({ klasy: m.klasy, edycja: m.edycja ?? null })) : null)
}

/**
 * Rozpoczęcie sezonu: data startu, plansza na tablicy i live.
 * Edycje rozegrane wcześniej bez sezonu (`dolicz`) trafiają do tego sezonu (do rankingu).
 */
export async function startSeason(id: string, season: Season, data: string, dolicz: string[]): Promise<void> {
  const changes: Record<string, unknown> = { [`sezony/${id}/start`]: data, [`sezony/${id}/koniec`]: null }
  for (const e of dolicz) changes[`edycje/${e}/sezon`] = id
  await update(ref(db, 'baza'), changes)
  await set(ref(db, 'pokaz/plansza'), { tryb: 'sezon-start', nazwa: season.nazwa, data, od: serverTimestamp() })
}

export async function endSeason(id: string, season: Season, data: string, editions: Record<string, EditionRecord>): Promise<void> {
  await set(ref(db, `baza/sezony/${id}/koniec`), data)
  const view = ladderView(season, editions)
  await set(ref(db, 'pokaz/plansza'), {
    tryb: 'sezon-koniec',
    nazwa: season.nazwa,
    data,
    od: serverTimestamp(),
    mistrz: view.mistrz ?? null,
    mistrzNauczycieli: view.mistrzNauczycieli ?? null,
  })
}

/** Podpięcie już rozegranej edycji pod mecz (np. eliminacje grane przed założeniem drabinki). */
export function linkEdition(seasonId: string, m: MatchRef, editionId: string | null, klasy?: string[]): Promise<void> {
  const changes: Record<string, unknown> = { [`sezony/${seasonId}/etapy/${m.etap}/${m.mecz}/edycja`]: editionId }
  if (klasy) changes[`sezony/${seasonId}/etapy/${m.etap}/${m.mecz}/klasy`] = klasy
  if (editionId) {
    changes[`edycje/${editionId}/sezon`] = seasonId
    changes[`edycje/${editionId}/etap`] = m.etap
    changes[`edycje/${editionId}/mecz`] = m.mecz
  }
  return update(ref(db, 'baza'), changes)
}

/**
 * Host trzyma /pokaz/drabinka w zgodzie z sezonem i edycjami, a gdy etap się skończy,
 * sam układa następny (rozstawienie według punktów) — o ile host jeszcze go nie ułożył.
 */
export function useLadderSync(
  seasonId: string | null | undefined,
  season: Season | undefined,
  editions: Record<string, EditionRecord> | undefined,
  currentEdition: string | null | undefined,
  pokaz: Pokaz | undefined,
) {
  useEffect(() => {
    if (!pokaz || !editions) return
    if (!season || !seasonId) {
      if (pokaz.drabinka) remove(ref(db, 'pokaz/drabinka')).catch(() => {})
      return
    }
    const fill = stageToAutoFill(season, editions)
    const next = fill ? nextStage(fill) : undefined
    const built = fill ? buildNextStage(season, fill, editions) : undefined
    if (next && built) {
      saveStage(seasonId, next, built).catch(() => {})
      return // po zapisie sezon wróci tu jeszcze raz z nowym etapem
    }
    // JSON w obie strony wycina pola `undefined` (Firebase ich nie przyjmuje).
    const view = JSON.parse(JSON.stringify(ladderView(season, editions, currentEdition))) as LadderView
    if (JSON.stringify(view) !== JSON.stringify(pokaz.drabinka ?? null))
      set(ref(db, 'pokaz/drabinka'), view).catch((e) => console.error('Drabinka:', e))
  }, [seasonId, season, editions, currentEdition, pokaz])
}

export { STAGE_NAME }

/** Host publikuje liczby z bazy utworów (koordynator nie czyta /baza). */
export function useSongStatsSync(songs: Songs | undefined, pokaz: Pokaz | undefined) {
  useEffect(() => {
    if (!songs || !pokaz) return
    const gotowe: Record<string, number> = { '1': 0, '2': 0, '3': 0, F: 0 }
    const zagrane: Record<string, number> = { '1': 0, '2': 0, '3': 0, F: 0 }
    for (const s of Object.values(songs)) {
      if (s.brak) continue
      if (isPlayed(s)) zagrane[s.runda] = (zagrane[s.runda] ?? 0) + 1
      else if (isReady(s)) gotowe[s.runda] = (gotowe[s.runda] ?? 0) + 1
    }
    const stats: SongStats = { gotowe, zagrane }
    if (JSON.stringify(stats) !== JSON.stringify(pokaz.statystyki ?? null)) set(ref(db, 'pokaz/statystyki'), stats).catch(() => {})
  }, [songs, pokaz])
}

export function clearPokaz(): Promise<void> {
  return remove(ref(db, 'pokaz/tablica')).then(() => remove(ref(db, 'pokaz/stream')))
}

/** Przelosowanie w trakcie gry: edycja i plansza zmieniają się jednym zapisem. */
export function applyLiveRedraw(updates: Record<string, unknown>): Promise<void> {
  return update(ref(db), updates)
}
