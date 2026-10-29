import { useState } from 'react'
import { Shell } from '../components/Shell'
import { pressBuzz, useBuzzes } from '../lib/buzzTest'
import { usePresence } from '../lib/presence'
import { STANOWISKA, type Stanowisko } from '../lib/roles'
import { useWakeLock } from '../lib/screen'
import { hasClassName, stationLabel, useStationNames } from '../lib/stations'

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
  const names = useStationNames()
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
                <span className="station-pick__num">{s}</span>
                {hasClassName(names, s) && <span className="station-pick__class">{names[s]}</span>}
              </button>
            ))}
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      title={stationLabel(names, stanowisko)}
      subtitle={hasClassName(names, stanowisko) ? `Stanowisko ${stanowisko}` : 'Zawodnik'}
      hideBarInFullscreen
    >
      <Buzzer stanowisko={stanowisko} label={stationLabel(names, stanowisko)} onChangeStation={() => choose(null)} />
    </Shell>
  )
}

interface BuzzerProps {
  stanowisko: Stanowisko
  /** Nazwa klasy (albo „Stanowisko N”) — duży napis nad przyciskiem. */
  label: string
  onChangeStation: () => void
}

function Buzzer({ stanowisko, label, onChangeStation }: BuzzerProps) {
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
      <div className="buzzer-head">
        <h1 className="buzzer-class">{label}</h1>
        <p className={`buzzer-state ${pressed && myIndex === 0 ? 'is-first' : ''}`}>{state}</p>
      </div>
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
