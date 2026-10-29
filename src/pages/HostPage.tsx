import { useState } from 'react'
import { BuzzOrder } from '../components/BuzzOrder'
import { PresencePanel } from '../components/PresencePanel'
import { Shell } from '../components/Shell'
import { resetBuzzes, useBuzzes } from '../lib/buzzTest'
import { usePresence } from '../lib/presence'

/** Panel prowadzącego (MacBook). Na razie: kontrola sprzętu i test przycisków. */
export function HostPage() {
  usePresence('host')
  const buzzes = useBuzzes()
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
          <BuzzOrder buzzes={buzzes} />
        </section>

        <PresencePanel />

        <section className="card">
          <h2 className="card__title">Wkrótce</h2>
          <ul className="todo">
            <li>Wczytanie folderu z muzyką i pliku pytań</li>
            <li>Sterowanie rundą: graj, pauza, dobra / zła odpowiedź</li>
            <li>Punkty stanowisk i przypisanie klas</li>
          </ul>
        </section>
      </div>
    </Shell>
  )
}
