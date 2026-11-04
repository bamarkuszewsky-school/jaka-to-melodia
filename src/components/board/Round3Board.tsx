import { ANSWER_MS, remaining, secondsLeft } from '../../lib/game/rules'
import { nut, opponent, poNutach, R3_BIG_VALUE, R3_VALUE, WINS_TO_FINAL } from '../../lib/game/rules3'
import { useServerNow } from '../../lib/game/state'
import type { GameState, StationKey } from '../../lib/game/types'
import { labelForKey, type StationNames } from '../../lib/stations'
import { FitText } from '../FitText'
import { ShowRows, type ShowRow } from './ShowRows'

/** Tablica widowni w rundzie 3: numery zagadek, licytacja, odpowiedź, wynik, zwycięzca. */
export function Round3Board({ game, names }: { game: GameState; names: StationNames }) {
  const r3 = game.runda3
  const p = game.pytanie3
  const now = useServerNow(p?.faza === 'odpowiedz')
  const label = (k: StationKey) => labelForKey(names, k)
  if (!r3) return null

  let stage
  if (!p && r3.zwyciezca) {
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
    const rows: ShowRow[] = r3.hasla.map((t, i) => {
      const active = p?.haslo === i
      const value = i === r3.hasla.length - 1 ? R3_BIG_VALUE : R3_VALUE
      const revealed = t.stan === 'odgadniete' || t.stan === 'nieodgadniete'
      return {
        key: i,
        value: t.punkty ?? (active && p ? p.wartosc : value),
        label: revealed ? (t.wykonawca ?? '') : active && p ? p.wykonawca : `Zagadka ${i + 1}`,
        reveal: revealed ? t.tytul : active && p?.faza === 'odslona' ? p.wynik?.tytul : undefined,
        by:
          revealed && t.stanowisko
            ? `${t.trafil ? '' : 'pudło → '}${label(t.stanowisko)}${t.nuty ? ` · ${t.nuty} ${nut(t.nuty)}` : ''}`
            : undefined,
        state: active ? 'active' : t.stan === 'odgadniete' ? 'done' : t.stan === 'nieodgadniete' ? 'missed' : t.stan === 'pominiete' ? 'skipped' : 'idle',
      }
    })

    let status = null
    if (p) {
      const l = p.licytacja
      status = (
        <div className={`show-status phase3-${p.faza}`}>
          {p.faza === 'licytacja' && (
            <>
              <span className="show-status__text">
                Po ilu nutach odgadniecie? Licytuje <strong>{label(l.kolej)}</strong>
              </span>
              <span className="bidding__offer">
                {l.nuty !== undefined && l.prowadzi ? (
                  <>
                    <span className="bidding__num">{l.nuty}</span>
                    <span className="bidding__label">
                      {nut(l.nuty)} · {label(l.prowadzi)}
                    </span>
                  </>
                ) : (
                  <span className="bidding__label">start: 7 nut</span>
                )}
              </span>
            </>
          )}
          {p.faza === 'granie' && p.gra && p.nuty && (
            <>
              <FitText className="show-status__who" boxClassName="fit-box--left" max={[5, 96]} min={24} widthRatio={1}>
                {label(p.gra)}
              </FitText>
              <span className="show-status__text">zgaduje {poNutach(p.nuty)} — słuchamy!</span>
              <Notes count={p.nuty} />
            </>
          )}
          {p.faza === 'odpowiedz' && p.gra && (
            <>
              <FitText className="show-status__who" boxClassName="fit-box--left" max={[5, 96]} min={24} widthRatio={1}>
                {label(p.gra)}
              </FitText>
              <span className="show-status__text">odpowiada za {p.wartosc} pkt</span>
              <span className="song__countdown song__countdown--small">{secondsLeft(remaining(ANSWER_MS, p.odpowiedzStart, now))}</span>
            </>
          )}
          {p.faza === 'odslona' && p.wynik && (
            <>
              <span className="show-status__reveal">
                <strong>{p.wynik.tytul}</strong> — {p.wynik.wykonawca}
              </span>
              <span className="show-status__text">
                {p.wynik.trafil
                  ? `+${p.wynik.punkty} pkt · ${label(p.wynik.stanowisko)}`
                  : `Pudło! +${p.wynik.punkty} pkt dla ${label(p.wynik.stanowisko)}`}
              </span>
            </>
          )}
        </div>
      )
    }
    stage = (
      <div className={`show ${p ? 'show--live' : ''}`}>
        <ShowRows rows={rows} dimOthers={Boolean(p)} />
        {status}
      </div>
    )
  }

  return (
    <div className="r1 r1--show">
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
