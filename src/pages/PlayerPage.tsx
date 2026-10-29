import { useState } from 'react'
import { Shell } from '../components/Shell'
import { pressBuzz, useBuzzes } from '../lib/buzzTest'
import { usePresence } from '../lib/presence'
import { STANOWISKA, type Stanowisko } from '../lib/roles'
import { useWakeLock } from '../lib/screen'

const STORAGE_KEY = 'jtm-stanowisko'

function readStanowisko(): Stanowisko | null {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY))
    return (STANOWISKA as readonly number[]).includes(v) ? (v as Stanowisko) : null
  } catch {
    return null
  }
}

/** Widok zawodnika (iPad): wybór stanowiska, potem duży przycisk. */
export function PlayerPage() {
  const [stanowisko, setStanowisko] = useState<Stanowisko | null>(readStanowisko)
  usePresence(stanowisko ? `stanowisko${stanowisko}` : null)
  useWakeLock()

  const choose = (s: Stanowisko | null) => {
    try {
      if (s) localStorage.setItem(STORAGE_KEY, String(s))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* brak pamięci przeglądarki — trudno, wybór działa do odświeżenia */
    }
    setStanowisko(s)
  }

  if (!stanowisko) {
    return (
      <Shell title="Zawodnik" subtitle="Wybierz stanowisko">
        <div className="center-screen">
          <h1 className="headline">Które to stanowisko?</h1>
          <div className="station-picker">
            {STANOWISKA.map((s) => (
              <button key={s} type="button" className="station-pick" onClick={() => choose(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title={`Stanowisko ${stanowisko}`} subtitle="Zawodnik" hideBarInFullscreen>
      <Buzzer stanowisko={stanowisko} onChangeStation={() => choose(null)} />
    </Shell>
  )
}

function Buzzer({ stanowisko, onChangeStation }: { stanowisko: Stanowisko; onChangeStation: () => void }) {
  const buzzes = useBuzzes()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const myIndex = buzzes.findIndex((b) => b.stanowisko === stanowisko)
  const pressed = myIndex >= 0

  const onPress = async () => {
    if (pressed || sending) return
    setSending(true)
    setError(null)
    try {
      await pressBuzz(stanowisko)
    } catch {
      setError('Nie udało się wysłać zgłoszenia.')
    } finally {
      setSending(false)
    }
  }

  let state = 'Gotowy'
  if (pressed) state = myIndex === 0 ? 'Jesteś pierwszy!' : `Zgłoszenie nr ${myIndex + 1}`

  return (
    <div className="buzzer-screen">
      <p className={`buzzer-state ${pressed && myIndex === 0 ? 'is-first' : ''}`}>{state}</p>
      <button
        type="button"
        className={`buzzer ${pressed ? (myIndex === 0 ? 'buzzer--first' : 'buzzer--locked') : ''}`}
        onPointerDown={onPress}
        disabled={pressed}
        aria-label="Zgłaszam się"
      >
        <span className="buzzer__ring" aria-hidden />
        <span className="buzzer__label">{stanowisko}</span>
      </button>
      {error && <p className="error">{error}</p>}
      <button type="button" className="link-button" onClick={onChangeStation}>
        Zmień stanowisko
      </button>
    </div>
  )
}
