import { R3_BIG_VALUE, R3_TILES, R3_VALUE } from './rules3'
import type { Question, QuestionSet, Round3Question } from './types'

/**
 * Wczytywanie edycji z folderu na MacBooku hosta.
 * W folderze: pytania.json + pliki MP3. Nic z tego nie trafia do repozytorium
 * ani do bazy — odpowiedzi zna tylko panel hosta.
 */

export interface LoadedEdition {
  set: QuestionSet
  /** Nazwa pliku → adres do odtworzenia w przeglądarce. */
  audio: Map<string, string>
  /** Pliki wymienione w pytaniach, których nie ma w folderze. */
  missing: string[]
  /** Podkład czołówki (plik „czolowka.mp3/.wav/.m4a” w folderze edycji). */
  intro?: string
  /** Obrazki z nutami do rundy 3 (nazwa pliku → plik). */
  images: Map<string, File>
}

export class QuestionFileError extends Error {}

function text(v: unknown, field: string, where: string): string {
  if (typeof v !== 'string' || v.trim() === '') {
    throw new QuestionFileError(`${where}: brakuje pola „${field}”.`)
  }
  return v.trim()
}

/** Polska odmiana: 1 hasło, 2–4 hasła, 5+ haseł. */
export function hasla(n: number): string {
  if (n === 1) return '1 hasło'
  const last = n % 10
  const lastTwo = n % 100
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return `${n} hasła`
  return `${n} haseł`
}

interface ListSpec {
  key: string
  label: string
  /** Dokładna liczba haseł albo zakres [min, max]. */
  count: number | [number, number]
  optional?: boolean
}

function parseList(raw: unknown, spec: ListSpec): Question[] {
  if (raw === undefined && spec.optional) return []
  if (!Array.isArray(raw)) throw new QuestionFileError(`Brakuje listy „${spec.key}”.`)

  const [min, max] = typeof spec.count === 'number' ? [spec.count, spec.count] : spec.count
  if (raw.length < min || raw.length > max) {
    const need = min === max ? `dokładnie ${hasla(min)}` : `od ${min} do ${hasla(max)}`
    throw new QuestionFileError(`${spec.label} musi mieć ${need} (jest ${raw.length}).`)
  }

  return raw.map((item, i) => {
    const where = `${spec.label}, hasło ${i + 1}`
    const q = (item ?? {}) as Record<string, unknown>
    const start = q.start === undefined ? 0 : Number(q.start)
    if (!Number.isFinite(start) || start < 0) {
      throw new QuestionFileError(`${where}: „start” musi być liczbą sekund (np. 0 albo 12.5).`)
    }
    return {
      haslo: text(q.haslo, 'haslo', where),
      tytul: text(q.tytul, 'tytul', where),
      wykonawca: text(q.wykonawca, 'wykonawca', where),
      plik: text(q.plik, 'plik', where),
      start,
    }
  })
}

function parseRound3(raw: unknown): Round3Question[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) throw new QuestionFileError('„runda3” musi być listą.')
  if (raw.length !== R3_TILES) {
    throw new QuestionFileError(`Runda 3 musi mieć dokładnie ${hasla(R3_TILES)} (jest ${raw.length}).`)
  }
  const list = raw.map((item, i) => {
    const where = `Runda 3, zagadka ${i + 1}`
    const q = (item ?? {}) as Record<string, unknown>
    const wartosc = q.wartosc === undefined ? undefined : Number(q.wartosc)
    if (wartosc !== undefined && !(wartosc > 0)) throw new QuestionFileError(`${where}: „wartosc” musi być liczbą punktów.`)
    return {
      tytul: text(q.tytul, 'tytul', where),
      wykonawca: text(q.wykonawca, 'wykonawca', where),
      podpowiedz: typeof q.podpowiedz === 'string' ? q.podpowiedz.trim() : '',
      nuty: typeof q.nuty === 'string' && q.nuty.trim() ? q.nuty.trim() : undefined,
      wartosc: wartosc ?? 0,
    }
  })
  // Bez „wartosc” w pliku: jak w TVP — pięć zagadek po 200 pkt i jedna (ostatnia) za 400 pkt.
  const anySet = list.some((q) => q.wartosc > 0)
  return list.map((q, i) => ({
    ...q,
    wartosc: q.wartosc > 0 ? q.wartosc : anySet ? R3_VALUE : i === list.length - 1 ? R3_BIG_VALUE : R3_VALUE,
  }))
}

/** Sprawdza i porządkuje zawartość pytania.json. */
export function parseQuestionSet(json: unknown): QuestionSet {
  if (!json || typeof json !== 'object') throw new QuestionFileError('Plik pytania.json jest pusty albo uszkodzony.')
  const raw = json as Record<string, unknown>
  return {
    edycja: typeof raw.edycja === 'string' && raw.edycja.trim() ? raw.edycja.trim() : 'Edycja bez nazwy',
    runda1: parseList(raw.runda1, { key: 'runda1', label: 'Runda 1', count: 5 }),
    runda2: parseList(raw.runda2, { key: 'runda2', label: 'Runda 2', count: 3, optional: true }),
    dogrywka2: parseList(raw.dogrywka2, { key: 'dogrywka2', label: 'Dogrywka', count: [0, 5], optional: true }),
    runda3: parseRound3(raw.runda3),
  }
}

/** Wszystkie pytania edycji (do sprawdzenia, czy są pliki). */
export function allQuestions(set: QuestionSet): Question[] {
  return [...set.runda1, ...set.runda2, ...set.dogrywka2]
}

/** Wczytuje pliki wybrane przez <input webkitdirectory>. */
export async function loadEdition(files: FileList | File[]): Promise<LoadedEdition> {
  const list = Array.from(files)
  const jsonFile = list.find((f) => f.name.toLowerCase() === 'pytania.json')
  if (!jsonFile) throw new QuestionFileError('W folderze nie ma pliku pytania.json.')

  let json: unknown
  try {
    json = JSON.parse(await jsonFile.text())
  } catch {
    throw new QuestionFileError('pytania.json ma błąd składni (sprawdź przecinki i cudzysłowy).')
  }
  const set = parseQuestionSet(json)

  const audio = new Map<string, string>()
  for (const f of list) {
    if (/\.(mp3|m4a|wav|ogg|aac)$/i.test(f.name)) audio.set(f.name, URL.createObjectURL(f))
  }
  const images = new Map<string, File>()
  for (const f of list) {
    if (/\.(png|jpe?g|webp)$/i.test(f.name)) images.set(f.name, f)
  }
  const wanted = [
    ...allQuestions(set).map((q) => q.plik),
    ...set.runda3.map((q) => q.nuty).filter((n): n is string => Boolean(n)),
  ]
  const missing = [...new Set(wanted)].filter((name) => !audio.has(name) && !images.has(name))
  const introFile = list.find((f) => /^czolowka\.(mp3|wav|m4a|aac|ogg)$/i.test(f.name))
  const intro = introFile ? audio.get(introFile.name) : undefined
  return { set, audio, missing, intro, images }
}

/** Zwalnia pamięć po poprzedniej edycji. */
export function releaseEdition(edition: LoadedEdition | null): void {
  edition?.audio.forEach((url) => URL.revokeObjectURL(url))
}
