import type { LoadedEdition } from '../game/questions'
import { R3_BIG_VALUE, R3_VALUE } from '../game/rules3'
import type { FinalQuestion, Question, QuestionSet, Round3Question } from '../game/types'
import type { EditionRecord, ScanResult, SongRecord, Songs } from './library'

/**
 * Zamienia wylosowaną edycję (id utworów w bazie) + wczytany folder na to,
 * czego używają panele rund: pytania z odpowiedziami i adresy plików w pamięci MacBooka.
 * Adresy (blob:) daje `urlFor` — wspólna pamięć podręczna na cały wczytany folder.
 */
export function buildEdition(
  rec: EditionRecord,
  songs: Songs,
  scan: ScanResult<File>,
  urlFor: (f: File) => string,
): LoadedEdition {
  const files = new Map<string, File>()
  for (const s of scan.songs.values()) {
    if (s.audio && s.audioPath) files.set(s.audioPath, s.audio)
    if (s.nuty && s.nutyPath) files.set(s.nutyPath, s.nuty)
  }
  const audio = new Map<string, string>()
  const images = new Map<string, File>()
  const missing: string[] = []

  const get = (id: string): SongRecord => {
    const s = songs[id]
    if (!s) missing.push(`(usunięty utwór ${id})`)
    return s ?? { runda: '1', tytul: '?', wykonawca: '?' }
  }
  const addAudio = (s: SongRecord, required: boolean) => {
    if (!s.plik) return
    const f = files.get(s.plik)
    if (f) {
      audio.set(s.plik, urlFor(f))
    } else if (required) missing.push(s.plik)
  }

  const question = (id: string, haslo: (s: SongRecord) => string): Question => {
    const s = get(id)
    addAudio(s, true)
    return { haslo: haslo(s), tytul: s.tytul, wykonawca: s.wykonawca, plik: s.plik ?? '', start: s.start ?? 0, refren: s.refren }
  }

  const r3 = rec.utwory.runda3.map((id, i, all): Round3Question => {
    const s = get(id)
    addAudio(s, false)
    if (s.nuty) {
      const f = files.get(s.nuty)
      if (f) images.set(s.nuty, f)
      else missing.push(s.nuty)
    }
    return {
      tytul: s.tytul,
      wykonawca: s.wykonawca,
      podpowiedz: s.podpowiedz ?? '',
      nuty: s.nuty,
      wartosc: i === all.length - 1 ? R3_BIG_VALUE : R3_VALUE,
      plik: s.plik,
      refren: s.refren,
    }
  })

  const final = rec.utwory.final.map((id): FinalQuestion => {
    const s = get(id)
    addAudio(s, true)
    return { tytul: s.tytul, wykonawca: s.wykonawca, plik: s.plik ?? '', start: s.start ?? 0, refren: s.refren }
  })

  const set: QuestionSet = {
    edycja: rec.nazwa,
    // Runda 1: na tablicy wykonawca zamiast hasła.
    runda1: rec.utwory.runda1.map((id) => question(id, (s) => s.wykonawca)),
    runda2: rec.utwory.runda2.map((id) => question(id, (s) => s.haslo ?? s.wykonawca)),
    dogrywka2: rec.utwory.dogrywka2.map((id) => question(id, (s) => s.haslo ?? s.wykonawca)),
    runda3: r3,
    final,
  }
  const intro = scan.intro ? urlFor(scan.intro) : undefined
  return { set, audio, images, missing: [...new Set(missing)], intro }
}
