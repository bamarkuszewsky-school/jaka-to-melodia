import { useState } from 'react'
import { BuzzOrder } from '../components/BuzzOrder'
import { PresencePanel } from '../components/PresencePanel'
import { Shell } from '../components/Shell'
import { StationNamesCard } from '../components/StationNamesCard'
import { resetBuzzes, useBuzzes } from '../lib/buzzTest'
import { usePresence } from '../lib/presence'
import { useStationNames } from '../lib/stations'

/** Panel prowadzącego (MacBook): klasy na stanowiskach, test przycisków, kontrola sprzętu. */
export function HostPage() {
  usePresence('host')
  const buzzes = useBuzzes()
  const names = useStationNames()
  const [busy, setBusy] = useState(false)

  const onReset = async () => {
    setBusy(true)
    try {
      await resetBuzzes()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell title="Host" subtitle="Panel prowadzącego">
      <div className="grid">
        <StationNamesCard />

        <section className="card card--wide">
          <div className="card__head">
            <h2 className="card__title">Test przycisków</h2>
            <button type="button" className="btn btn--primary" onClick={onReset} disabled={busy}>
              Reset przycisków
            </button>
          </div>
          <p className="muted">
            Poproś zawodników o wciśnięcie przycisków. Kolejność ustala serwer, więc widać realne opóźnienia każdego
            iPada.
          </p>
          <BuzzOrder buzzes={buzzes} names={names} />
        </section>

        <PresencePanel />

        <section className="card">
          <h2 className="card__title">Wkrótce</h2>
          <ul className="todo">
            <li>Wczytanie folderu z muzyką i pliku pytań</li>
            <li>Sterowanie rundą: graj, pauza, dobra / zła odpowiedź</li>
            <li>Punkty stanowisk</li>
          </ul>
        </section>
      </div>
    </Shell>
  )
}
