import { ANSWER_MS, remaining, secondsLeft } from '../../lib/game/rules'
import { clockLeft, FINAL_SONGS, formatClock, guessedCount } from '../../lib/game/rules4'
import { useServerNow } from '../../lib/game/state'
import { STATION_KEYS, type GameState, type StationKey } from '../../lib/game/types'
import { labelForKey, type StationNames } from '../../lib/stations'
import { FitText } from '../FitText'

/** Tablica widowni w finale: duży zegar, 7 melodii, punkty, wynik. */
export function Round4Board({ game, names }: { game: GameState; names: StationNames }) {
  const r = game.runda4
  const now = useServerNow(r?.faza === 'gra' || r?.faza === 'stop')
  const label = (k: StationKey) => labelForKey(names, k)
  if (!r) return null

  const left = clockLeft(r, now)
  const guessed = guessedCount(r.utwory)

  let stage
  if (r.faza === 'koniec') {
    const ranking = [...STATION_KEYS].sort((a, b) => game.punkty[b] - game.punkty[a])
    stage = (
      <div className="final-end">
        <p className={`final-end__title ${r.wynik === 'komplet' ? 'is-gold' : ''}`}>
          {r.wynik === 'komplet' ? 'MISTRZ EDYCJI!' : r.wynik === 'blad' ? 'Koniec finału' : 'Czas minął'}
        </p>
        <FitText className="final-end__name" max={[9, 170]} min={40} widthRatio={0.86}>
          {label(r.gracz)}
        </FitText>
        <p className="final-end__sum">
          {guessed}/{FINAL_SONGS} melodii · +{r.zdobyte} pkt{r.bonus ? ` (w tym bonus ${r.bonus})` : ''}
        </p>
        <ol className="final-end__ranking">
          {ranking.map((k, i) => (
            <li key={k} className={k === r.gracz ? 'is-finalist' : ''}>
              <span className="final-end__place">{i + 1}.</span>
              <span className="final-end__class">{label(k)}</span>
              <strong>{game.punkty[k]} pkt</strong>
            </li>
          ))}
        </ol>
      </div>
    )
  } else {
    stage = (
      <div className="final-board">
        <FitText className="final-board__who" max={[6, 110]} min={28} widthRatio={0.8}>
          {label(r.gracz)}
        </FitText>
        <div
          className={`final-clock final-clock--board ${r.faza === 'gra' ? 'is-running' : ''} ${
            left < 5000 && r.faza !== 'gotowe' ? 'is-low' : ''
          }`}
        >
          {formatClock(left)}
        </div>
        <p className="song__hint">
          {r.faza === 'gotowe'
            ? '7 melodii · 30 sekund'
            : r.faza === 'gra'
              ? `Melodia ${r.biezacy + 1} — słuchamy!`
              : r.ostatnia
                ? 'Czas minął — ostatnia szansa!'
                : `Stop! Melodia ${r.biezacy + 1} — odpowiedź albo „dalej”`}
        </p>
        {r.faza === 'stop' && (
          <div className="song__countdown song__countdown--small">
            {secondsLeft(remaining(ANSWER_MS, r.odpowiedzStart, now))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="r1">
      <header className="r1__head">
        <span className="r1__round">Finał · 7 melodii w 30 sekund</span>
        <span className="r1__logo">
          Jaka to <span className="accent">melodia?</span>
        </span>
      </header>

      <div className="r1__stage">{stage}</div>

      <footer className="final-slots">
        {r.utwory.map((s, i) => {
          const current = i === r.biezacy && (r.faza === 'gra' || r.faza === 'stop')
          return (
            <div key={i} className={`final-slot is-${s.stan} ${current ? 'is-current' : ''}`}>
              <span className="final-slot__num">
                {s.stan === 'odgadnieta' ? '✓' : s.stan === 'zla' ? '✗' : s.stan === 'pominieta' ? '↷' : i + 1}
              </span>
              {s.tytul && (
                <>
                  <FitText className="final-slot__title" max={[1.4, 26]} min={10} lines={2} widthRatio={1}>
                    {s.tytul}
                  </FitText>
                  <FitText className="final-slot__artist" max={[1, 18]} min={9} lines={1} widthRatio={1}>
                    {s.wykonawca ?? ''}
                  </FitText>
                </>
              )}
            </div>
          )
        })}
        <div className="final-slot final-slot--points">
          <span className="final-slot__label">w finale</span>
          <span className="final-slot__num">{r.zdobyte}</span>
        </div>
      </footer>
    </div>
  )
}
