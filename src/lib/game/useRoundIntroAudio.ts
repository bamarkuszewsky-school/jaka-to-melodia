import { ref, update } from 'firebase/database'
import { useEffect, useRef } from 'react'
import { db } from '../firebase'
import { ROUND_INTRO_LENGTH } from '../intro/roundTimeline'
import { useServerOffset } from './state'
import type { RoundIntroState } from './types'

/**
 * Host: gdy rusza nowa runda (/gra/zapowiedz), puszcza intro rundy z folderu SYSTEMOWE
 * i zapisuje jego długość, żeby tablica i OBS wiedziały, jak długo pokazywać animację.
 * Stara zapowiedź (np. po odświeżeniu panelu) nie gra drugi raz.
 */
export function useRoundIntroAudio(z: RoundIntroState | undefined, urlFor: (runda: number) => string | undefined) {
  const offset = useServerOffset()
  const handled = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!z) {
      audioRef.current?.pause()
      return
    }
    if (handled.current === z.start) return
    handled.current = z.start
    const elapsed = Date.now() + offset - z.start
    if (elapsed > 3000) return
    const url = urlFor(z.runda)
    const setLength = (ms: number) => {
      if (!z.dlugosc) update(ref(db, 'gra/zapowiedz'), { dlugosc: Math.round(ms) }).catch(() => {})
    }
    if (!url) {
      // Bez dźwięku — krótka plansza z numerem rundy.
      setLength(3500)
      return
    }
    audioRef.current?.pause()
    const a = new Audio(url)
    audioRef.current = a
    a.addEventListener(
      'loadedmetadata',
      () => {
        setLength(Number.isFinite(a.duration) ? a.duration * 1000 : ROUND_INTRO_LENGTH * 1000)
        a.currentTime = Math.max(0, (Date.now() + offset - z.start) / 1000)
        a.play().catch(() => {})
      },
      { once: true },
    )
  }, [z, offset, urlFor])

  useEffect(() => () => audioRef.current?.pause(), [])
}
