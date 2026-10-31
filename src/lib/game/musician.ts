import { onValue, ref } from 'firebase/database'
import { useEffect, useState } from 'react'
import { db } from '../firebase'

/** To, co widzi muzyk przy aktualnej zagadce rundy 3 (tylko muzyk i host mają dostęp). */
export interface MusicianSheet {
  tytul: string
  wykonawca: string
  /** Zrzut nut jako obrazek (data URL) albo brak. */
  nuty?: string | null
}

export function useMusicianSheet(): MusicianSheet | null {
  const [sheet, setSheet] = useState<MusicianSheet | null>(null)
  useEffect(
    () =>
      onValue(
        ref(db, 'muzyk/biezace'),
        (snap) => setSheet((snap.val() as MusicianSheet | null) ?? null),
        () => setSheet(null),
      ),
    [],
  )
  return sheet
}
