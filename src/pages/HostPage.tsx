import { useEffect, useState } from 'react'
import { BuzzOrder } from '../components/BuzzOrder'
import { EditionLoader } from '../components/host/EditionLoader'
import { IntroCard } from '../components/host/IntroCard'
import { Round3Control } from '../components/host/Round3Control'
import { Round4Control } from '../components/host/Round4Control'
import { RoundControl } from '../components/host/RoundControl'
import { PresencePanel } from '../components/PresencePanel'
import { Shell } from '../components/Shell'
import { StationNamesCard } from '../components/StationNamesCard'
import { resetBuzzes, useBuzzes } from '../lib/buzzTest'
import { releaseEdition, type LoadedEdition } from '../lib/game/questions'
import { useGame } from '../lib/game/state'
import { usePresence } from '../lib/presence'
import { useStationNames } from '../lib/stations'

/** Panel prowadzącego (MacBook): klasy, edycja, runda 1, test przycisków, sprzęt. */
export function HostPage() {
  usePresence('host')
  const buzzes = useBuzzes()
  const names = useStationNames()
  const game = useGame()
  const [busy, setBusy] = useState(false)
  const [edition, setEdition] = useState<LoadedEdition | null>(null)

  // Zwalniamy pamięć po poprzednim folderze, gdy wczytamy nowy lub zamkniemy panel.
  useEffect(() => () => releaseEdition(edition), [edition])

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
      <div className="grid">
        <StationNamesCard />
        <EditionLoader edition={edition} onLoaded={setEdition} />
        {game.runda === 4 ? (
          <Round4Control edition={edition} />
        ) : game.runda === 3 ? (
          <Round3Control edition={edition} />
        ) : (
          <RoundControl edition={edition} />
        )}
        <IntroCard edition={edition} />

        <section className="card card--wide">
          <div className="card__head">
            <h2 className="card__title">Test przycisków</h2>
            <button type="button" className="btn btn--ghost" onClick={onReset} disabled={busy || gameRunning}>
              Reset przycisków
            </button>
          </div>
          <p className="muted">
            {gameRunning
              ? 'Test jest wyłączony, bo trwa gra (przyciski zawodników działają teraz w grze). Kliknij „Nowa gra” → „Tak”, żeby wrócić do testu.'
              : 'Poproś zawodników o wciśnięcie przycisków. Kolejność ustala serwer, więc widać realne opóźnienia każdego iPada.'}
          </p>
          {!gameRunning && <BuzzOrder buzzes={buzzes} names={names} />}
        </section>

        <PresencePanel />
      </div>
    </Shell>
  )
}
