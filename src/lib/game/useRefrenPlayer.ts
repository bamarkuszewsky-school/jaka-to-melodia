import { useCallback, useEffect, useRef, useState } from 'react'

/** Refren po odsłonięciu tytułu: gra od zapisanej sekundy, dopóki host nie zatrzyma. */
export function useRefrenPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const stop = useCallback(() => {
    audioRef.current?.pause()
    setPlaying(false)
  }, [])

  const play = useCallback(async (url: string, sec: number) => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.addEventListener('ended', () => setPlaying(false))
    }
    const a = audioRef.current
    a.pause()
    if (a.src !== url) {
      a.src = url
      a.load()
    }
    if (a.readyState < 1) await new Promise<void>((r) => a.addEventListener('loadedmetadata', () => r(), { once: true }))
    a.currentTime = sec
    await a.play()
    setPlaying(true)
  }, [])

  useEffect(() => () => audioRef.current?.pause(), [])
  return { playing, play, stop }
}
