import { useEffect, useState } from 'react'
import { LadderBoard } from '../components/board/LadderBoard'
import { RankingView } from '../components/RankingView'
import { Shell } from '../components/Shell'
import { editionSteps, stageStatus } from '../lib/game/progress'
import { useGame, useServerOffset } from '../lib/game/state'
import { STATION_KEYS, type GameState, type StationKey } from '../lib/game/types'
import { formatDate, usePokaz, type Pokaz } from '../lib/library/db'
import { DRAW_COUNT } from '../lib/library/library'
import { seasonProgress, type SeasonProgress } from '../lib/library/season'
import { PRESENCE_LABELS, usePresence, usePresenceList, type PresenceKey } from '../lib/presence'
import { useFullscreen, useWakeLock } from '../lib/screen'
import { labelForKey, useStationNames, type StationNames } from '../lib/stations'

type View = 'panel' | 'drabinka' | 'ranking'

/** Ile utworów każdej rundy zużywa jedna edycja. */
const PER_EDITION: Record<string, number> = {
  '1': DRAW_COUNT.runda1,
  '2': DRAW_COUNT.runda2 + DRAW_COUNT.dogrywka2,
  '3': DRAW_COUNT.runda3,
  F: DRAW_COUNT.final,
}
const ROUND_NAME: Record<string, string> = { '1': 'Runda 1', '2': 'Runda 2', '3': 'Runda 3', F: 'Finał' }

const DEVICES: PresenceKey[] = ['host', 'tablica', 'stanowisko1', 'stanowisko2', 'stanowisko3', 'muzyk', 'stream']

/** Zegar odświeżany co kilka sekund (czas serwera). */
function useClock(): number {
  const offset = useServerOffset()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])
  return now + offset
}

/**
 * Koordynator za sceną (duża tablica multimedialna): co się dzieje na scenie,
 * kto gra następny, postęp edycji i sezonu, baza utworów i sprzęt.
 */
export function CoordinatorPage() {
  usePresence('koordynator')
  useWakeLock()
  const game = useGame()
  const pokaz = usePokaz()
  const names = useStationNames()
  const online = usePresenceList()
  const [view, setView] = useState<View>('panel')
  const { isFullscreen, supported, toggle } = useFullscreen()
  // Drabinka to scena 1920×1080 na całe okno: zostawiamy miejsce na pasek u góry i przyciski na dole.
  const reserveTop = isFullscreen ? 0 : 76
  const reserveBottom = 84

  return (
    <Shell title="Koordynator" subtitle="Za sceną" hideBarInFullscreen>
      <div className="coord-page">
        <div className="coord-view">
          {view === 'drabinka' && pokaz?.drabinka ? (
            <LadderBoard view={pokaz.drabinka} variant="board" reserveTop={reserveTop} reserveBottom={reserveBottom} />
          ) : view === 'ranking' ? (
            <div className="coord-ranking">
              <RankingView lista={pokaz?.lista ?? []} variant="board" />
            </div>
          ) : (
            <CoordinatorPanel game={game} pokaz={pokaz} names={names} online={online} />
          )}
        </div>
        <nav className="coord-tabs" aria-label="Widok koordynatora">
          {(['panel', 'drabinka', 'ranking'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              className={`coord-tab ${view === v ? 'is-active' : ''}`}
              onClick={() => setView(v)}
              disabled={v === 'drabinka' && !pokaz?.drabinka}
            >
              {v === 'panel' ? 'Panel' : v === 'drabinka' ? 'Drabinka' : 'Ranking'}
            </button>
          ))}
          {supported && (
            <button type="button" className="coord-tab coord-tab--fs" onClick={toggle}>
              {isFullscreen ? 'Zamknij pełny ekran' : 'Pełny ekran'}
            </button>
          )}
        </nav>
      </div>
    </Shell>
  )
}

function CoordinatorPanel({
  game,
  pokaz,
  names,
  online,
}: {
  game: GameState
  pokaz: Pokaz | undefined
  names: StationNames
  online: Partial<Record<PresenceKey, unknown>>
}) {
  const now = useClock()
  const label = (k: StationKey) => labelForKey(names, k)
  const etap = pokaz?.etap
  const plansza = pokaz?.plansza
  const progress = pokaz?.drabinka ? seasonProgress(pokaz.drabinka) : undefined
  const introActive =
    (game.czolowka ? now - game.czolowka.start < game.czolowka.dlugosc + 1000 : false) ||
    (game.zapowiedz ? now - game.zapowiedz.start < (game.zapowiedz.dlugosc ?? 6100) + 1000 : false)
  const finished = game.runda === undefined && plansza?.tryb === 'koniec'
  const status = finished ? `${plansza.nazwa} zakończona — czekamy na następną edycję` : stageStatus(game, label, introActive)
  const steps = editionSteps(game)
  const minutes = etap?.od && !finished ? Math.max(0, Math.floor((now - etap.od) / 60000)) : undefined
  const clock = new Date(now).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="coord">
      <header className="coord__head">
        <div>
          <p className="coord__eyebrow">Jaka to melodia? · koordynator</p>
          <h1 className="coord__title">
            {etap?.edycja ?? 'Brak wylosowanej edycji'}
            {etap?.etap && <span className="coord__etap">{etap.etap}</span>}
          </h1>
          <p className="coord__sub">
            {[pokaz?.drabinka?.sezon, etap?.data ? formatDate(etap.data) : undefined, minutes !== undefined ? `trwa ${minutes} min` : undefined]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="coord__clock">{clock}</div>
      </header>

      <div className="coord__main">
        <section className="coord-card coord-card--now">
          <h2 className="coord-card__title">Na scenie</h2>
          <p className="coord__status">{status}</p>
          <div className="coord-stations">
            {STATION_KEYS.map((k) => (
              <StationTile key={k} k={k} game={game} label={label(k)} ipad={Boolean(online[`stanowisko${k}` as PresenceKey])} />
            ))}
          </div>
          <ol className="coord-steps">
            {steps.map((s) => (
              <li key={s.runda} className={`coord-step is-${s.stan}`}>
                <span className="coord-step__name">{s.nazwa}</span>
                <span className="coord-step__info">{s.stan === 'koniec' ? '✓ ' : ''}{s.opis ?? (s.stan === 'czeka' ? 'czeka' : '')}</span>
              </li>
            ))}
          </ol>
        </section>

        <NextUp progress={progress} />
      </div>

      <div className="coord__bottom">
        <SeasonCard progress={progress} />
        <SongsCard pokaz={pokaz} left={progress?.doKonca} />
        <section className="coord-card">
          <h2 className="coord-card__title">Sprzęt</h2>
          <ul className="coord-devices">
            {DEVICES.map((d) => (
              <li key={d} className={online[d] ? 'is-on' : 'is-off'}>
                <span className="coord-devices__dot" />
                {d.startsWith('stanowisko') ? `iPad ${d.slice(-1)}` : PRESENCE_LABELS[d]}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function StationTile({ k, game, label, ipad }: { k: StationKey; game: GameState; label: string; ipad: boolean }) {
  const inGame = game.runda !== undefined
  const out = game.runda2?.odpada === k || (game.runda !== undefined && game.runda >= 3 && game.runda3 && !game.runda3.gracze.includes(k))
  const finalist = game.runda === 4 && game.runda4?.gracz === k
  const answering =
    game.pytanie?.odpowiada === k || (game.pytanie3?.faza === 'odpowiedz' && game.pytanie3.gra === k) || (finalist && game.runda4?.faza === 'stop')
  const tag = answering ? 'odpowiada' : finalist ? 'w finale' : out ? 'odpadła' : ''
  return (
    <div className={`coord-station ${answering ? 'is-answering' : ''} ${out ? 'is-out' : ''} ${finalist ? 'is-final' : ''}`}>
      <span className="coord-station__num">Stanowisko {k}</span>
      <span className="coord-station__name">{label}</span>
      <span className="coord-station__pts">{inGame ? `${game.punkty[k] ?? 0} pkt` : '—'}</span>
      <span className="coord-station__foot">
        <span className={`coord-dot ${ipad ? 'is-on' : ''}`} /> iPad {ipad ? 'online' : 'brak'}
        {tag && <span className="coord-station__tag">{tag}</span>}
      </span>
    </div>
  )
}

function NextUp({ progress }: { progress?: SeasonProgress }) {
  const list = (progress?.nastepne ?? []).filter((m) => !m.teraz).slice(0, 3)
  return (
    <section className="coord-card coord-card--next">
      <h2 className="coord-card__title">Następni — przygotuj klasy</h2>
      {!progress ? (
        <p className="coord__muted">Brak drabinki sezonu — host tworzy ją w zakładce „Drabinka”.</p>
      ) : list.length === 0 ? (
        <p className="coord__muted">Brak kolejnych edycji z wpisanymi klasami. Następny etap ułoży się sam po zakończeniu bieżącego.</p>
      ) : (
        <ol className="coord-next">
          {list.map((m, i) => (
            <li key={`${m.etap}-${m.nr}`} className={i === 0 ? 'is-first' : ''}>
              <span className="coord-next__label">
                {i === 0 ? 'Następna edycja' : i === 1 ? 'Potem' : 'Później'} · {m.nazwa}
              </span>
              <span className="coord-next__classes">{m.klasy.join('  ·  ')}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function SeasonCard({ progress }: { progress?: SeasonProgress }) {
  return (
    <section className="coord-card">
      <h2 className="coord-card__title">Sezon</h2>
      {progress ? (
        <>
          <ul className="coord-bars">
            {progress.etapy.map((e) => (
              <li key={e.etap}>
                <span className="coord-bars__name">{e.nazwa}</span>
                <span className="coord-bars__bar">
                  <span style={{ width: `${e.wszystkie ? (e.rozegrane / e.wszystkie) * 100 : 0}%` }} />
                </span>
                <span className="coord-bars__count">
                  {e.rozegrane}/{e.szacunek ? `~${e.wszystkie}` : e.wszystkie}
                </span>
              </li>
            ))}
          </ul>
          <p className="coord__big-line">
            Do końca sezonu: <strong>{progress.doKonca}</strong> {progress.doKonca === 1 ? 'edycja' : 'edycji'}
          </p>
        </>
      ) : (
        <p className="coord__muted">Brak drabinki sezonu.</p>
      )}
    </section>
  )
}

function SongsCard({ pokaz, left }: { pokaz: Pokaz | undefined; left?: number }) {
  const stats = pokaz?.statystyki
  return (
    <section className="coord-card">
      <h2 className="coord-card__title">Baza utworów</h2>
      {stats ? (
        <ul className="coord-songs">
          {Object.keys(PER_EDITION).map((r) => {
            const ready = stats.gotowe[r] ?? 0
            const enough = Math.floor(ready / PER_EDITION[r])
            const short = left !== undefined && enough < left
            return (
              <li key={r} className={short ? 'is-short' : ''}>
                <span>{ROUND_NAME[r]}</span>
                <strong>{ready}</strong>
                <span className="coord-songs__note">
                  gotowych · starczy na {enough} {enough === 1 ? 'edycję' : 'edycji'}
                  {short ? ' ⚠' : ''}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="coord__muted">Liczby pojawią się, gdy host otworzy panel.</p>
      )}
    </section>
  )
}
