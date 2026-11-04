import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BuzzOrder } from '../components/BuzzOrder'
import { DevicesCard } from '../components/host/DevicesCard'
import { EditionCard } from '../components/host/EditionCard'
import { IntroCard } from '../components/host/IntroCard'
import { RankingPanel } from '../components/host/RankingPanel'
import { Round3Control } from '../components/host/Round3Control'
import { Round4Control } from '../components/host/Round4Control'
import { RoundControl } from '../components/host/RoundControl'
import { SongDatabase } from '../components/host/SongDatabase'
import { PresencePanel } from '../components/PresencePanel'
import { Shell } from '../components/Shell'
import { StationNamesCard } from '../components/StationNamesCard'
import { resetBuzzes, useBuzzes } from '../lib/buzzTest'
import { useGame } from '../lib/game/state'
import {
  applySongChanges,
  useCurrentEditionId,
  useEditions,
  usePokaz,
  useRankingSync,
  useSongs,
} from '../lib/library/db'
import { buildEdition } from '../lib/library/edition'
import { DRAW_KEYS, roundIntroFor, syncChanges } from '../lib/library/library'
import { useRoundIntroAudio } from '../lib/game/useRoundIntroAudio'
import { useLibraryFolder } from '../lib/library/useLibraryFolder'
import { usePresence, useStalePresenceCleanup } from '../lib/presence'
import { useStationNames } from '../lib/stations'

type Tab = 'gra' | 'baza' | 'ranking'
const TAB_KEY = 'jtm-host-tab'

function readTab(): Tab {
  try {
    const t = localStorage.getItem(TAB_KEY)
    return t === 'baza' || t === 'ranking' ? t : 'gra'
  } catch {
    return 'gra'
  }
}

/** Panel prowadzącego (MacBook): gra, baza utworów, ranking sezonu. */
export function HostPage() {
  usePresence('host')
  useStalePresenceCleanup(true)
  const buzzes = useBuzzes()
  const names = useStationNames()
  const game = useGame()
  const [busy, setBusy] = useState(false)
  const [tab, setTabState] = useState<Tab>(readTab)
  const setTab = (t: Tab) => {
    setTabState(t)
    try {
      localStorage.setItem(TAB_KEY, t)
    } catch {
      /* bez pamięci przeglądarki */
    }
  }

  const { scan, load, urlFor } = useLibraryFolder()
  const songs = useSongs()
  const editions = useEditions()
  const currentId = useCurrentEditionId()
  const pokaz = usePokaz()
  useRankingSync(editions, pokaz)

  // Po wczytaniu folderu: nowe utwory trafiają do bazy, zniknięte dostają „brak pliku”.
  const synced = useRef<typeof scan>(null)
  useEffect(() => {
    if (scan && songs && synced.current !== scan) {
      synced.current = scan
      applySongChanges(syncChanges(scan, songs)).catch((e) => console.error(e))
    }
  }, [scan, songs])

  // Wylosowana edycja + pliki z folderu = pytania dla paneli rund.
  const current = currentId && editions ? editions[currentId] : undefined
  const editionKey = useMemo(() => {
    if (!current || !songs) return ''
    const ids = DRAW_KEYS.flatMap((k) => current.utwory[k])
    return JSON.stringify([current.nazwa, current.utwory, ids.map((id) => songs[id])])
  }, [current, songs])
  const edition = useMemo(
    () => (current && songs && scan ? buildEdition(current, songs, scan, urlFor) : null),
    // Przebudowa tylko, gdy zmieniły się utwory tej edycji (nie przy każdej zmianie w bazie).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editionKey, scan, urlFor],
  )

  const introUrl = useMemo(() => (scan?.intro ? urlFor(scan.intro) : undefined), [scan, urlFor])
  const roundIntroUrl = useCallback(
    (runda: number) => {
      const f = scan ? roundIntroFor(scan.roundIntros, runda) : undefined
      return f ? urlFor(f) : undefined
    },
    [scan, urlFor],
  )
  useRoundIntroAudio(game.zapowiedz, roundIntroUrl)

  const onReset = async () => {
    setBusy(true)
    try {
      await resetBuzzes()
    } finally {
      setBusy(false)
    }
  }

  const gameRunning = game.runda !== undefined

  return (
    <Shell title="Host" subtitle="Panel prowadzącego">
      <nav className="host-tabs">
        <button type="button" className={`host-tab ${tab === 'gra' ? 'is-active' : ''}`} onClick={() => setTab('gra')}>
          Gra
        </button>
        <button type="button" className={`host-tab ${tab === 'baza' ? 'is-active' : ''}`} onClick={() => setTab('baza')}>
          Baza utworów
        </button>
        <button type="button" className={`host-tab ${tab === 'ranking' ? 'is-active' : ''}`} onClick={() => setTab('ranking')}>
          Ranking
          {(pokaz?.tablica || pokaz?.stream) && <span className="host-tab__live">na ekranie</span>}
        </button>
      </nav>

      {tab === 'baza' && (
        <div className="grid">
          <SongDatabase songs={songs} editions={editions} currentId={currentId} scan={scan} urlFor={urlFor} />
        </div>
      )}

      {tab === 'ranking' && (
        <div className="grid">
          <RankingPanel editions={editions} pokaz={pokaz} />
        </div>
      )}

      {/* Panel gry zostaje zamontowany (muzyka i obsługa przycisków działają w tle). */}
      <div className="grid" hidden={tab !== 'gra'}>
        <DevicesCard />
        <StationNamesCard />
        <EditionCard
          scan={scan}
          onFolder={load}
          songs={songs}
          editions={editions}
          currentId={currentId}
          game={game}
          names={names}
          edition={edition}
        />
        {game.runda === 4 ? (
          <Round4Control edition={edition} />
        ) : game.runda === 3 ? (
          <Round3Control edition={edition} />
        ) : (
          <RoundControl edition={edition} />
        )}
        <IntroCard url={introUrl} folder={Boolean(scan)} roundIntros={scan ? Object.keys(scan.roundIntros).length : 0} />

        <section className="card card--wide">
          <div className="card__head">
            <h2 className="card__title">Test przycisków</h2>
            <button type="button" className="btn btn--ghost" onClick={onReset} disabled={busy || gameRunning}>
              Reset przycisków
            </button>
          </div>
          <p className="muted">
            {gameRunning
              ? 'Test jest wyłączony, bo trwa gra (przyciski zawodników działają teraz w grze).'
              : 'Poproś zawodników o wciśnięcie przycisków. Kolejność ustala serwer, więc widać realne opóźnienia każdego iPada.'}
          </p>
          {!gameRunning && <BuzzOrder buzzes={buzzes} names={names} />}
        </section>

        <PresencePanel />
      </div>
    </Shell>
  )
}
