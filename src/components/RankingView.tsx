import type { RankingEntry } from '../lib/library/library'

/** Ranking sezonu — tablica (pełny ekran), OBS (top 10) i panel hosta. */
export function RankingView({ lista, limit, variant }: { lista: RankingEntry[]; limit?: number; variant: 'board' | 'stream' }) {
  const rows = limit ? lista.slice(0, limit) : lista
  const twoCols = variant === 'board' && rows.length > 10
  return (
    <div className={`ranking ranking--${variant}`}>
      <header className="ranking__head">
        <span className="ranking__eyebrow">Jaka to melodia? · sezon</span>
        <h1 className="ranking__title">Ranking klas</h1>
      </header>
      {rows.length === 0 ? (
        <p className="ranking__empty">Ranking pojawi się po pierwszej edycji.</p>
      ) : (
        <ol className={`ranking__list ${twoCols ? 'is-two' : ''}`} style={twoCols ? { gridTemplateRows: `repeat(${Math.ceil(rows.length / 2)}, auto)` } : undefined}>
          {rows.map((r, i) => (
            <li key={`${r.edycja}-${r.klasa}-${i}`} className={`ranking__row ${i < 3 ? `is-top is-top${i + 1}` : ''}`}>
              <span className="ranking__place">{i + 1}</span>
              <span className="ranking__class">
                {r.klasa}
                {r.mistrz ? <span className="ranking__badge is-gold">mistrz</span> : r.finalista ? <span className="ranking__badge">finał</span> : null}
              </span>
              <span className="ranking__edition">{r.edycja}</span>
              <span className="ranking__points">{r.punkty}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
