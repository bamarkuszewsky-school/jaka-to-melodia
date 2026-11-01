import { useState } from 'react'
import { setPokaz, type Pokaz } from '../../lib/library/db'
import { computeRanking, type EditionRecord } from '../../lib/library/library'

/** Zakładka „Ranking”: wyniki klas ze wszystkich zakończonych edycji + pokaz na tablicy i w OBS. */
export function RankingPanel({ editions, pokaz }: { editions: Record<string, EditionRecord> | undefined; pokaz: Pokaz | undefined }) {
  const [error, setError] = useState<string | null>(null)
  const lista = computeRanking(editions ?? {})
  const finished = Object.values(editions ?? {}).filter((e) => e.zakonczono).length

  const toggle = async (target: 'tablica' | 'stream') => {
    setError(null)
    try {
      await setPokaz(target, !pokaz?.[target], lista)
    } catch {
      setError('Nie udało się — sprawdź połączenie.')
    }
  }

  return (
    <section className="card card--wide">
      <div className="card__head">
        <div>
          <h2 className="card__title">Ranking sezonu</h2>
          <p className="muted">
            {finished} {finished === 1 ? 'zakończona edycja' : 'zakończonych edycji'} · {lista.length} klas. Edycje testowe
            usuniesz w „Baza utworów” → „Edycje”.
          </p>
        </div>
        <div className="card__actions">
          <button type="button" className={`btn ${pokaz?.tablica ? 'btn--danger' : 'btn--primary'}`} onClick={() => toggle('tablica')}>
            {pokaz?.tablica ? 'Ukryj z tablicy' : 'Pokaż na tablicy'}
          </button>
          <button type="button" className={`btn ${pokaz?.stream ? 'btn--danger' : 'btn--primary'}`} onClick={() => toggle('stream')}>
            {pokaz?.stream ? 'Ukryj z live' : 'Pokaż na live'}
          </button>
        </div>
      </div>
      {(pokaz?.tablica || pokaz?.stream) && (
        <p className="notice">
          Ranking jest teraz widoczny: {[pokaz.tablica && 'tablica', pokaz.stream && 'live (OBS)'].filter(Boolean).join(' i ')}.
        </p>
      )}
      {error && <p className="error">{error}</p>}

      {lista.length === 0 ? (
        <p className="muted">Ranking pojawi się po zakończeniu pierwszej edycji („Zakończ edycję” w zakładce „Gra”).</p>
      ) : (
        <table className="ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Klasa</th>
              <th>Punkty</th>
              <th>Edycja</th>
              <th>Miejsce w edycji</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r, i) => (
              <tr key={`${r.edycja}-${r.klasa}-${i}`}>
                <td>{i + 1}</td>
                <td>
                  <strong>{r.klasa}</strong>
                  {r.mistrz && <span className="chip chip--gold">mistrz 7/7</span>}
                  {r.finalista && !r.mistrz && <span className="chip">finalista</span>}
                </td>
                <td>{r.punkty}</td>
                <td>{r.edycja}</td>
                <td>{r.miejsce}.</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
