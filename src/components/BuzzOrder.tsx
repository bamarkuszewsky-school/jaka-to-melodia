import type { Buzz } from '../lib/buzzTest'

/** Kolejność zgłoszeń z różnicą czasu względem pierwszego. */
export function BuzzOrder({ buzzes }: { buzzes: Buzz[] }) {
  if (buzzes.length === 0) return <p className="muted">Nikt się jeszcze nie zgłosił.</p>
  const first = buzzes[0].czas
  return (
    <ol className="buzz-order">
      {buzzes.map((b, i) => (
        <li key={b.stanowisko} className={i === 0 ? 'buzz-order__item is-first' : 'buzz-order__item'}>
          <span className="buzz-order__place">{i + 1}.</span>
          <span>Stanowisko {b.stanowisko}</span>
          <span className="buzz-order__time">{i === 0 ? 'pierwszy' : `+${b.czas - first} ms`}</span>
        </li>
      ))}
    </ol>
  )
}
