import { useState } from 'react'
import { BuzzOrder } from '../components/BuzzOrder'
import { PresencePanel } from '../components/PresencePanel'
import { Shell } from '../components/Shell'
import { useBuzzes } from '../lib/buzzTest'
import { usePresence } from '../lib/presence'
import { useStationNames } from '../lib/stations'

/** Panel ekipy od live (laptop z OBS / vMix na backstage'u). */
export function TechPage() {
  usePresence('tech')
  const buzzes = useBuzzes()
  const names = useStationNames()
  const [copied, setCopied] = useState(false)

  const streamUrl = `${location.origin}${location.pathname}#/stream`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(streamUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* brak dostępu do schowka — adres jest widoczny do ręcznego skopiowania */
    }
  }

  return (
    <Shell title="Tech Support" subtitle="Ekipa od live">
      <div className="grid">
        <section className="card card--wide">
          <h2 className="card__title">Nakładka do OBS / vMix</h2>
          <p className="muted">
            Dodaj w OBS źródło „Przeglądarka” (vMix: „Web Browser”) z tym adresem, rozmiar 1920×1080. Tło jest
            przezroczyste. Za pierwszym razem zaloguj się w nim hasłem Tech Support (OBS: „Interakcja”).
          </p>
          <div className="copy-row">
            <code className="copy-row__url">{streamUrl}</code>
            <button type="button" className="btn btn--primary" onClick={copy}>
              {copied ? 'Skopiowano' : 'Kopiuj'}
            </button>
          </div>
        </section>

        <PresencePanel />

        <section className="card">
          <h2 className="card__title">Zgłoszenia (podgląd)</h2>
          <BuzzOrder buzzes={buzzes} names={names} />
        </section>
      </div>
    </Shell>
  )
}
