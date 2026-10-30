import { onValue, ref, update } from 'firebase/database'
import { useEffect, useState } from 'react'
import { db } from './firebase'
import { STANOWISKA, type Stanowisko } from './roles'

/**
 * NAZWY STANOWISK — host podpisuje stanowiska 1–3 nazwami klas (np. „4BT”).
 * Zapis w bazie: /gra/stanowiska/<numer>/nazwa — pisze tylko host, czytają wszyscy zalogowani.
 * Nazwa pojawia się na iPadzie zawodnika, tablicy, w panelach i na streamie.
 */

export const MAX_NAZWA = 20

export type StationNames = Record<Stanowisko, string>

const EMPTY: StationNames = { 1: '', 2: '', 3: '' }

/** Surowe nazwy z bazy (puste, gdy host jeszcze nic nie wpisał). */
export function useStationNames(): StationNames {
  const [names, setNames] = useState<StationNames>(EMPTY)
  useEffect(
    () =>
      onValue(ref(db, 'gra/stanowiska'), (snap) => {
        const raw = (snap.val() ?? {}) as Record<string, { nazwa?: string } | undefined>
        setNames({
          1: raw['1']?.nazwa ?? '',
          2: raw['2']?.nazwa ?? '',
          3: raw['3']?.nazwa ?? '',
        })
      }),
    [],
  )
  return names
}

/** Nazwa do wyświetlenia: nazwa klasy albo „Stanowisko N”, gdy pole jest puste. */
export function stationLabel(names: StationNames, stanowisko: Stanowisko): string {
  return names[stanowisko].trim() || `Stanowisko ${stanowisko}`
}

/** Czy host nadał temu stanowisku nazwę klasy. */
export function hasClassName(names: StationNames, stanowisko: Stanowisko): boolean {
  return names[stanowisko].trim() !== ''
}

/** Zapisuje wszystkie trzy nazwy naraz. Puste pole usuwa nazwę. */
export function saveStationNames(names: StationNames): Promise<void> {
  const changes: Record<string, string | null> = {}
  for (const s of STANOWISKA) {
    const clean = names[s].trim().slice(0, MAX_NAZWA)
    changes[`${s}/nazwa`] = clean || null
  }
  return update(ref(db, 'gra/stanowiska'), changes)
}

/** To samo co stationLabel, ale dla klucza z bazy ('1' | '2' | '3'). */
export function labelForKey(names: StationNames, key: '1' | '2' | '3'): string {
  return stationLabel(names, Number(key) as Stanowisko)
}
