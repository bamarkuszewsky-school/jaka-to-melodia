import { ref, serverTimestamp, set } from 'firebase/database'
import { db } from '../firebase'
import type { StationKey } from './types'

/**
 * Zgłoszenie zawodnika w grze. Reguły bazy przyjmują tylko PIERWSZE zgłoszenie,
 * tylko gdy muzyka gra i tylko od niezablokowanego stanowiska —
 * każde kolejne kończy się odmową, więc „kto pierwszy” rozstrzyga serwer.
 */
export function buzzIn(stanowisko: StationKey): Promise<void> {
  return set(ref(db, 'gra/zgloszenie'), { stanowisko, czas: serverTimestamp() })
}
