import { onValue, ref } from 'firebase/database'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import type {
  BidMove,
  Buzz,
  GameState,
  IntroState,
  LiveQuestion,
  LiveQuestion3,
  Question,
  QuestionSet,
  Round3State,
  Round3Tile,
  Round4State,
  RoundState,
  StationKey,
  Tile,
} from './types'

const EMPTY: GameState = { punkty: { '1': 0, '2': 0, '3': 0 } }

/** Firebase zapisuje tablice jako obiekty {0:…,1:…} — zamieniamy z powrotem na listę. */
function toTiles(raw: unknown): Tile[] {
  if (!raw) return []
  const values = Array.isArray(raw) ? raw : Object.values(raw as Record<string, Tile>)
  return values.filter(Boolean) as Tile[]
}

function toRound(raw: unknown): RoundState | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Omit<RoundState, 'hasla' | 'dogrywki'> & { hasla?: unknown; dogrywki?: unknown }
  return { ...r, hasla: toTiles(r.hasla), dogrywki: r.dogrywki ? toTiles(r.dogrywki) : undefined }
}

function toRound3(raw: unknown): Round3State | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Omit<Round3State, 'hasla' | 'wygrane'> & { hasla?: unknown; wygrane?: Round3State['wygrane'] }
  const hasla = (Array.isArray(r.hasla) ? r.hasla : Object.values((r.hasla ?? {}) as object)) as Round3Tile[]
  return { ...r, hasla: hasla.filter(Boolean), wygrane: r.wygrane ?? {} }
}

function toRound4(raw: unknown): Round4State | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Omit<Round4State, 'utwory'> & { utwory?: unknown }
  const utwory = (Array.isArray(r.utwory) ? r.utwory : Object.values((r.utwory ?? {}) as object)) as Round4State['utwory']
  return { ...r, utwory: utwory.filter(Boolean), zdobyte: r.zdobyte ?? 0 }
}

/** Cały stan gry na żywo (/gra), wspólny dla wszystkich widoków. */
export function useGame(): GameState {
  const [state, setState] = useState<GameState>(EMPTY)
  useEffect(
    () =>
      onValue(ref(db, 'gra'), (snap) => {
        const raw = (snap.val() ?? {}) as Record<string, unknown>
        const punkty = (raw.punkty ?? {}) as Partial<Record<StationKey, number>>
        const pytanie = raw.pytanie as LiveQuestion | undefined
        setState({
          runda: typeof raw.runda === 'number' ? raw.runda : undefined,
          czolowka: (raw.czolowka as IntroState | undefined) ?? undefined,
          punkty: { '1': punkty['1'] ?? 0, '2': punkty['2'] ?? 0, '3': punkty['3'] ?? 0 },
          runda1: toRound(raw.runda1),
          runda2: toRound(raw.runda2),
          runda3: toRound3(raw.runda3),
          runda4: toRound4(raw.runda4),
          stop4: (raw.stop4 as GameState['stop4']) ?? undefined,
          pytanie3: (raw.pytanie3 as LiveQuestion3 | undefined) ?? undefined,
          ruch: (raw.ruch as BidMove | undefined) ?? undefined,
          zagrane: typeof raw.zagrane === 'number' ? raw.zagrane : undefined,
          // Zgodność z wersją 0.3 (pytanie bez numeru rundy = runda 1).
          pytanie: pytanie ? { ...pytanie, runda: pytanie.runda ?? 1 } : undefined,
          zgloszenie: (raw.zgloszenie as Buzz | undefined) ?? undefined,
        })
      }),
    [],
  )
  return state
}

/** Pytanie (z odpowiedzią) dla aktualnej piosenki — tylko u hosta, z wczytanego folderu. */
export function questionFor(set: QuestionSet, p: Pick<LiveQuestion, 'runda' | 'haslo' | 'dogrywka'>): Question | undefined {
  if (p.dogrywka) return set.dogrywka2[p.haslo]
  return p.runda === 2 ? set.runda2[p.haslo] : set.runda1[p.haslo]
}

/** Różnica między zegarem tego urządzenia a zegarem serwera Firebase (ms). */
function useServerOffset(): number {
  const [offset, setOffset] = useState(0)
  useEffect(() => onValue(ref(db, '.info/serverTimeOffset'), (snap) => setOffset(Number(snap.val()) || 0)), [])
  return offset
}

/**
 * Aktualny czas serwera, odświeżany co klatkę, gdy `active` (poza tym zamrożony).
 * Dzięki temu licznik punktów i odliczanie są takie same na każdym urządzeniu.
 */
export function useServerNow(active: boolean): number {
  const offset = useServerOffset()
  const [now, setNow] = useState(() => Date.now() + offset)
  useEffect(() => {
    if (!active) return
    let raf = 0
    const tick = () => {
      setNow(Date.now() + offset)
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [active, offset])
  return now
}
