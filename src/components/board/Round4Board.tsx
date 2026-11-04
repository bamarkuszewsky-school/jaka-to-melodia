import { ANSWER_MS, remaining, secondsLeft } from '../../lib/game/rules'
import { FINAL_SONGS, guessedCount } from '../../lib/game/rules4'
import { useServerNow } from '../../lib/game/state'
import { STATION_KEYS, type GameState, type StationKey } from '../../lib/game/types'
import { labelForKey, type StationNames } from '../../lib/stations'
import type { ReactNode } from 'react'
import { FitText } from '../FitText'
import { FinalPanel } from './FinalPanel'

/** Tablica widowni w finale: duży zegar, 7 melodii, punkty, wynik. */
export function Round4Board({ game, names }: { game: GameState; names: StationNames }) {
  const r = game.runda4
  const now = useServerNow(r?.faza === 'gra' || r?.faza === 'stop')
  const label = (k: StationKey) => labelForKey(names, k)
  if (!r) return null

  const guessed = guessedCount(r.utwory)

  if (r.faza === 'koniec') {
    const ranking = [...STATION_KEYS].sort((a, b) => game.punkty[b] - game.punkty[a])
    const stage = (
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
    return (
      <div className="r1 r1--show">
        <header className="r1__head">
          <span className="r1__round">Finał</span>
          <span className="r1__logo">
            Jaka to <span className="accent">melodia?</span>
          </span>
        </header>
        <div className="r1__stage">{stage}</div>
      </div>
    )
  }

  // W trakcie finału: panel z numerami i zegarem + tabliczka finalisty.
  const status =
    r.faza === 'gotowe'
      ? '7 melodii · 30 sekund'
      : r.faza === 'gra'
        ? 'słuchamy…'
        : r.ostatnia
          ? 'czas minął — ostatnia szansa!'
          : 'odpowiada'
  return (
    <div className="final-show">
      <FinalPanel r={r} now={now} />
      <div className="final-show__right">
        <Plate name={label(r.gracz)} points={game.punkty[r.gracz]} status={status} answering={r.faza === 'stop'}>
          {r.faza === 'stop' && (
            <span className="plate__countdown">{secondsLeft(remaining(ANSWER_MS, r.odpowiedzStart, now))}</span>
          )}
        </Plate>
        {r.zdobyte > 0 && <p className="final-show__won">+{r.zdobyte} pkt w finale</p>}
      </div>
    </div>
  )
}

/** Tabliczka zawodnika (jak na pulpicie): nazwa klasy i punkty. */
export function Plate({
  name,
  points,
  status,
  answering,
  children,
}: {
  name: string
  points: number
  status?: string
  answering?: boolean
  children?: ReactNode
}) {
  return (
    <div className={`plate ${answering ? 'is-answering' : ''}`}>
      <FitText className="plate__name" max={[4.2, 80]} min={20} widthRatio={0.9}>
        {name}
      </FitText>
      <span className="plate__points">{points}</span>
      {status && <span className="plate__status">{status}</span>}
      {children}
    </div>
  )
}
