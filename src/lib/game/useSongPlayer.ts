import { useCallback, useEffect, useMemo, useRef } from 'react'
import { SONG_MS } from './rules'

/**
 * Odtwarzacz fragmentu na MacBooku hosta.
 * Gra od sekundy `start` łącznie 15 s (także po wznowieniu), potem sam się zatrzymuje i woła `onTimeout`.
 */
export function useSongPlayer(onTimeout: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startRef = useRef(0)
  const watchRef = useRef<number | null>(null)
  const timeoutRef = useRef(onTimeout)

  useEffect(() => {
    timeoutRef.current = onTimeout
  }, [onTimeout])

  const stopWatch = () => {
    if (watchRef.current !== null) {
      clearInterval(watchRef.current)
      watchRef.current = null
    }
  }

  const getAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'auto'
    }
    return audioRef.current
  }

  /** Wczytuje plik z wyprzedzeniem (po kliknięciu kafelka), żeby start był natychmiastowy. */
  const prepare = useCallback((url: string, startSec: number) => {
    const audio = getAudio()
    if (audio.src === url && startRef.current === startSec) return
    stopWatch()
    audio.pause()
    audio.src = url
    audio.load()
    startRef.current = startSec
  }, [])

  const armWatch = (audio: HTMLAudioElement) => {
    const endAt = startRef.current + SONG_MS / 1000
    watchRef.current = window.setInterval(() => {
      if (audio.currentTime >= endAt || audio.ended) {
        audio.pause()
        stopWatch()
        timeoutRef.current()
      }
    }, 40)
  }

  const waitForMetadata = async (audio: HTMLAudioElement) => {
    if (audio.readyState < 1) {
      await new Promise<void>((resolve) => audio.addEventListener('loadedmetadata', () => resolve(), { once: true }))
    }
  }

  /** Gra od początku fragmentu. Wywoływać z kliknięcia (wymóg przeglądarek). */
  const playFromStart = useCallback(async () => {
    const audio = getAudio()
    stopWatch()
    await waitForMetadata(audio)
    audio.currentTime = startRef.current
    await audio.play()
    armWatch(audio)
  }, [])

  /** Wznawia od miejsca zatrzymania (runda 2 po złej odpowiedzi). */
  const resume = useCallback(async () => {
    const audio = getAudio()
    stopWatch()
    await waitForMetadata(audio)
    if (audio.currentTime < startRef.current) audio.currentTime = startRef.current
    await audio.play()
    armWatch(audio)
  }, [])

  /** Zatrzymanie (zgłoszenie zawodnika albo przerwanie). */
  const stop = useCallback(() => {
    stopWatch()
    audioRef.current?.pause()
  }, [])

  useEffect(
    () => () => {
      stopWatch()
      audioRef.current?.pause()
    },
    [],
  )

  return useMemo(() => ({ prepare, playFromStart, resume, stop }), [prepare, playFromStart, resume, stop])
}
