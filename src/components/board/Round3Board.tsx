import { ANSWER_MS, remaining, secondsLeft } from '../../lib/game/rules'
import { nut, opponent, poNutach, WINS_TO_FINAL } from '../../lib/game/rules3'
import { useServerNow } from '../../lib/game/state'
import type { GameState, StationKey } from '../../lib/game/types'
import { labelForKey, type StationNames } from '../../lib/stations'
import { FitText } from '../FitText'

/** Tablica widowni w rundzie 3: numery zagadek, licytacja, odpowiedź, wynik, zwycięzca. */
export function Round3Board({ game, names }: { game: GameState; names: StationNames }) {
  const r3 = game.runda3
  const p = game.pytanie3
  const now = useServerNow(p?.faza === 'odpowiedz')
  const label = (k: StationKey) => labelForKey(names, k)
  if (!r3) return null

  let stage
  if (p) {
    const l = p.licytacja
    stage = (
      <div className={`song phase3-${p.faza}`} key={p.haslo}>
        <p className="song__badge song__badge--gold">
          Zagadka {p.haslo + 1} · {p.wartosc} pkt
        </p>
        <FitText className="r3__artist" max={[7, 130]} min={32} widthRatio={0.86}>
          {p.wykonawca}
        </FitText>

        {p.faza === 'licytacja' && (
          <div className="bidding">
            <p className="song__hint">
              Po ilu nutach odgadniecie? Licytuje <strong>{label(l.kolej)}</strong>
            </p>
            <div className="bidding__offer">
              {l.nuty !== undefined && l.prowadzi ? (
                <>
                  <span className="bidding__num">{l.nuty}</span>
                  <span className="bidding__label">
                    {nut(l.nuty)} · oferta {label(l.prowadzi)}
                  </span>
                </>
              ) : (
                <span className="bidding__label">Start: 7 nut</span>
              )}
            </div>
          </div>
        )}

        {p.faza === 'granie' && p.gra && p.nuty && (
          <>
            <FitText className="song__who" max={[10, 190]} min={40} widthRatio={0.86}>
              {label(p.gra)}
            </FitText>
            <p className="song__hint">zgaduje {poNutach(p.nuty)} — słuchamy!</p>
            <Notes count={p.nuty} />
          </>
        )}

        {p.faza === 'odpowiedz' && p.gra && (
          <>
            <FitText className="song__who" max={[10, 190]} min={40} widthRatio={0.86}>
              {label(p.gra)}
            </FitText>
            <p className="song__hint">odpowiada za {p.wartosc} pkt</p>
            <div className="song__countdown">{secondsLeft(remaining(ANSWER_MS, p.odpowiedzStart, now))}</div>
          </>
        )}

        {p.faza === 'odslona' && p.wynik && (
          <div className="reveal">
            <FitText className="reveal__title" max={[8, 150]} min={32} lines={2} widthRatio={0.88}>
              {p.wynik.tytul}
            </FitText>
            <p className="reveal__result">
              {p.wynik.trafil
                ? `+${p.wynik.punkty} pkt · ${label(p.wynik.stanowisko)}`
                : `Pudło! +${p.wynik.punkty} pkt dla ${label(p.wynik.stanowisko)}`}
            </p>
          </div>
        )}
      </div>
    )
  } else if (r3.zwyciezca) {
    const loser = opponent(r3.gracze, r3.zwyciezca)
    stage = (
      <div className="results">
        <p className="results__title">Do finału przechodzi</p>
        <div className="results__finalists results__finalists--one">
          <div className="results__finalist">
            <FitText className="results__name" max={[10, 190]} min={40}>
              {label(r3.zwyciezca)}
            </FitText>
            <span className="results__points">
              {r3.wygrane[r3.zwyciezca]} : {r3.wygrane[loser] ?? 0} · {game.punkty[r3.zwyciezca]} pkt
            </span>
          </div>
        </div>
        <p className="results__out">
          {label(loser)} kończy z wynikiem {game.punkty[loser]} pkt — brawo!
        </p>
      </div>
    )
  } else {
    stage = (
      <div className="tiles tiles--six" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
        {r3.hasla.map((t, i) => (
          <div key={i} className={`tile tile--${t.stan} ${t.stan === 'ukryte' ? 'tile--number' : ''}`}>
            {t.stan === 'ukryte' ? (
              <span className="tile__number">{i + 1}</span>
            ) : (
              <>
                <FitText className="tile__title" max={[1.6, 30]} min={11} lines={2} widthRatio={1}>
                  {t.tytul}
                </FitText>
                <FitText className="tile__artist" max={[1.1, 20]} min={10} lines={2} widthRatio={1}>
                  {t.wykonawca}
                </FitText>
                {t.stanowisko && (
                  <span className="tile__by">
                    {t.trafil ? '' : 'pudło → '}
                    {label(t.stanowisko)} · +{t.punkty}
                  </span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="r1">
      <header className="r1__head">
        <span className="r1__round">Runda 3 · Licytacja</span>
        <span className="r1__logo">
          Jaka to <span className="accent">melodia?</span>
        </span>
      </header>

      <div className="r1__stage">{stage}</div>

      <footer className="scorebar scorebar--two">
        {r3.gracze.map((k) => {
          const active =
            (p?.faza === 'licytacja' && p.licytacja.kolej === k) ||
            ((p?.faza === 'granie' || p?.faza === 'odpowiedz') && p.gra === k)
          const chooser = !p && !r3.zwyciezca && r3.wybiera === k
          return (
            <div key={k} className={`scorebar__item ${active ? 'is-answering' : ''}`}>
              <FitText className="scorebar__name" boxClassName="fit-box--left" max={[2.6, 52]} min={16} widthRatio={1}>
                {label(k)}
              </FitText>
              <span className="wins wins--board">
                {Array.from({ length: WINS_TO_FINAL }, (_, i) => (
                  <span key={i} className={i < (r3.wygrane[k] ?? 0) ? 'is-on' : ''} />
                ))}
              </span>
              <span className="scorebar__points">{game.punkty[k]}</span>
              {chooser && <span className="scorebar__tag">wybiera numer</span>}
              {r3.zwyciezca === k && <span className="scorebar__tag">finał!</span>}
            </div>
          )
        })}
      </footer>
    </div>
  )
}

function Notes({ count }: { count: number }) {
  return (
    <div className="notes-row" aria-label={`${count} ${nut(count)}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ animationDelay: `${i * 90}ms` }}>
          ♪
        </span>
      ))}
    </div>
  )
}
