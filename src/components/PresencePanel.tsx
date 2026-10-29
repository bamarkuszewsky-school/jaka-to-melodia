import { PRESENCE_LABELS, usePresenceList, type PresenceKey } from '../lib/presence'
import type { Stanowisko } from '../lib/roles'
import { hasClassName, useStationNames } from '../lib/stations'

const ORDER: PresenceKey[] = ['host', 'tablica', 'stanowisko1', 'stanowisko2', 'stanowisko3', 'tech', 'stream']

/** Kto jest teraz online — przydatne przy sprawdzaniu sprzętu przed grą. */
export function PresencePanel() {
  const list = usePresenceList()
  const names = useStationNames()

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
              <span className="presence__state">{online ? 'online' : 'brak'}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
