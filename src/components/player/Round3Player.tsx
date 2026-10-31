import { useState } from 'react'
import { sendBid } from '../../lib/game/round3Actions'
import { ANSWER_MS, remaining, secondsLeft } from '../../lib/game/rules'
import { allowedBids, canPass, nut, opponent, poNutach, WINS_TO_FINAL } from '../../lib/game/rules3'
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

/** iPad zawodnika w rundzie 3: licytacja nut zamiast przycisku. */
export function Round3Player({ me, label, game, names, onChangeStation }: Props) {
  const r3 = game.runda3
  const p = game.pytanie3
  const [sending, setSending] = useState(false)
  const now = useServerNow(p?.faza === 'odpowiedz')
  const name = (k: StationKey) => labelForKey(names, k)

  if (!r3) return null

  const playing = r3.gracze.includes(me)
  const rival = playing ? opponent(r3.gracze, me) : undefined

  const bid = async (b: { nuty?: number; pas?: boolean }) => {
    if (sending) return
    setSending(true)
    try {
      await sendBid(me, b)
    } catch {
      /* odrzucone — np. już nie nasza kolej */
    } finally {
      setSending(false)
    }
  }

  let content
  if (!playing) {
    content = <p className="r3p__state">Koniec gry — {game.punkty[me]} pkt. Dziękujemy!</p>
  } else if (r3.zwyciezca) {
    content =
      r3.zwyciezca === me ? (
        <p className="r3p__state is-gold">Wchodzicie do finału!</p>
      ) : (
        <p className="r3p__state">Koniec gry — {game.punkty[me]} pkt. Brawo!</p>
      )
  } else if (!p) {
    content =
      r3.wybiera === me ? (
        <p className="r3p__state is-gold">Wybieracie numer zagadki!</p>
      ) : (
        <p className="r3p__state">Numer wybiera {name(r3.wybiera)}</p>
      )
  } else if (p.faza === 'licytacja') {
    const l = p.licytacja
    const myTurn = l.kolej === me
    const waiting = Boolean(game.ruch) || sending
    content = (
      <>
        <p className="r3p__artist">{p.wykonawca}</p>
        <p className="r3p__state">
          {l.nuty !== undefined && l.prowadzi
            ? `${l.prowadzi === me ? 'Wasza oferta' : `Oferta ${name(l.prowadzi)}`}: ${l.nuty} ${nut(l.nuty)}`
            : 'Po ilu nutach odgadniecie?'}
        </p>
        {myTurn ? (
          <div className="r3p__bids">
            {allowedBids(l).map((n) => (
              <button
                key={n}
                type="button"
                className="r3p__bid"
                disabled={waiting}
                onClick={() => bid({ nuty: n })}
              >
                {n}
              </button>
            ))}
            {canPass(l) && l.prowadzi && (
              <button type="button" className="r3p__pass" disabled={waiting} onClick={() => bid({ pas: true })}>
                Graj, {name(l.prowadzi)}!
              </button>
            )}
          </div>
        ) : (
          <p className="r3p__wait">Licytuje {rival ? name(rival) : ''}…</p>
        )}
      </>
    )
  } else if (p.faza === 'granie' && p.gra && p.nuty) {
    content =
      p.gra === me ? (
        <>
          <p className="r3p__state is-gold">Słuchajcie!</p>
          <p className="r3p__big">
            {p.nuty} {nut(p.nuty)}
          </p>
        </>
      ) : (
        <p className="r3p__state">
          {name(p.gra)} zgaduje {poNutach(p.nuty)}
        </p>
      )
  } else if (p.faza === 'odpowiedz' && p.gra) {
    content =
      p.gra === me ? (
        <>
          <p className="r3p__state is-gold">Odpowiadacie!</p>
          <p className="r3p__big">{secondsLeft(remaining(ANSWER_MS, p.odpowiedzStart, now))} s</p>
        </>
      ) : (
        <p className="r3p__state">Odpowiada {name(p.gra)}</p>
      )
  } else if (p.faza === 'odslona' && p.wynik) {
    content =
      p.wynik.stanowisko === me ? (
        <p className="r3p__state is-gold">+{p.wynik.punkty} pkt dla Was!</p>
      ) : (
        <p className="r3p__state">Punkt dla {name(p.wynik.stanowisko)}</p>
      )
  }

  return (
    <div className="r3p">
      <h1 className="buzzer-class">{label}</h1>
      {playing && (
        <div className="wins wins--player">
          {Array.from({ length: WINS_TO_FINAL }, (_, i) => (
            <span key={i} className={i < (r3.wygrane[me] ?? 0) ? 'is-on' : ''} />
          ))}
        </div>
      )}
      <div className="r3p__content">{content}</div>
      <button type="button" className="link-button" onClick={onChangeStation}>
        Zmień stanowisko
      </button>
    </div>
  )
}
