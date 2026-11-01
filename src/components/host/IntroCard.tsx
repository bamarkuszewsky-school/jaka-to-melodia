import { useEffect, useRef, useState } from 'react'
import { startIntro, stopIntro } from '../../lib/game/hostActions'
import { useGame } from '../../lib/game/state'

/** Panel hosta: czołówka. Podkład gra z MacBooka, animacja idzie na tablicę i do OBS. */
export function IntroCard({ url, folder }: { url?: string; folder: boolean }) {
  const { czolowka } = useGame()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    const audio = new Audio(url)
    audio.preload = 'auto'
    audio.onended = () => {
      stopIntro().catch(() => {})
    }
    audioRef.current = audio
    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [url])

  const play = async () => {
    const audio = audioRef.current
    if (!audio) return
    setError(null)
    try {
      if (audio.readyState < 1) {
        await new Promise<void>((r) => audio.addEventListener('loadedmetadata', () => r(), { once: true }))
      }
      audio.currentTime = 0
      await audio.play()
      await startIntro(audio.duration * 1000)
    } catch (e) {
      console.error(e)
      audio.pause()
      setError('Nie udało się puścić czołówki.')
    }
  }

  const stop = () => {
    audioRef.current?.pause()
    stopIntro().catch(() => {})
  }

  return (
    <section className="card">
      <h2 className="card__title">Czołówka</h2>
      {url ? (
        <>
          <p className="muted">Podkład gra z tego komputera, animacja pojawia się na tablicy i w OBS.</p>
          <div className="card__actions">
            {czolowka ? (
              <button type="button" className="btn btn--danger" onClick={stop}>
                ■ Zatrzymaj
              </button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={play}>
                ▶ Puść czołówkę
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="muted">
          {folder
            ? 'W folderze z muzyką nie ma pliku czolowka.mp3 (albo .wav) — dodaj go i wczytaj folder ponownie.'
            : 'Wybierz folder z muzyką z plikiem czolowka.mp3 (albo .wav) w głównym katalogu.'}
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
