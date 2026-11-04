import { useState } from 'react'
import { kickDevice, PRESENCE_LABELS, usePresenceList, type PresenceKey } from '../lib/presence'
import type { Stanowisko } from '../lib/roles'
import { hasClassName, useStationNames } from '../lib/stations'
import { BUILD_ID, useLatestVersion } from '../lib/version'

const ORDER: PresenceKey[] = ['host', 'tablica', 'stanowisko1', 'stanowisko2', 'stanowisko3', 'muzyk', 'tech', 'stream']

/** Kto jest teraz online — przydatne przy sprawdzaniu sprzętu przed grą. */
export function PresencePanel() {
  const list = usePresenceList()
  const names = useStationNames()
  const latest = useLatestVersion() ?? BUILD_ID
  const [confirm, setConfirm] = useState<PresenceKey | null>(null)
  const [sent, setSent] = useState<Partial<Record<PresenceKey, boolean>>>({})
  const [error, setError] = useState<string | null>(null)

  const kick = async (key: PresenceKey) => {
    setConfirm(null)
    setError(null)
    try {
      await kickDevice(key)
      setSent((v) => ({ ...v, [key]: true }))
    } catch {
      setError('Nie udało się wylogować — sprawdź połączenie (i czy są opublikowane nowe reguły bazy).')
    }
  }

  const label = (key: PresenceKey) => {
    const match = key.match(/^stanowisko([123])$/)
    if (!match) return PRESENCE_LABELS[key]
    const s = Number(match[1]) as Stanowisko
    return hasClassName(names, s) ? `${PRESENCE_LABELS[key]} · ${names[s]}` : PRESENCE_LABELS[key]
  }

  return (
    <section className="card">
      <h2 className="card__title">Urządzenia online</h2>
      <ul className="presence">
        {ORDER.map((key) => {
          const online = Boolean(list[key])
          return (
            <li key={key} className={online ? 'presence__item is-online' : 'presence__item'}>
              <span className="presence__dot" aria-hidden />
              <span>{label(key)}</span>
              {online && list[key]?.wersja !== latest && (
                <span className="chip chip--gold" title="Odświeży się samo, gdy nie trwa gra">
                  starsza wersja
                </span>
              )}
              <span className="presence__state">{online ? (sent[key] ? 'wylogowuję…' : 'online') : 'brak'}</span>
              {online && key !== 'host' && (
                <span className="presence__actions">
                  {confirm === key ? (
                    <>
                      <button type="button" className="btn btn--tiny btn--danger" onClick={() => kick(key)}>
                        Tak
                      </button>
                      <button type="button" className="btn btn--tiny" onClick={() => setConfirm(null)}>
                        Nie
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn--tiny" onClick={() => setConfirm(key)} title="Wyloguj to urządzenie">
                      Wyloguj
                    </button>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="muted small">„Wyloguj” wysyła urządzenie do ekranu logowania. Urządzenia ze starą wersją aplikacji (sprzed tej poprawki) nie są tu liczone i baza nie przyjmuje od nich zgłoszeń. Nowsze wersje odświeżają się same, gdy nie trwa gra.</p>
      {error && <p className="error">{error}</p>}
    </section>
  )
}
