import { clockLeft, FINAL_MS, finalSeconds } from '../../lib/game/rules4'
import type { Round4State } from '../../lib/game/types'

/** Punkty sześciokąta (płaski bok u góry i u dołu), w układzie 0–100. */
const HEX = '26.5,9 73.5,9 97,50 73.5,91 26.5,91 3,50'

/**
 * Lewy panel finału: numery 1–7 w dwóch kolumnach i sześciokątny zegar z paskiem czasu dookoła.
 * Numer świeci, gdy gra jego melodia; na zielono — odgadnięty; biały — jeszcze nie / pominięty.
 * Ten sam panel idzie na tablicę i (na przezroczystym tle) do OBS.
 */
export function FinalPanel({ r, now }: { r: Round4State; now: number }) {
  const left = clockLeft(r, now)
  const part = Math.max(0, Math.min(1, left / FINAL_MS))
  const playing = r.faza === 'gra' || r.faza === 'stop'
  return (
    <div className="fpanel">
      <div className="fpanel__bg" />
      <ol className="fpanel__nums">
        {r.utwory.map((s, i) => {
          const current = playing && i === r.biezacy
          const cls = s.stan === 'odgadnieta' ? 'is-ok' : s.stan === 'zla' ? 'is-bad' : current ? 'is-current' : ''
          return (
            <li key={i} className={`fpanel__num ${cls} ${i % 2 ? 'is-right' : 'is-left'}`} style={{ gridRow: i + 1 }}>
              {i + 1}
            </li>
          )
        })}
      </ol>
      <div className={`fhex ${r.faza === 'gra' ? 'is-running' : ''} ${left <= 5000 && playing ? 'is-low' : ''}`}>
        <svg viewBox="0 0 100 100" className="fhex__svg" aria-hidden>
          <polygon points={HEX} className="fhex__plate" />
          <polygon points={HEX} className="fhex__track" pathLength={100} />
          <polygon
            points={HEX}
            className="fhex__ring"
            pathLength={100}
            style={{ strokeDasharray: `${part * 100} 100` }}
          />
          <polygon points="33.5,21 66.5,21 83,50 66.5,79 33.5,79 17,50" className="fhex__inner" />
        </svg>
        <span className="fhex__num">{finalSeconds(left)}</span>
      </div>
    </div>
  )
}
