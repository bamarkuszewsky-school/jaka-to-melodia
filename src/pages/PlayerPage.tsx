import { useState } from 'react'
import { Round4Player } from '../components/player/Round4Player'
import { Round3Player } from '../components/player/Round3Player'
import { Shell } from '../components/Shell'
import { pressBuzz, useBuzzes } from '../lib/buzzTest'
import { buzzIn } from '../lib/game/playerActions'
import { ANSWER_MS, currentChooser, remaining, secondsLeft } from '../lib/game/rules'
import { useGame, useServerNow } from '../lib/game/state'
import type { GameState, StationKey } from '../lib/game/types'
import { usePresence } from '../lib/presence'
import { deviceCode, deviceId, registerDevice, useDevice } from '../lib/devices'
import type { Stanowisko } from '../lib/roles'
import { useWakeLock } from '../lib/screen'
import { hasClassName, labelForKey, stationLabel, useStationNames, type StationNames } from '../lib/stations'

/** Widok zawodnika (iPad): zgłoszenie przy stanowisku, potem duży przycisk. Stanowisko nadaje host. */
export function PlayerPage() {
  const [id] = useState(deviceId)
  const device = useDevice(id)
  const names = useStationNames()
  const game = useGame()
  const stanowisko = device?.stanowisko ?? null
  usePresence(stanowisko ? `stanowisko${stanowisko}` : null)
  useWakeLock()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!stanowisko) {
    const waiting = Boolean(device?.zgloszenie)
    const register = async () => {
      setSending(true)
      setError(null)
      try {
        await registerDevice(id)
      } catch {
        setError('Nie udało się wysłać — sprawdź Wi‑Fi i spróbuj jeszcze raz.')
      } finally {
        setSending(false)
      }
    }
    return (
      <Shell title="Zawodnik" subtitle={`iPad ${deviceCode(id)}`}>
        <div className="center-screen">
          {device === undefined ? (
            <p className="muted">Łączenie…</p>
          ) : waiting ? (
            <>
              <h1 className="headline">Zgłoszono!</h1>
              <p className="lead">Prowadzący przypisuje Wam stanowisko i klasę. Kod iPada:</p>
              <p className="device-code">{deviceCode(id)}</p>
            </>
          ) : (
            <>
              <h1 className="headline">Podejdźcie do stanowiska</h1>
              <p className="lead">i wciśnijcie przycisk — prowadzący zobaczy zgłoszenie.</p>
              <button type="button" className="register-button" onClick={register} disabled={sending}>
                Jestem przy stanowisku
              </button>
              <p className="device-code device-code--small">iPad {deviceCode(id)}</p>
            </>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      </Shell>
    )
  }

  const label = stationLabel(names, stanowisko)
  const inGame = game.runda !== undefined

  return (
    <Shell
      title={label}
      subtitle={hasClassName(names, stanowisko) ? `Stanowisko ${stanowisko}` : 'Zawodnik'}
      hideBarInFullscreen
    >
      {game.runda === 4 ? (
        <Round4Player
          me={String(stanowisko) as StationKey}
          label={label}
          game={game}
          names={names}
        />
      ) : game.runda === 3 ? (
        <Round3Player
          me={String(stanowisko) as StationKey}
          label={label}
          game={game}
          names={names}
        />
      ) : inGame ? (
        <GameBuzzer
          me={String(stanowisko) as StationKey}
          stanowisko={stanowisko}
          label={label}
          game={game}
          names={names}
        />
      ) : (
        <TestBuzzer stanowisko={stanowisko} label={label} />
      )}
    </Shell>
  )
}

// ---------- Wspólny wygląd przycisku ----------

type Variant = 'active' | 'first' | 'locked' | 'idle'

interface ViewProps {
  stanowisko: Stanowisko
  label: string
  state: string
  stateGold?: boolean
  variant: Variant
  onPress: () => void
  error?: string | null
}

function BuzzerView({ stanowisko, label, state, stateGold, variant, onPress, error }: ViewProps) {
  const cls = { active: '', first: 'buzzer--first', locked: 'buzzer--locked', idle: 'buzzer--idle' }[variant]
  return (
    <div className="buzzer-screen">
      <div className="buzzer-head">
        <h1 className="buzzer-class">{label}</h1>
        <p className={`buzzer-state ${stateGold ? 'is-first' : ''}`}>{state}</p>
      </div>
      <button
        type="button"
        className={`buzzer ${cls}`}
        onPointerDown={onPress}
        disabled={variant !== 'active'}
        aria-label="Zgłaszam się"
      >
        <span className="buzzer__ring" aria-hidden />
        <span className="buzzer__label">{stanowisko}</span>
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

// ---------- Gra ----------

interface GameBuzzerProps {
  me: StationKey
  stanowisko: Stanowisko
  label: string
  game: GameState
  names: StationNames
}

function GameBuzzer({ me, stanowisko, label, game, names }: GameBuzzerProps) {
  const { pytanie, zgloszenie } = game
  const chooser = currentChooser(game)
  const [sending, setSending] = useState(false)
  const now = useServerNow(pytanie?.faza === 'odpowiedz')

  const out = game.runda2?.odpada === me
  const notPlaying = Boolean(pytanie?.poza?.[me])
  const blocked = Boolean(pytanie?.zablokowane?.[me])
  const canBuzz = pytanie?.faza === 'gra' && !blocked && !zgloszenie

  const onPress = async () => {
    if (!canBuzz || sending) return
    setSending(true)
    try {
      await buzzIn(me)
    } catch {
      /* ktoś był szybszy — baza odrzuciła zgłoszenie, to normalne */
    } finally {
      setSending(false)
    }
  }

  let state = 'Czekaj na hasło'
  let variant: Variant = 'idle'
  let gold = false

  if (out) {
    state = `Koniec gry — ${game.punkty[me]} pkt. Dziękujemy!`
    variant = 'locked'
  } else if (!pytanie) {
    if (game.runda2?.odpada) state = 'Przechodzicie do rundy 3!'
    else state = chooser === me ? 'Wybierasz hasło!' : chooser ? `Hasło wybiera ${labelForKey(names, chooser)}` : 'Czekaj na hasło'
    gold = chooser === me || Boolean(game.runda2?.odpada)
  } else if (notPlaying) {
    state = 'Dogrywka — tym razem nie gracie'
    variant = 'locked'
  } else if (pytanie.faza === 'wybrane') {
    state = blocked ? 'Zablokowany do końca piosenki' : 'Przygotuj się…'
    variant = blocked ? 'locked' : 'idle'
  } else if (pytanie.faza === 'gra') {
    if (blocked) {
      state = 'Zablokowany do końca piosenki'
      variant = 'locked'
    } else if (zgloszenie) {
      state = zgloszenie.stanowisko === me ? 'Zgłoszono!' : 'Ktoś był szybszy'
      variant = zgloszenie.stanowisko === me ? 'first' : 'locked'
    } else if (sending) {
      state = 'Zgłaszam…'
      variant = 'first'
    } else {
      state = 'Wciśnij, gdy znasz tytuł!'
      variant = 'active'
    }
  } else if (pytanie.faza === 'odpowiedz') {
    if (pytanie.odpowiada === me) {
      state = `Odpowiadasz! ${secondsLeft(remaining(ANSWER_MS, pytanie.odpowiedzStart, now))} s`
      variant = 'first'
      gold = true
    } else {
      state = pytanie.odpowiada ? `Odpowiada ${labelForKey(names, pytanie.odpowiada)}` : 'Ktoś odpowiada'
      variant = 'locked'
    }
  } else if (pytanie.faza === 'odslona' && pytanie.wynik?.stanowisko === me) {
    state = `+${pytanie.wynik.punkty} pkt!`
    variant = 'first'
    gold = true
  } else {
    state = 'Koniec piosenki'
  }

  return (
    <BuzzerView
      stanowisko={stanowisko}
      label={label}
      state={state}
      stateGold={gold}
      variant={variant}
      onPress={onPress}
    />
  )
}

// ---------- Test przycisków (gdy gra nie trwa) ----------

interface TestBuzzerProps {
  stanowisko: Stanowisko
  label: string
}

function TestBuzzer({ stanowisko, label }: TestBuzzerProps) {
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

  let state = 'Test przycisków — gotowy'
  if (pressed) state = myIndex === 0 ? 'Jesteś pierwszy!' : `Zgłoszenie nr ${myIndex + 1}`

  return (
    <BuzzerView
      stanowisko={stanowisko}
      label={label}
      state={state}
      stateGold={pressed && myIndex === 0}
      variant={pressed ? (myIndex === 0 ? 'first' : 'locked') : 'active'}
      onPress={onPress}
      error={error}
    />
  )
}
