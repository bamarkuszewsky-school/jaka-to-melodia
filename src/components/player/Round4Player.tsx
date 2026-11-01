import { useState } from 'react'
import { finalistStop } from '../../lib/game/round4Actions'
import { clockLeft, formatClock, guessedCount } from '../../lib/game/rules4'
import { useServerNow } from '../../lib/game/state'
import type { GameState, StationKey } from '../../lib/game/types'
import { labelForKey, type StationNames } from '../../lib/stations'

interface Props {
  me: StationKey
  label: string
  game: GameState
  names: StationNames
  onChangeStation: () => void
}

/** iPad w finale: finalista ma duży przycisk STOP, pozostali kibicują. */
export function Round4Player({ me, label, game, names, onChangeStation }: Props) {
  const r = game.runda4
  const now = useServerNow(r?.faza === 'gra')
  const [sending, setSending] = useState(false)
  if (!r) return null

  const finalist = r.gracz === me
  const guessed = guessedCount(r.utwory)

  const stop = async () => {
    if (sending) return
    setSending(true)
    try {
      await finalistStop(me)
    } catch {
      /* odrzucone — zegar już stoi */
    } finally {
      setSending(false)
    }
  }

  let content
  if (!finalist) {
    content =
      r.faza === 'koniec' ? (
        <p className="r3p__state">Koniec gry — {game.punkty[me]} pkt. Dziękujemy!</p>
      ) : (
        <p className="r3p__state">Finał gra {labelForKey(names, r.gracz)}</p>
      )
  } else if (r.faza === 'koniec') {
    content = (
      <>
        <p className={`r3p__state ${r.wynik === 'komplet' ? 'is-gold' : ''}`}>
          {r.wynik === 'komplet' ? 'MISTRZOWIE EDYCJI!' : 'Koniec finału'}
        </p>
        <p className="r3p__big">{guessed}/7</p>
        <p className="r3p__state">+{r.zdobyte} pkt w finale</p>
      </>
    )
  } else if (r.faza === 'gra') {
    content = (
      <button type="button" className="stop-button" disabled={sending || Boolean(game.stop4)} onClick={stop}>
        STOP
        <span className="stop-button__clock">{formatClock(clockLeft(r, now))}</span>
      </button>
    )
  } else if (r.faza === 'stop') {
    content = (
      <>
        <p className="r3p__state is-gold">{r.ostatnia ? 'Ostatnia szansa — odpowiadajcie!' : 'Odpowiadajcie albo powiedzcie „dalej”'}</p>
        <p className="r3p__big">{formatClock(r.czasZostal)} s</p>
        <p className="r3p__wait">zostało na zegarze</p>
      </>
    )
  } else {
    content = <p className="r3p__state is-gold">Finał! Przycisk STOP pojawi się, gdy ruszy pierwsza melodia.</p>
  }

  return (
    <div className="r3p">
      <h1 className="buzzer-class">{label}</h1>
      {finalist && r.faza !== 'koniec' && <p className="r3p__artist">Odgadnięte {guessed}/7 · {r.zdobyte} pkt</p>}
      <div className="r3p__content">{content}</div>
      <button type="button" className="link-button" onClick={onChangeStation}>
        Zmień stanowisko
      </button>
    </div>
  )
}
