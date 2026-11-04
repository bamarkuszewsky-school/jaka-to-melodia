import { onValue, ref } from 'firebase/database'
import { useEffect, useState } from 'react'
import { useAuth } from './auth'
import { db } from './firebase'

/**
 * Wersja protokołu klienta. Zapisy zawodnika / muzyka / obecność niosą pole `k`,
 * a reguły bazy przyjmują tylko `k` ≥ KLIENT — stare wersje aplikacji (bez `k`)
 * nie mogą już nic zapisać ani pokazać się jako „online”.
 */
export const KLIENT = 2

/** Wersja, w której działa ta karta przeglądarki. */
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'

const CHECK_MS = 60_000

/** Najnowsza wersja opublikowana na GitHub Pages (null = nie wiadomo, np. w trybie dev). */
export function useLatestVersion(): string | null {
  const [latest, setLatest] = useState<string | null>(null)
  useEffect(() => {
    if (BUILD_ID === 'dev' || import.meta.env.DEV) return
    let alive = true
    const check = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { id?: string }
        if (alive && data.id) setLatest(data.id)
      } catch {
        /* brak sieci — sprawdzimy później */
      }
    }
    check()
    const t = setInterval(check, CHECK_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])
  return latest
}

/**
 * Samoczynne odświeżenie po wgraniu nowej wersji (tablica, iPady, muzyk, OBS).
 * Tylko wtedy, gdy nie trwa gra — w trakcie rundy strona nie przeładuje się sama.
 * Panel hosta nie odświeża się sam (zgubiłby wczytany folder) — pokazuje komunikat.
 */
export function useAutoUpdate(enabled: boolean): { updateReady: boolean; latest: string | null } {
  const latest = useLatestVersion()
  const { user } = useAuth()
  // null = jeszcze nie wiemy, czy trwa gra (wtedy nie odświeżamy).
  const [running, setRunning] = useState<boolean | null>(null)
  const updateReady = Boolean(latest && latest !== BUILD_ID)

  useEffect(() => {
    if (!user) return
    return onValue(
      ref(db, 'gra/runda'),
      (snap) => setRunning(snap.val() !== null),
      () => setRunning(null),
    )
  }, [user])

  useEffect(() => {
    if (enabled && updateReady && latest && (running === false || !user)) reloadTo(latest)
  }, [enabled, updateReady, running, user, latest])

  return { updateReady, latest }
}

/**
 * Przeładowanie z nowym adresem (?v=…), żeby ominąć pamięć podręczną GitHub Pages.
 * Każdą wersję próbujemy tylko raz — bez ryzyka pętli odświeżania.
 */
export function reloadTo(version: string): void {
  const key = 'jtm-reload'
  try {
    if (sessionStorage.getItem(key) === version) return
    sessionStorage.setItem(key, version)
  } catch {
    /* bez pamięci sesji — trudno, odświeżamy raz */
  }
  window.location.replace(`${window.location.pathname}?v=${version}${window.location.hash}`)
}
