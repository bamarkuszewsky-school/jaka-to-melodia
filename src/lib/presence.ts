import { onDisconnect, onValue, ref, remove, serverTimestamp, set } from 'firebase/database'
import { useEffect, useState } from 'react'
import { db } from './firebase'

/**
 * Klucze obecności w bazie (/obecnosc/<klucz>).
 * Reguły bazy pozwalają każdej roli zapisać tylko swoje klucze.
 */
export type PresenceKey = 'host' | 'tablica' | 'tech' | 'stream' | 'stanowisko1' | 'stanowisko2' | 'stanowisko3'

export const PRESENCE_LABELS: Record<PresenceKey, string> = {
  host: 'Host',
  tablica: 'Tablica',
  tech: 'Tech Support',
  stream: 'Widok /stream',
  stanowisko1: 'Stanowisko 1',
  stanowisko2: 'Stanowisko 2',
  stanowisko3: 'Stanowisko 3',
}

/** Czy ta przeglądarka ma teraz połączenie z Firebase. */
export function useConnected(): boolean {
  const [connected, setConnected] = useState(false)
  useEffect(() => onValue(ref(db, '.info/connected'), (snap) => setConnected(snap.val() === true)), [])
  return connected
}

/**
 * Zgłasza obecność urządzenia. Gdy urządzenie zniknie (zamknięta karta,
 * utrata Wi‑Fi), Firebase sam usunie wpis.
 */
export function usePresence(key: PresenceKey | null): void {
  useEffect(() => {
    if (!key) return
    const myRef = ref(db, `obecnosc/${key}`)
    const unsub = onValue(ref(db, '.info/connected'), (snap) => {
      if (snap.val() !== true) return
      onDisconnect(myRef)
        .remove()
        .then(() => set(myRef, { od: serverTimestamp() }))
        .catch((e) => console.error('Obecność:', e))
    })
    return () => {
      unsub()
      remove(myRef).catch(() => {})
    }
  }, [key])
}

/** Lista urządzeń, które są teraz online. */
export function usePresenceList(): Partial<Record<PresenceKey, { od: number }>> {
  const [list, setList] = useState<Partial<Record<PresenceKey, { od: number }>>>({})
  useEffect(() => onValue(ref(db, 'obecnosc'), (snap) => setList(snap.val() ?? {})), [])
  return list
}
