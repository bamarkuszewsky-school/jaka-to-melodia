import type { ReactNode } from 'react'
import {
  ANSWER_MS,
  currentChooser,
  elapsedOf,
  elimination,
  remaining,
  roundState,
  roundTilesDone,
  roundValue,
  secondsLeft,
  SONG_MS,
} from '../../lib/game/rules'
import { useServerNow } from '../../lib/game/state'
import { STATION_KEYS, type GameState, type RoundNo, type StationKey, type Tile } from '../../lib/game/types'
import { labelForKey, type StationNames } from '../../lib/stations'
import { FitText } from '../FitText'

interface Props {
  game: GameState
  names: StationNames
}

/** Tablica widowni w rundach 1–2: plansza haseł, aktualna piosenka, dogrywka, wyniki. */
export function RoundBoard({ game, names }: Props) {
  const runda: RoundNo = game.runda === 2 ? 2 : 1
  const r = roundState(game, runda)
  const label = (k: StationKey) => labelForKey(names, k)
  if (!r) return null

  const { pytanie } = game
  const r2 = game.runda2
  const dogrywkaPhase = runda === 2 && roundTilesDone(game, 2) && !r2?.odpada
  const e = dogrywkaPhase ? elimination(game.punkty, r2?.awans) : null

  let stage: ReactNode
  if (pytanie) {
    stage = <Song game={game} label={label} tiles={pytanie.dogrywka ? (r.dogrywki ?? []) : r.hasla} />
  } else if (runda === 2 && r2?.odpada) {
    stage = <Results game={game} label={label} odpada={r2.odpada} />
  } else if (e?.status === 'dogrywka') {
    stage = (
      <div className="dogrywka">
        <p className="dogrywka__title">Dogrywka</p>
        <FitText className="dogrywka__who" max={[5.5, 110]} min={28}>
          {e.contenders.map(label).join(' · ')}
        </FitText>
        <p className="song__hint">Kto odgadnie, przechodzi do rundy 3</p>
        {r.dogrywki && <Tiles tiles={r.dogrywki} label={label} />}
      </div>
    )
  } else {
    stage = <Tiles tiles={r.hasla} label={label} />
  }

  return (
    <div className="r1">
      <header className="r1__head">
        <span className="r1__round">Runda {runda}</span>
        <span className="r1__logo">
          Jaka to <span className="accent">melodia?</span>
        </span>
      </header>

      <div className="r1__stage">{stage}</div>

      <Scorebar game={game} label={label} contenders={e?.status === 'dogrywka' ? e.contenders : undefined} />
    </div>
  )
}

// ---------- Piosenka ----------

function Song({ game, label, tiles }: { game: GameState; label: (k: StationKey) => string; tiles: Tile[] }) {
  const pytanie = game.pytanie!
  const live = pytanie.faza === 'gra' || pytanie.faza === 'odpowiedz'
  const now = useServerNow(live)
  const tile = tiles[pytanie.haslo]
  const poza = pytanie.poza ?? {}
  const blocked = (Object.keys(pytanie.zablokowane ?? {}) as StationKey[]).filter((k) => !poza[k])
  const elapsed = elapsedOf(pytanie, now)

  return (
    <div className={`song phase-${pytanie.faza}`} key={`${pytanie.dogrywka ? 'd' : 'h'}${pytanie.haslo}`}>
      {pytanie.dogrywka && <p className="song__badge">Dogrywka</p>}
      <FitText className="song__haslo" max={[4, 76]} min={20} widthRatio={0.86}>
        {tile?.haslo ?? '…'}
      </FitText>

      {pytanie.faza === 'wybrane' && (
        <p className="song__hint">{pytanie.przesuniecie ? 'Muzyka gra dalej dla pozostałych…' : 'Za chwilę muzyka…'}</p>
      )}

      {pytanie.faza === 'gra' && (
        <>
          {!pytanie.dogrywka && (
            <div className={`song__value ${pytanie.runda === 2 ? 'is-falling' : ''}`}>
              {roundValue(pytanie.runda, elapsed)}
              <span>pkt</span>
            </div>
          )}
          <Equalizer />
          <div className="progress progress--big" aria-hidden>
            <div className="progress__bar" style={{ width: `${(Math.max(0, SONG_MS - elapsed) / SONG_MS) * 100}%` }} />
          </div>
        </>
      )}

      {pytanie.faza === 'odpowiedz' && pytanie.odpowiada && (
        <>
          <FitText className="song__who" max={[12, 220]} min={40} widthRatio={0.86}>
            {label(pytanie.odpowiada)}
          </FitText>
          <p className="song__hint">{pytanie.dogrywka ? 'odpowiada' : `odpowiada za ${pytanie.wartosc} pkt`}</p>
          <div className="song__countdown">{secondsLeft(remaining(ANSWER_MS, pytanie.odpowiedzStart, now))}</div>
        </>
      )}

      {pytanie.faza === 'brak' && (
        <FitText className="song__who song__who--muted" max={[7, 130]} min={36}>
          Nikt nie zgadł
        </FitText>
      )}

      {pytanie.faza === 'odslona' && pytanie.wynik && (
        <div className="reveal">
          <FitText className="reveal__title" max={[9.5, 190]} min={32} lines={2} widthRatio={0.88}>
            {pytanie.wynik.tytul}
          </FitText>
          <FitText className="reveal__artist" max={[3.6, 70]} min={20} widthRatio={0.88}>
            {pytanie.wynik.wykonawca}
          </FitText>
          <p className="reveal__result">
            {pytanie.wynik.stanowisko
              ? pytanie.dogrywka
                ? `${label(pytanie.wynik.stanowisko)} przechodzi dalej!`
                : `+${pytanie.wynik.punkty} pkt · ${label(pytanie.wynik.stanowisko)}`
              : 'Nikt nie zdobył punktów'}
          </p>
        </div>
      )}

      {blocked.length > 0 && pytanie.faza !== 'odslona' && (
        <p className="song__blocked">Zablokowani: {blocked.map(label).join(', ')}</p>
      )}
    </div>
  )
}

// ---------- Plansza haseł ----------

function Tiles({ tiles, label }: { tiles: Tile[]; label: (k: StationKey) => string }) {
  return (
    <div
      className={`tiles ${tiles.length <= 3 ? 'tiles--few' : ''}`}
      style={{ gridTemplateColumns: `repeat(${Math.max(tiles.length, 1)}, minmax(0, 1fr))` }}
    >
      {tiles.map((t, i) => (
        <div key={i} className={`tile tile--${t.stan}`}>
          {t.stan === 'ukryte' ? (
            <FitText className="tile__haslo" max={[3.2, 62]} min={14} lines={3} widthRatio={1}>
              {t.haslo}
            </FitText>
          ) : (
            <>
              <FitText className="tile__title" max={[1.8, 34]} min={12} lines={2} widthRatio={1}>
                {t.tytul}
              </FitText>
              <FitText className="tile__artist" max={[1.2, 22]} min={11} lines={2} widthRatio={1}>
                {t.wykonawca}
              </FitText>
              <span className="tile__by">
                {t.stan === 'odgadniete' && t.stanowisko
                  ? t.punkty
                    ? `${label(t.stanowisko)} · +${t.punkty}`
                    : label(t.stanowisko)
                  : 'nikt'}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------- Wyniki rundy 2 ----------

function Results({ game, label, odpada }: { game: GameState; label: (k: StationKey) => string; odpada: StationKey }) {
  const awans = STATION_KEYS.filter((k) => k !== odpada).sort((a, b) => game.punkty[b] - game.punkty[a])
  return (
    <div className="results">
      <p className="results__title">Do rundy 3 przechodzą</p>
      <div className="results__finalists">
        {awans.map((k) => (
          <div key={k} className="results__finalist">
            <FitText className="results__name" max={[8, 150]} min={32}>
              {label(k)}
            </FitText>
            <span className="results__points">{game.punkty[k]} pkt</span>
          </div>
        ))}
      </div>
      <p className="results__out">
        Odpada {label(odpada)} · {game.punkty[odpada]} pkt — dziękujemy!
      </p>
    </div>
  )
}

// ---------- Pasek wyników ----------

function Scorebar({
  game,
  label,
  contenders,
}: {
  game: GameState
  label: (k: StationKey) => string
  contenders?: StationKey[]
}) {
  const { pytanie } = game
  const chooser = !pytanie ? currentChooser(game) : undefined
  const odpada = game.runda2?.odpada
  return (
    <footer className="scorebar">
      {STATION_KEYS.map((k) => {
        const answering = pytanie?.faza === 'odpowiedz' && pytanie.odpowiada === k
        const out = Boolean(pytanie?.poza?.[k]) || odpada === k
        const isBlocked = !out && Boolean(pytanie?.zablokowane?.[k]) && pytanie?.faza !== 'odslona'
        let tag: string | null = null
        if (odpada === k) tag = 'odpada'
        else if (chooser === k) tag = contenders ? 'wybiera kategorię' : 'wybiera hasło'
        else if (contenders?.includes(k)) tag = 'dogrywka'
        return (
          <div
            key={k}
            className={`scorebar__item ${answering ? 'is-answering' : ''} ${isBlocked || out ? 'is-blocked' : ''}`}
          >
            <FitText className="scorebar__name" boxClassName="fit-box--left" max={[2.6, 52]} min={16} widthRatio={1}>
              {label(k)}
            </FitText>
            <span className="scorebar__points">{game.punkty[k]}</span>
            {tag && <span className={`scorebar__tag ${odpada === k ? 'is-out' : ''}`}>{tag}</span>}
          </div>
        )
      })}
    </footer>
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
