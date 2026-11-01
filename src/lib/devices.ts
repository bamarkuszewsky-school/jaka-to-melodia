import { onValue, ref, remove, serverTimestamp, update } from 'firebase/database'
import { useEffect, useState } from 'react'
import { db } from './firebase'
import type { Stanowisko } from './roles'

/**
 * iPady zawodników. Każdy iPad ma swój identyfikator (zapisany w przeglądarce) i krótki kod.
 * Zawodnik wciska „Jestem przy stanowisku” → host widzi zgłoszenie i przypisuje stanowisko.
 * Potem iPad nie może sam zmienić stanowiska — robi to tylko host.
 *   /urzadzenia/<id> = { kod, zgloszenie, stanowisko? }
 */

export interface Device {
  kod?: string
  zgloszenie?: number
  stanowisko?: Stanowisko
}

const KEY = 'jtm-ipad'
const ALPHABET = 'ABCDEFGHJKLMNPRSTUWXYZ23456789'

function randomId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** Stały identyfikator tego iPada (w pamięci przeglądarki). */
export function deviceId(): string {
  try {
    const old = localStorage.getItem(KEY)
    if (old && /^[A-Z0-9]{12}$/.test(old)) return old
    const id = randomId()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    return randomId()
  }
}

export const deviceCode = (id: string) => id.slice(0, 3)

/** undefined = wczytywanie, null = iPad nieznany. */
export function useDevice(id: string): Device | null | undefined {
  const [d, setD] = useState<Device | null | undefined>(undefined)
  useEffect(() => onValue(ref(db, `urzadzenia/${id}`), (s) => setD((s.val() as Device | null) ?? null)), [id])
  return d
}

export function useDevices(): Record<string, Device> {
  const [d, setD] = useState<Record<string, Device>>({})
  useEffect(() => onValue(ref(db, 'urzadzenia'), (s) => setD((s.val() as Record<string, Device> | null) ?? {})), [])
  return d
}

export function registerDevice(id: string): Promise<void> {
  return update(ref(db, `urzadzenia/${id}`), { kod: deviceCode(id), zgloszenie: serverTimestamp() })
}

/** Host: przypisuje iPad do stanowiska (inny iPad na tym stanowisku zostaje odpięty). */
export function assignDevice(id: string, s: Stanowisko, all: Record<string, Device>): Promise<void> {
  const changes: Record<string, unknown> = { [`${id}/stanowisko`]: s }
  for (const [other, d] of Object.entries(all)) {
    if (other !== id && d.stanowisko === s) changes[other] = null
  }
  return update(ref(db, 'urzadzenia'), changes)
}

/** Host: odpina iPad — wraca do ekranu „Jestem przy stanowisku”. */
export function releaseDevice(id: string): Promise<void> {
  return remove(ref(db, `urzadzenia/${id}`))
}

export function releaseAllDevices(): Promise<void> {
  return remove(ref(db, 'urzadzenia'))
}
