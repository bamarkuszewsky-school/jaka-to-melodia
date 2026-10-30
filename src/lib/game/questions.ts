import type { QuestionSet, Round1Question } from './types'

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
}

export class QuestionFileError extends Error {}

function text(v: unknown, field: string, where: string): string {
  if (typeof v !== 'string' || v.trim() === '') {
    throw new QuestionFileError(`${where}: brakuje pola „${field}”.`)
  }
  return v.trim()
}

function parseRound1(raw: unknown): Round1Question[] {
  if (!Array.isArray(raw)) throw new QuestionFileError('Brakuje listy „runda1”.')
  if (raw.length !== 5) {
    throw new QuestionFileError(`Runda 1 musi mieć dokładnie 5 haseł (jest ${raw.length}).`)
  }
  return raw.map((item, i) => {
    const where = `Runda 1, hasło ${i + 1}`
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
    runda1: parseRound1(raw.runda1),
  }
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
  const missing = set.runda1.map((q) => q.plik).filter((name) => !audio.has(name))
  return { set, audio, missing }
}

/** Zwalnia pamięć po poprzedniej edycji. */
export function releaseEdition(edition: LoadedEdition | null): void {
  edition?.audio.forEach((url) => URL.revokeObjectURL(url))
}
