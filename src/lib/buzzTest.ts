import { onValue, ref, remove, serverTimestamp, set } from 'firebase/database'
import { useEffect, useState } from 'react'
import { db } from './firebase'
import type { Stanowisko } from './roles'

/**
 * TEST PRZYCISKÓW — pierwsza wersja „buzzera” do sprawdzenia sprzętu i opóźnień.
 * Każde stanowisko może się zgłosić raz (reguły bazy blokują drugi zapis),
 * czas zgłoszenia nadaje serwer Firebase, więc kolejność jest uczciwa.
 * Host czyści zgłoszenia przyciskiem „Reset”.
 */

const PATH = 'test/zgloszenia'

export interface Buzz {
  stanowisko: Stanowisko
  czas: number
}

export function pressBuzz(stanowisko: Stanowisko): Promise<void> {
  return set(ref(db, `${PATH}/stanowisko${stanowisko}`), serverTimestamp())
}

export function resetBuzzes(): Promise<void> {
  return remove(ref(db, PATH))
}

/** Zgłoszenia posortowane od najszybszego. */
export function useBuzzes(): Buzz[] {
  const [buzzes, setBuzzes] = useState<Buzz[]>([])
  useEffect(
    () =>
      onValue(ref(db, PATH), (snap) => {
        const raw = (snap.val() ?? {}) as Record<string, number>
        const list = Object.entries(raw)
          .map(([key, czas]) => ({ stanowisko: Number(key.replace('stanowisko', '')) as Stanowisko, czas }))
          .sort((a, b) => a.czas - b.czas)
        setBuzzes(list)
      }),
    [],
  )
  return buzzes
}
