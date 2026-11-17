import type { StationKey } from '../game/types'
import { STATION_KEYS } from '../game/types'
import { classKey, type EditionRecord, type RankingScope } from './library'

/**
 * SEZON I DRABINKA — czysta logika (bez Firebase).
 *
 * Etapy: eliminacje → ćwierćfinały (12 klas) → półfinały (6) → finał (3), osobno finał nauczycieli.
 * Mecz = jedna edycja, 3 klasy (w eliminacjach wyjątkowo 2, gdy klas nie da się podzielić po 3).
 * Awans: wszyscy zwycięzcy edycji etapu, a wolne miejsca uzupełniają klasy z największą liczbą
 * punktów w tym etapie („awans z rankingu”). Kolejny etap układa się sam, rozstawiając klasy
 * według punktów (najlepsze trafiają do różnych edycji); host może go potem zmienić.
 */

export type StageKey = 'eliminacje' | 'cwierc' | 'polfinal' | 'final' | 'nauczyciele'

/** Etapy drabinki klas, po kolei. */
export const CLASS_STAGES: readonly StageKey[] = ['eliminacje', 'cwierc', 'polfinal', 'final']
export const ALL_STAGES: readonly StageKey[] = [...CLASS_STAGES, 'nauczyciele']

export const STAGE_LABEL: Record<StageKey, string> = {
  eliminacje: 'Eliminacje',
  cwierc: 'Ćwierćfinały',
  polfinal: 'Półfinały',
  final: 'Finał',
  nauczyciele: 'Finał nauczycieli',
}

/** Nazwa etapu w liczbie pojedynczej — do czołówki, intra rund i plansz („Ćwierćfinał”). */
export const STAGE_NAME: Record<StageKey, string> = {
  eliminacje: 'Eliminacje',
  cwierc: 'Ćwierćfinał',
  polfinal: 'Półfinał',
  final: 'Wielki finał',
  nauczyciele: 'Finał nauczycieli',
}

/** Ile klas gra w etapie (eliminacje — tyle, ile wpisano). */
export const STAGE_SIZE: Partial<Record<StageKey, number>> = { cwierc: 12, polfinal: 6, final: 3, nauczyciele: 3 }

export interface Match {
  klasy: string[]
  /** Edycja, w której rozegrano (albo gra się) ten mecz. */
  edycja?: string
}

export interface Season {
  nazwa: string
  utworzono?: number
  /** Daty RRRR-MM-DD wpisane przy „Rozpocznij sezon” / „Zakończ sezon”. */
  start?: string
  koniec?: string
  /** Edycje rozegrane przed startem sezonu, doliczone do jego rankingu. */
  dolicz?: string[]
  etapy: Partial<Record<StageKey, Match[]>>
}

export function nextStage(k: StageKey): StageKey | undefined {
  const i = CLASS_STAGES.indexOf(k)
  return i >= 0 && i < CLASS_STAGES.length - 1 ? CLASS_STAGES[i + 1] : undefined
}

export function prevStage(k: StageKey): StageKey | undefined {
  const i = CLASS_STAGES.indexOf(k)
  return i > 0 ? CLASS_STAGES[i - 1] : undefined
}

/** Z Firebase (tablice mogą przyjść jako obiekty albo bez pustych pól). */
export function normalizeSeason(raw: unknown): Season | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Partial<Season> & { etapy?: Record<string, unknown> }
  const etapy: Partial<Record<StageKey, Match[]>> = {}
  for (const k of ALL_STAGES) {
    const list = r.etapy?.[k]
    if (!list) continue
    const arr = Array.isArray(list) ? list : Object.values(list as Record<string, unknown>)
    etapy[k] = arr.filter(Boolean).map((m) => {
      const mm = m as Partial<Match> & { klasy?: unknown }
      const klasy = Array.isArray(mm.klasy) ? mm.klasy : Object.values((mm.klasy ?? {}) as Record<string, string>)
      return { klasy: klasy.map((x) => (typeof x === 'string' ? x : '')), ...(mm.edycja ? { edycja: mm.edycja } : {}) }
    })
  }
  const dolicz = Array.isArray(r.dolicz) ? r.dolicz : r.dolicz ? Object.values(r.dolicz as Record<string, string>) : undefined
  return { nazwa: r.nazwa ?? 'Sezon', utworzono: r.utworzono, start: r.start, koniec: r.koniec, ...(dolicz ? { dolicz } : {}), etapy }
}

// ---------- Eliminacje: podział wpisanych klas na edycje ----------

/** Lista klas z pola tekstowego (jedna w linii albo po przecinku), bez pustych i powtórek. */
export function parseClassList(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split(/[\n,;]+/)) {
    const k = raw.trim().replace(/\s+/g, ' ')
    if (!k || seen.has(classKey(k))) continue
    seen.add(classKey(k))
    out.push(k)
  }
  return out
}

/** Dzieli klasy na mecze po 3 (gdy się nie da — ostatnie mecze po 2). Z `shuffle` w losowej kolejności. */
export function splitIntoMatches(classes: string[], rng?: () => number): Match[] {
  const list = [...classes]
  if (rng) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
  }
  const n = list.length
  if (n === 0) return []
  const groups = Math.ceil(n / 3)
  const twos = groups * 3 - n // ile meczów po 2 klasy
  const out: Match[] = []
  let at = 0
  for (let g = 0; g < groups; g++) {
    const size = g >= groups - twos ? 2 : 3
    out.push({ klasy: list.slice(at, at + size) })
    at += size
  }
  return out
}

// ---------- Wyniki meczów ----------

export interface SlotResult {
  klasa: string
  punkty: number
  /** 1 = wygrał edycję (grał w finale), 2 = odpadł w rundzie 3, 3 = odpadł w rundzie 2. */
  miejsce: number
}

/** Wynik meczu z zakończonej edycji (kolejność: miejsca). */
export function matchResult(m: Match, editions: Record<string, EditionRecord>): SlotResult[] | undefined {
  const e = m.edycja ? editions[m.edycja] : undefined
  if (!e?.zakonczono || !e.wyniki) return undefined
  return STATION_KEYS.map((k: StationKey) => e.wyniki?.[k])
    .filter((w): w is SlotResult => Boolean(w && w.klasa?.trim()))
    .map((w) => ({ klasa: w.klasa.trim(), punkty: w.punkty, miejsce: w.miejsce }))
    .sort((a, b) => a.miejsce - b.miejsce)
}

export function stageMatches(season: Season | undefined, k: StageKey): Match[] {
  return season?.etapy[k] ?? []
}

export function stageComplete(matches: Match[], editions: Record<string, EditionRecord>): boolean {
  return matches.length > 0 && matches.every((m) => matchResult(m, editions))
}

/** Ile miejsc w następnym etapie przypadnie klasom, które nie wygrały edycji („awans z rankingu”). */
export function wildcardSlots(k: StageKey, matches: Match[]): number {
  const next = nextStage(k)
  const size = next ? STAGE_SIZE[next] : undefined
  if (!size) return 0
  return Math.max(0, size - matches.length)
}

export interface Qualifier extends SlotResult {
  /** Awans z rankingu (nie wygrał edycji). */
  dzika: boolean
}

/**
 * Kto przechodzi z etapu: zwycięzcy edycji (od najlepszego wyniku), wolne miejsca —
 * pozostałe klasy z największą liczbą punktów w tym etapie (przy remisie lepsze miejsce w edycji).
 */
export function qualifiers(matches: Match[], editions: Record<string, EditionRecord>, size: number): Qualifier[] {
  const all = matches.flatMap((m) => matchResult(m, editions) ?? [])
  const byPoints = (a: SlotResult, b: SlotResult) => b.punkty - a.punkty || a.miejsce - b.miejsce || a.klasa.localeCompare(b.klasa, 'pl')
  const winners = all.filter((r) => r.miejsce === 1).sort(byPoints)
  const rest = all.filter((r) => r.miejsce !== 1).sort(byPoints)
  return [...winners.map((r) => ({ ...r, dzika: false })), ...rest.map((r) => ({ ...r, dzika: true }))].slice(0, size)
}

/**
 * Rozstawienie: klasy od najlepszej, „wężykiem” po edycjach (1, 2, 3, 3, 2, 1, …),
 * więc najlepsze trafiają do różnych edycji.
 */
export function seedMatches(ordered: string[], perMatch = 3): Match[] {
  const count = Math.ceil(ordered.length / perMatch)
  const out: Match[] = Array.from({ length: count }, () => ({ klasy: [] }))
  ordered.forEach((klasa, i) => {
    const round = Math.floor(i / count)
    const pos = i % count
    out[round % 2 === 0 ? pos : count - 1 - pos].klasy.push(klasa)
  })
  return out
}

/** Następny etap ułożony z wyników poprzedniego (albo nic, gdy poprzedni jeszcze trwa). */
export function buildNextStage(season: Season, k: StageKey, editions: Record<string, EditionRecord>): Match[] | undefined {
  const next = nextStage(k)
  const size = next ? STAGE_SIZE[next] : undefined
  const matches = stageMatches(season, k)
  if (!next || !size || !stageComplete(matches, editions)) return undefined
  return seedMatches(qualifiers(matches, editions, size).map((q) => q.klasa))
}

/** Pierwszy etap z kompletem wyników, po którym następny jest jeszcze pusty — do automatycznego ułożenia. */
export function stageToAutoFill(season: Season, editions: Record<string, EditionRecord>): StageKey | undefined {
  for (const k of CLASS_STAGES) {
    const next = nextStage(k)
    if (!next) return undefined
    if (stageMatches(season, next).length > 0) continue
    return stageComplete(stageMatches(season, k), editions) ? k : undefined
  }
  return undefined
}

// ---------- Widok drabinki (tablica, live) ----------

export type SlotState = 'czeka' | 'gra' | 'awans' | 'dzika' | 'odpada' | 'niepewny' | 'mistrz'

export interface LadderSlot {
  klasa: string
  punkty?: number
  miejsce?: number
  stan: SlotState
  /** Krótki opis wyniku: „wygrywa”, „odpada w rundzie 2”, „awans z rankingu”… */
  opis?: string
}

export interface LadderMatch {
  nr: number
  edycja?: string
  data?: string
  stan: 'czeka' | 'gra' | 'koniec'
  klasy: LadderSlot[]
}

export interface LadderStage {
  etap: StageKey
  nazwa: string
  mecze: LadderMatch[]
  /** Ile klas wejdzie dalej z rankingu (gdy > 0). */
  dzikie?: number
}

export interface LadderView {
  sezon: string
  etapy: LadderStage[]
  mistrz?: string
  mistrzNauczycieli?: string
}

/** Firebase gubi puste tablice — przywracamy je, żeby widok porównywał się 1:1. */
export function normalizeLadder(raw: LadderView): LadderView {
  const arr = <T,>(v: T[] | Record<string, T> | undefined): T[] => (Array.isArray(v) ? v : v ? Object.values(v) : [])
  return {
    ...raw,
    etapy: arr(raw.etapy).map((e) => ({
      ...e,
      mecze: arr(e.mecze).map((m) => ({ ...m, klasy: arr(m.klasy) })),
    })),
  }
}

const OUT_TEXT: Record<number, string> = { 2: 'odpada w rundzie 3', 3: 'odpada w rundzie 2' }

export function ladderView(season: Season, editions: Record<string, EditionRecord>, currentEdition?: string | null): LadderView {
  const etapy: LadderStage[] = []
  let mistrz: string | undefined
  let mistrzNauczycieli: string | undefined

  for (const k of ALL_STAGES) {
    const matches = stageMatches(season, k)
    if (matches.length === 0 && k !== 'eliminacje') {
      etapy.push({ etap: k, nazwa: STAGE_LABEL[k], mecze: [] })
      continue
    }
    const next = nextStage(k)
    const size = next ? STAGE_SIZE[next] : undefined
    const done = stageComplete(matches, editions)
    const dzikie = wildcardSlots(k, matches)
    const passed = done && size ? new Set(qualifiers(matches, editions, size).map((q) => classKey(q.klasa))) : undefined

    const mecze = matches.map((m, i): LadderMatch => {
      const e = m.edycja ? editions[m.edycja] : undefined
      const res = matchResult(m, editions)
      // Bez pól `undefined` — Firebase odrzuca cały zapis, gdy trafi na takie pole.
      const base = { nr: i + 1, ...(e?.nazwa ? { edycja: e.nazwa } : {}), ...(e?.data ? { data: e.data } : {}) }
      if (!res) {
        const playing = Boolean(m.edycja && m.edycja === currentEdition)
        return {
          ...base,
          stan: playing ? 'gra' : 'czeka',
          klasy: m.klasy.filter((x) => x.trim()).map((klasa) => ({ klasa, stan: playing ? 'gra' : 'czeka' })),
        }
      }
      const klasy = res.map((r): LadderSlot => {
        const won = r.miejsce === 1
        let stan: SlotState
        let opis: string
        if (k === 'final' || k === 'nauczyciele') {
          stan = won ? 'mistrz' : 'odpada'
          opis = won ? (k === 'final' ? 'mistrz sezonu' : 'zwycięzcy') : `${r.miejsce}. miejsce`
        } else if (passed) {
          const go = passed.has(classKey(r.klasa))
          stan = go ? (won ? 'awans' : 'dzika') : 'odpada'
          opis = go ? (won ? 'awans' : 'awans z rankingu') : (OUT_TEXT[r.miejsce] ?? 'odpada')
        } else if (won) {
          stan = 'awans'
          opis = 'awans'
        } else {
          stan = dzikie > 0 ? 'niepewny' : 'odpada'
          opis = dzikie > 0 ? `${OUT_TEXT[r.miejsce] ?? 'przegrywa'} · czeka na ranking` : (OUT_TEXT[r.miejsce] ?? 'odpada')
        }
        return { klasa: r.klasa, punkty: r.punkty, miejsce: r.miejsce, stan, opis }
      })
      if (k === 'final') mistrz = res[0]?.klasa
      if (k === 'nauczyciele') mistrzNauczycieli = res[0]?.klasa
      return { ...base, stan: 'koniec', klasy }
    })
    etapy.push({ etap: k, nazwa: STAGE_LABEL[k], mecze, ...(dzikie > 0 ? { dzikie } : {}) })
  }
  return { sezon: season.nazwa, etapy, ...(mistrz ? { mistrz } : {}), ...(mistrzNauczycieli ? { mistrzNauczycieli } : {}) }
}

/** Zakres rankingu dla sezonu: jego edycje, edycje podpięte w drabince i doliczone przy starcie. */
export function rankingScope(id: string, season: Season): RankingScope {
  const dolaczone = new Set<string>(season.dolicz ?? [])
  const nauczyciele = new Set<string>()
  for (const k of ALL_STAGES)
    for (const m of stageMatches(season, k)) {
      if (!m.edycja) continue
      dolaczone.add(m.edycja)
      if (k === 'nauczyciele') nauczyciele.add(m.edycja)
    }
  return { sezon: id, zLuznymi: !season.start, dolaczone, nauczyciele }
}

// ---------- Mecz do następnej edycji ----------

export interface MatchRef {
  etap: StageKey
  mecz: number
}

/** Mecze gotowe do rozegrania (wpisane klasy, bez edycji), w kolejności etapów. */
export function playableMatches(season: Season | undefined): (MatchRef & { klasy: string[] })[] {
  if (!season) return []
  const out: (MatchRef & { klasy: string[] })[] = []
  for (const etap of ALL_STAGES) {
    stageMatches(season, etap).forEach((m, mecz) => {
      const klasy = m.klasy.filter((x) => x.trim())
      if (!m.edycja && klasy.length >= 2) out.push({ etap, mecz, klasy })
    })
  }
  return out
}

/** Nazwa meczu: „Ćwierćfinał 2” / „Eliminacje 7” / „Wielki finał”. */
export function matchLabel(r: MatchRef, season?: Season): string {
  const count = stageMatches(season, r.etap).length
  if (r.etap === 'final' || r.etap === 'nauczyciele' || count === 1) return STAGE_NAME[r.etap]
  return `${STAGE_NAME[r.etap]} ${r.mecz + 1}`
}

// ---------- Pożegnanie na iPadach po edycji ----------

export interface Farewell {
  klasa: string
  tytul: string
  tekst: string
}

/**
 * Napis na iPadach po „Zakończ edycję”: zwycięzca — „Do zobaczenia”, przegrani — „Do zobaczenia w następnym sezonie!”.
 * Gdy z etapu ktoś jeszcze wejdzie z rankingu, przegrani dostają informację, że o awansie zdecydują punkty.
 */
export function farewells(
  wyniki: Partial<Record<StationKey, SlotResult>>,
  etap?: StageKey,
  dzikie = 0,
): Partial<Record<StationKey, Farewell>> {
  const out: Partial<Record<StationKey, Farewell>> = {}
  for (const k of STATION_KEYS) {
    const w = wyniki[k]
    if (!w) continue
    const won = w.miejsce === 1
    const last = etap === 'final' || etap === 'nauczyciele'
    let tekst: string
    if (won) tekst = last ? 'Gratulacje — mistrzowie sezonu! Do zobaczenia!' : 'Do zobaczenia!'
    else if (!last && dzikie > 0) tekst = 'O awansie z rankingu zdecydują punkty po wszystkich edycjach etapu.'
    else tekst = 'Do zobaczenia w następnym sezonie!'
    out[k] = { klasa: w.klasa, tytul: 'Dziękujemy!', tekst }
  }
  return out
}

// ---------- Postęp sezonu (koordynator) ----------

/** Ile edycji ma etap, zanim zostanie ułożony (ćwierćfinały 4, półfinały 2, finał 1, nauczyciele 1). */
const EXPECTED_MATCHES: Partial<Record<StageKey, number>> = { cwierc: 4, polfinal: 2, final: 1, nauczyciele: 1 }

export interface StageProgress {
  etap: StageKey
  nazwa: string
  rozegrane: number
  wszystkie: number
  /** Etap jeszcze nieułożony — liczba edycji to przewidywanie. */
  szacunek: boolean
}

export interface UpcomingMatch {
  etap: StageKey
  /** „Eliminacje 9”, „Ćwierćfinał 2”, „Wielki finał”. */
  nazwa: string
  nr: number
  klasy: string[]
  /** Ten mecz właśnie trwa. */
  teraz: boolean
}

export interface SeasonProgress {
  etapy: StageProgress[]
  rozegrane: number
  doKonca: number
  /** Najbliższe mecze w kolejności etapów (najpierw ten, który trwa). */
  nastepne: UpcomingMatch[]
}

export function seasonProgress(view: LadderView): SeasonProgress {
  const etapy = view.etapy.map((s): StageProgress => {
    const known = s.mecze.length
    const wszystkie = known || EXPECTED_MATCHES[s.etap] || 0
    return { etap: s.etap, nazwa: s.nazwa, rozegrane: s.mecze.filter((m) => m.stan === 'koniec').length, wszystkie, szacunek: known === 0 }
  })
  const nastepne: UpcomingMatch[] = []
  for (const s of view.etapy) {
    for (const m of s.mecze) {
      if (m.stan === 'koniec' || m.klasy.length === 0) continue
      const single = s.mecze.length === 1 || s.etap === 'final' || s.etap === 'nauczyciele'
      const nazwa = single ? STAGE_NAME[s.etap] : `${STAGE_NAME[s.etap]} ${m.nr}`
      nastepne.push({ etap: s.etap, nazwa, nr: m.nr, klasy: m.klasy.map((k) => k.klasa), teraz: m.stan === 'gra' })
    }
  }
  nastepne.sort((a, b) => Number(b.teraz) - Number(a.teraz))
  const rozegrane = etapy.reduce((n, e) => n + e.rozegrane, 0)
  const doKonca = etapy.reduce((n, e) => n + e.wszystkie - e.rozegrane, 0)
  return { etapy, rozegrane, doKonca, nastepne }
}
