import { onValue, ref } from 'firebase/database'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import type { Buzz, GameState, LiveQuestion, Round1State, Round1Tile, StationKey } from './types'

const EMPTY: GameState = { punkty: { '1': 0, '2': 0, '3': 0 } }

/** Firebase zapisuje tablice jako obiekty {0:…,1:…} — zamieniamy z powrotem na listę. */
function toTiles(raw: unknown): Round1Tile[] {
  if (!raw) return []
  const values = Array.isArray(raw) ? raw : Object.values(raw as Record<string, Round1Tile>)
  return values.filter(Boolean) as Round1Tile[]
}

/** Cały stan gry na żywo (/gra), wspólny dla wszystkich widoków. */
export function useGame(): GameState {
  const [state, setState] = useState<GameState>(EMPTY)
  useEffect(
    () =>
      onValue(ref(db, 'gra'), (snap) => {
        const raw = (snap.val() ?? {}) as Record<string, unknown>
        const punkty = (raw.punkty ?? {}) as Partial<Record<StationKey, number>>
        const r1 = raw.runda1 as (Omit<Round1State, 'hasla'> & { hasla?: unknown }) | undefined
        setState({
          runda: typeof raw.runda === 'number' ? raw.runda : undefined,
          punkty: { '1': punkty['1'] ?? 0, '2': punkty['2'] ?? 0, '3': punkty['3'] ?? 0 },
          runda1: r1 ? { ...r1, hasla: toTiles(r1.hasla) } : undefined,
          pytanie: (raw.pytanie as LiveQuestion | undefined) ?? undefined,
          zgloszenie: (raw.zgloszenie as Buzz | undefined) ?? undefined,
        })
      }),
    [],
  )
  return state
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
