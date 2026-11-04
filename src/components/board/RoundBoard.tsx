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
import { STATION_KEYS, type GameState, type RoundNo, type StationKey } from '../../lib/game/types'
import { labelForKey, type StationNames } from '../../lib/stations'
import { FitText } from '../FitText'
import { ShowRows, type ShowRow } from './ShowRows'

interface Props {
  game: GameState
  names: StationNames
}

/** Tablica widowni w rundach 1–2: lista haseł jak w teleturnieju, pasek stanu piosenki, dogrywka, wyniki. */
export function RoundBoard({ game, names }: Props) {
  const runda: RoundNo = game.runda === 2 ? 2 : 1
  const r = roundState(game, runda)
  const label = (k: StationKey) => labelForKey(names, k)
  const { pytanie } = game
  const now = useServerNow(pytanie?.faza === 'gra' || pytanie?.faza === 'odpowiedz')
  if (!r) return null

  const r2 = game.runda2
  const dogrywkaPhase = runda === 2 && roundTilesDone(game, 2) && !r2?.odpada
  const e = dogrywkaPhase ? elimination(game.punkty, r2?.awans) : null
  const showDogrywka = Boolean(pytanie?.dogrywka) || e?.status === 'dogrywka'

  let stage: ReactNode
  if (!pytanie && runda === 2 && r2?.odpada) {
    stage = <Results game={game} label={label} odpada={r2.odpada} />
  } else {
    const tiles = showDogrywka ? (r.dogrywki ?? []) : r.hasla
    const startValue = runda === 2 ? 200 : 100
    const rows: ShowRow[] = tiles.map((t, i) => {
      const active = Boolean(pytanie && pytanie.haslo === i && Boolean(pytanie.dogrywka) === showDogrywka)
      const value = active && pytanie
        ? pytanie.dogrywka
          ? '—'
          : pytanie.faza === 'odpowiedz' && pytanie.wartosc
            ? pytanie.wartosc
            : pytanie.faza === 'gra'
              ? roundValue(pytanie.runda, elapsedOf(pytanie, now))
              : pytanie.faza === 'odslona' && pytanie.wynik?.punkty
                ? pytanie.wynik.punkty
                : startValue
        : t.stan === 'odgadniete' && t.punkty
          ? t.punkty
          : showDogrywka
            ? '—'
            : startValue
      const revealed = t.stan === 'odgadniete' || t.stan === 'nieodgadniete'
      return {
        key: i,
        value,
        label: t.haslo,
        reveal: revealed ? `${t.tytul ?? ''}` : active && pytanie?.faza === 'odslona' ? pytanie.wynik?.tytul : undefined,
        by: revealed
          ? t.stan === 'odgadniete' && t.stanowisko
            ? `${label(t.stanowisko)}${t.punkty ? ` · +${t.punkty}` : ''}`
            : 'nikt'
          : undefined,
        state: active ? 'active' : t.stan === 'odgadniete' ? 'done' : t.stan === 'nieodgadniete' ? 'missed' : t.stan === 'pominiete' ? 'skipped' : 'idle',
      }
    })
    stage = (
      <div className={`show ${pytanie ? 'show--live' : ''}`}>
        {showDogrywka && (
          <p className="show__badge">
            Dogrywka{e?.status === 'dogrywka' ? ` · ${e.contenders.map(label).join(' · ')}` : ''} — kto odgadnie, przechodzi dalej
          </p>
        )}
        <ShowRows rows={rows} dimOthers={Boolean(pytanie)} />
        {pytanie && <SongStatus game={game} label={label} now={now} />}
      </div>
    )
  }

  return (
    <div className="r1 r1--show">
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

// ---------- Pasek stanu piosenki (pod listą haseł) ----------

function SongStatus({ game, label, now }: { game: GameState; label: (k: StationKey) => string; now: number }) {
  const pytanie = game.pytanie!
  const poza = pytanie.poza ?? {}
  const blocked = (Object.keys(pytanie.zablokowane ?? {}) as StationKey[]).filter((k) => !poza[k])
  const elapsed = elapsedOf(pytanie, now)

  let body: ReactNode = null
  if (pytanie.faza === 'wybrane') {
    body = <span className="show-status__text">{pytanie.przesuniecie ? 'Muzyka gra dalej dla pozostałych…' : 'Za chwilę muzyka…'}</span>
  } else if (pytanie.faza === 'gra') {
    body = (
      <>
        <Equalizer />
        <div className="progress progress--big" aria-hidden>
          <div className="progress__bar" style={{ width: `${(Math.max(0, SONG_MS - elapsed) / SONG_MS) * 100}%` }} />
        </div>
      </>
    )
  } else if (pytanie.faza === 'odpowiedz' && pytanie.odpowiada) {
    body = (
      <>
        <FitText className="show-status__who" boxClassName="fit-box--left" max={[5, 96]} min={24} widthRatio={1}>
          {label(pytanie.odpowiada)}
        </FitText>
        <span className="show-status__text">{pytanie.dogrywka ? 'odpowiada' : `odpowiada za ${pytanie.wartosc} pkt`}</span>
        <span className="song__countdown song__countdown--small">{secondsLeft(remaining(ANSWER_MS, pytanie.odpowiedzStart, now))}</span>
      </>
    )
  } else if (pytanie.faza === 'brak') {
    body = <span className="show-status__text">Nikt nie zgadł</span>
  } else if (pytanie.faza === 'odslona' && pytanie.wynik) {
    body = (
      <>
        <span className="show-status__reveal">
          <strong>{pytanie.wynik.tytul}</strong> — {pytanie.wynik.wykonawca}
        </span>
        <span className="show-status__text">
          {pytanie.wynik.stanowisko
            ? pytanie.dogrywka
              ? `${label(pytanie.wynik.stanowisko)} przechodzi dalej!`
              : `+${pytanie.wynik.punkty} pkt · ${label(pytanie.wynik.stanowisko)}`
            : 'Nikt nie zdobył punktów'}
        </span>
      </>
    )
  }

  return (
    <div className={`show-status phase-${pytanie.faza}`}>
      {body}
      {blocked.length > 0 && pytanie.faza !== 'odslona' && (
        <span className="show-status__blocked">Zablokowani: {blocked.map(label).join(', ')}</span>
      )}
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
