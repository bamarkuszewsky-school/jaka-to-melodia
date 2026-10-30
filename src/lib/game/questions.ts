import type { Question, QuestionSet } from './types'

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

/** Sprawdza i porządkuje zawartość pytania.json. */
export function parseQuestionSet(json: unknown): QuestionSet {
  if (!json || typeof json !== 'object') throw new QuestionFileError('Plik pytania.json jest pusty albo uszkodzony.')
  const raw = json as Record<string, unknown>
  return {
    edycja: typeof raw.edycja === 'string' && raw.edycja.trim() ? raw.edycja.trim() : 'Edycja bez nazwy',
    runda1: parseList(raw.runda1, { key: 'runda1', label: 'Runda 1', count: 5 }),
    runda2: parseList(raw.runda2, { key: 'runda2', label: 'Runda 2', count: 3, optional: true }),
    dogrywka2: parseList(raw.dogrywka2, { key: 'dogrywka2', label: 'Dogrywka', count: [0, 5], optional: true }),
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
  const missing = [...new Set(allQuestions(set).map((q) => q.plik))].filter((name) => !audio.has(name))
  const introFile = list.find((f) => /^czolowka\.(mp3|wav|m4a|aac|ogg)$/i.test(f.name))
  const intro = introFile ? audio.get(introFile.name) : undefined
  return { set, audio, missing, intro }
}

/** Zwalnia pamięć po poprzedniej edycji. */
export function releaseEdition(edition: LoadedEdition | null): void {
  edition?.audio.forEach((url) => URL.revokeObjectURL(url))
}
