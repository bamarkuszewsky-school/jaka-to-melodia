import { onValue, push, ref, remove, serverTimestamp, set, update } from 'firebase/database'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { resetGame } from '../game/hostActions'
import type { GameState, StationKey } from '../game/types'
import {
  computeRanking,
  songOutcomes,
  stationResults,
  type DrawnSongs,
  type EditionRecord,
  type RankingEntry,
  type SongRecord,
  type Songs,
} from './library'

/**
 * Baza utworów i edycji w Firebase:
 *   /baza/utwory/<id>   — ustawienia i historia utworów (tylko host)
 *   /baza/edycje/<id>   — wylosowane utwory i wyniki edycji (tylko host)
 *   /baza/biezaca       — id edycji, która właśnie trwa
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

export function updateSong(id: string, patch: Partial<Record<keyof SongRecord, unknown>>): Promise<void> {
  return update(ref(db, `baza/utwory/${id}`), patch)
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

export async function createEdition(nazwa: string, numer: number, utwory: DrawnSongs): Promise<string> {
  const r = push(ref(db, 'baza/edycje'))
  const id = r.key!
  await update(ref(db, 'baza'), {
    [`edycje/${id}`]: { nazwa, numer, utworzono: serverTimestamp(), utwory },
    biezaca: id,
  })
  return id
}

/** Porzuca wylosowaną edycję (np. test) — utwory wracają do puli. */
export async function cancelEdition(id: string): Promise<void> {
  await update(ref(db, 'baza'), { [`edycje/${id}`]: null, biezaca: null })
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
): Promise<void> {
  const wyniki = stationResults(game, klasy)
  const finalista = game.runda4?.gracz ?? game.runda3?.zwyciezca
  const changes: Record<string, unknown> = {
    [`edycje/${id}/zakonczono`]: serverTimestamp(),
    [`edycje/${id}/wyniki`]: wyniki,
    [`edycje/${id}/finalista`]: finalista ?? null,
    [`edycje/${id}/mistrz`]: game.runda4?.wynik === 'komplet' || null,
    [`edycje/${id}/final`]: game.runda4 ? game.runda4.utwory.filter((s) => s.stan === 'odgadnieta').length : null,
    biezaca: null,
  }
  for (const o of songOutcomes(game, edition.utwory)) {
    changes[`utwory/${o.id}/historia/${id}`] = {
      nazwa: edition.nazwa,
      data: serverTimestamp(),
      odgadniety: o.odgadniety,
      klasa: o.stanowisko ? wyniki[o.stanowisko].klasa : null,
    }
    changes[`utwory/${o.id}/odblokowany`] = null
  }
  await update(ref(db, 'baza'), changes)
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

export interface Pokaz {
  lista: RankingEntry[]
  tablica: boolean
  stream: boolean
}

const asPokaz = (v: unknown): Pokaz => {
  const raw = (v ?? {}) as Partial<Pokaz>
  return { lista: raw.lista ?? [], tablica: Boolean(raw.tablica), stream: Boolean(raw.stream) }
}

export const usePokaz = () => useValue('pokaz', asPokaz)

export function setPokaz(target: 'tablica' | 'stream', on: boolean, lista: RankingEntry[]): Promise<void> {
  return update(ref(db, 'pokaz'), { [target]: on || null, lista })
}

/** Host trzyma /pokaz/lista w zgodzie z edycjami (tablica i OBS nie czytają /baza). */
export function useRankingSync(editions: Record<string, EditionRecord> | undefined, pokaz: Pokaz | undefined) {
  useEffect(() => {
    if (!editions || !pokaz) return
    const lista = computeRanking(editions)
    if (JSON.stringify(lista) !== JSON.stringify(pokaz.lista)) set(ref(db, 'pokaz/lista'), lista).catch(() => {})
  }, [editions, pokaz])
}

export function clearPokaz(): Promise<void> {
  return remove(ref(db, 'pokaz/tablica')).then(() => remove(ref(db, 'pokaz/stream')))
}
