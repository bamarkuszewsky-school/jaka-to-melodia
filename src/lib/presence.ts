import { onDisconnect, onValue, ref, remove, serverTimestamp, set } from 'firebase/database'
import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth, db } from './firebase'
import { BUILD_ID, KLIENT } from './version'

/**
 * Klucze obecności w bazie (/obecnosc/<klucz>).
 * Reguły bazy pozwalają każdej roli zapisać tylko swoje klucze.
 */
export type PresenceKey = 'host' | 'tablica' | 'tech' | 'stream' | 'muzyk' | 'stanowisko1' | 'stanowisko2' | 'stanowisko3'

export const PRESENCE_LABELS: Record<PresenceKey, string> = {
  host: 'Host',
  tablica: 'Tablica',
  tech: 'Tech Support',
  stream: 'Widok /stream',
  muzyk: 'Muzyk',
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
        .then(() => set(myRef, { od: serverTimestamp(), wersja: BUILD_ID, k: KLIENT }))
        .catch((e) => console.error('Obecność:', e))
    })
    // Host może wylogować to urządzenie z panelu: zapisuje /wyloguj/<klucz> = czas serwera.
    // Reagujemy tylko na polecenie nowsze niż chwila, w której to urządzenie się zgłosiło.
    let offset = 0
    const unsubOffset = onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
      offset = Number(snap.val()) || 0
    })
    const since = Date.now()
    const unsubKick = onValue(ref(db, `wyloguj/${key}`), (snap) => {
      const at = Number(snap.val())
      if (!at || at < since + offset) return
      remove(myRef).catch(() => {})
      signOut(auth).catch(() => {})
    })
    return () => {
      unsub()
      unsubOffset()
      unsubKick()
      remove(myRef).catch(() => {})
    }
  }, [key])
}

/** Host: wylogowuje urządzenie zgłoszone pod danym kluczem obecności. */
export function kickDevice(key: PresenceKey): Promise<void> {
  return set(ref(db, `wyloguj/${key}`), serverTimestamp())
}

export interface PresenceEntry {
  od: number
  wersja?: string
  /** Wersja protokołu — brak = stara aplikacja, której nie da się wylogować. */
  k?: number
}

/**
 * Lista urządzeń, które są teraz online. Wpisy starych wersji aplikacji (bez `k`) są pomijane —
 * takiego urządzenia nie da się wylogować ani zaktualizować, więc nie liczy się jako zalogowane.
 */
export function usePresenceList(): Partial<Record<PresenceKey, PresenceEntry>> {
  const [list, setList] = useState<Partial<Record<PresenceKey, PresenceEntry>>>({})
  useEffect(
    () =>
      onValue(ref(db, 'obecnosc'), (snap) => {
        const raw = (snap.val() ?? {}) as Record<string, PresenceEntry>
        setList(Object.fromEntries(Object.entries(raw).filter(([, e]) => isCurrentClient(e))) as Partial<Record<PresenceKey, PresenceEntry>>)
      }),
    [],
  )
  return list
}

export function isCurrentClient(e: PresenceEntry | null | undefined): boolean {
  return Boolean(e && typeof e.k === 'number' && e.k >= KLIENT)
}

/** Host: usuwa z listy obecności wpisy starych wersji aplikacji (sprząta „duchy”). */
export function useStalePresenceCleanup(active: boolean): void {
  useEffect(() => {
    if (!active) return
    return onValue(ref(db, 'obecnosc'), (snap) => {
      const raw = (snap.val() ?? {}) as Record<string, PresenceEntry>
      for (const [key, e] of Object.entries(raw)) {
        if (!isCurrentClient(e)) remove(ref(db, `obecnosc/${key}`)).catch(() => {})
      }
    })
  }, [active])
}
