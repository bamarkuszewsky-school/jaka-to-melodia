import { PRESENCE_LABELS, usePresenceList, type PresenceKey } from '../lib/presence'

const ORDER: PresenceKey[] = ['host', 'tablica', 'stanowisko1', 'stanowisko2', 'stanowisko3', 'tech', 'stream']

/** Kto jest teraz online — przydatne przy sprawdzaniu sprzętu przed grą. */
export function PresencePanel() {
  const list = usePresenceList()
  return (
    <section className="card">
      <h2 className="card__title">Urządzenia online</h2>
      <ul className="presence">
        {ORDER.map((key) => {
          const online = Boolean(list[key])
          return (
            <li key={key} className={online ? 'presence__item is-online' : 'presence__item'}>
              <span className="presence__dot" aria-hidden />
              <span>{PRESENCE_LABELS[key]}</span>
              <span className="presence__state">{online ? 'online' : 'brak'}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
