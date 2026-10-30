import { useState } from 'react'
import { Shell } from '../components/Shell'
import { pressBuzz, useBuzzes } from '../lib/buzzTest'
import { buzzIn } from '../lib/game/playerActions'
import { ANSWER_MS, currentChooser, remaining, secondsLeft } from '../lib/game/rules'
import { useGame, useServerNow } from '../lib/game/state'
import type { GameState, StationKey } from '../lib/game/types'
import { usePresence } from '../lib/presence'
import { STANOWISKA, type Stanowisko } from '../lib/roles'
import { useWakeLock } from '../lib/screen'
import { hasClassName, labelForKey, stationLabel, useStationNames, type StationNames } from '../lib/stations'

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
  const game = useGame()
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

  const label = stationLabel(names, stanowisko)
  const inGame = game.runda !== undefined

  return (
    <Shell
      title={label}
      subtitle={hasClassName(names, stanowisko) ? `Stanowisko ${stanowisko}` : 'Zawodnik'}
      hideBarInFullscreen
    >
      {inGame ? (
        <GameBuzzer
          me={String(stanowisko) as StationKey}
          stanowisko={stanowisko}
          label={label}
          game={game}
          names={names}
          onChangeStation={() => choose(null)}
        />
      ) : (
        <TestBuzzer stanowisko={stanowisko} label={label} onChangeStation={() => choose(null)} />
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
  onChangeStation: () => void
  error?: string | null
}

function BuzzerView({ stanowisko, label, state, stateGold, variant, onPress, onChangeStation, error }: ViewProps) {
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
      <button type="button" className="link-button" onClick={onChangeStation}>
        Zmień stanowisko
      </button>
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
  onChangeStation: () => void
}

function GameBuzzer({ me, stanowisko, label, game, names, onChangeStation }: GameBuzzerProps) {
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
      onChangeStation={onChangeStation}
    />
  )
}

// ---------- Test przycisków (gdy gra nie trwa) ----------

interface TestBuzzerProps {
  stanowisko: Stanowisko
  label: string
  onChangeStation: () => void
}

function TestBuzzer({ stanowisko, label, onChangeStation }: TestBuzzerProps) {
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
      onChangeStation={onChangeStation}
      error={error}
    />
  )
}
