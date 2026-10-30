import { ANSWER_MS, remaining, round1Value, secondsLeft, SONG_MS } from '../../lib/game/rules'
import { useServerNow } from '../../lib/game/state'
import { STATION_KEYS, type GameState, type StationKey } from '../../lib/game/types'
import { labelForKey, type StationNames } from '../../lib/stations'

interface Props {
  game: GameState
  names: StationNames
}

/** Tablica widowni w rundzie 1: plansza haseł albo aktualna piosenka + wyniki klas. */
export function Round1Board({ game, names }: Props) {
  const { pytanie, runda1 } = game
  const live = pytanie?.faza === 'gra' || pytanie?.faza === 'odpowiedz'
  const now = useServerNow(live)
  const label = (k: StationKey) => labelForKey(names, k)
  if (!runda1) return null

  const tile = pytanie ? runda1.hasla[pytanie.haslo] : undefined
  const blocked = pytanie?.zablokowane ?? {}

  return (
    <div className="r1">
      <header className="r1__head">
        <span className="r1__round">Runda 1</span>
        <span className="r1__logo">
          Jaka to <span className="accent">melodia?</span>
        </span>
      </header>

      <div className="r1__stage">
        {pytanie && tile ? (
          <div className={`song phase-${pytanie.faza}`} key={pytanie.haslo}>
            <p className="song__haslo">{tile.haslo}</p>

            {pytanie.faza === 'wybrane' && <p className="song__hint">Za chwilę muzyka…</p>}

            {pytanie.faza === 'gra' && (
              <>
                <div className="song__value">
                  {round1Value(now - (pytanie.start ?? now))}
                  <span>pkt</span>
                </div>
                <Equalizer />
                <div className="progress progress--big" aria-hidden>
                  <div
                    className="progress__bar"
                    style={{ width: `${(remaining(SONG_MS, pytanie.start, now) / SONG_MS) * 100}%` }}
                  />
                </div>
              </>
            )}

            {pytanie.faza === 'odpowiedz' && pytanie.odpowiada && (
              <>
                <div className="song__who">{label(pytanie.odpowiada)}</div>
                <p className="song__hint">odpowiada za {pytanie.wartosc} pkt</p>
                <div className="song__countdown">
                  {secondsLeft(remaining(ANSWER_MS, pytanie.odpowiedzStart, now))}
                </div>
              </>
            )}

            {pytanie.faza === 'brak' && <p className="song__who song__who--muted">Nikt nie zgadł</p>}

            {pytanie.faza === 'odslona' && pytanie.wynik && (
              <div className="reveal">
                <p className="reveal__title">{pytanie.wynik.tytul}</p>
                <p className="reveal__artist">{pytanie.wynik.wykonawca}</p>
                <p className="reveal__result">
                  {pytanie.wynik.stanowisko
                    ? `+${pytanie.wynik.punkty} pkt · ${label(pytanie.wynik.stanowisko)}`
                    : 'Nikt nie zdobył punktów'}
                </p>
              </div>
            )}

            {Object.keys(blocked).length > 0 && pytanie.faza !== 'odslona' && (
              <p className="song__blocked">
                Zablokowani: {(Object.keys(blocked) as StationKey[]).map(label).join(', ')}
              </p>
            )}
          </div>
        ) : (
          <div className="tiles">
            {runda1.hasla.map((t, i) => (
              <div key={i} className={`tile tile--${t.stan}`}>
                {t.stan === 'ukryte' ? (
                  <span className="tile__haslo">{t.haslo}</span>
                ) : (
                  <>
                    <span className="tile__title">{t.tytul}</span>
                    <span className="tile__artist">{t.wykonawca}</span>
                    <span className="tile__by">
                      {t.stan === 'odgadniete' && t.stanowisko ? `${label(t.stanowisko)} · +${t.punkty}` : 'nikt'}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="scorebar">
        {STATION_KEYS.map((k) => {
          const answering = pytanie?.faza === 'odpowiedz' && pytanie.odpowiada === k
          const chooser = !pytanie && runda1.wybiera === k
          const isBlocked = Boolean(blocked[k]) && pytanie?.faza !== 'odslona'
          return (
            <div
              key={k}
              className={`scorebar__item ${answering ? 'is-answering' : ''} ${isBlocked ? 'is-blocked' : ''}`}
            >
              <span className="scorebar__name">{label(k)}</span>
              <span className="scorebar__points">{game.punkty[k]}</span>
              {chooser && <span className="scorebar__tag">wybiera hasło</span>}
            </div>
          )
        })}
      </footer>
    </div>
  )
}

function Equalizer() {
  return (
    <div className="eq" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} style={{ animationDelay: `${(i * 137) % 700}ms` }} />
      ))}
    </div>
  )
}
