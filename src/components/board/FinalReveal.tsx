import type { FinalSong } from '../../lib/game/types'

/** Po finale: 7 melodii z tytułami — odgadnięte na zielono, reszta przygaszona. Odsłaniane po kolei. */
export function FinalReveal({ utwory, variant }: { utwory: FinalSong[]; variant: 'board' | 'stream' }) {
  return (
    <ol className={`freveal freveal--${variant}`}>
      {utwory.map((s, i) => {
        const state = s.stan === 'odgadnieta' ? 'ok' : s.stan === 'zla' ? 'bad' : 'miss'
        return (
          <li key={i} className={`freveal__row is-${state}`} style={{ animationDelay: `${0.25 + i * 0.55}s` }}>
            <span className="freveal__num">{i + 1}</span>
            <span className="freveal__song">
              <span className="freveal__title">{s.tytul ?? '—'}</span>
              {s.wykonawca && <span className="freveal__artist">{s.wykonawca}</span>}
            </span>
            <span className="freveal__mark" aria-label={state === 'ok' ? 'odgadnięta' : 'nieodgadnięta'}>
              {state === 'ok' ? '✓' : state === 'bad' ? '✗' : '–'}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
