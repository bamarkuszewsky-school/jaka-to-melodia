import { formatDate } from '../../lib/library/db'
import { useFitScale } from '../../lib/intro/useFitScale'
import type { LadderMatch, LadderStage, LadderView } from '../../lib/library/season'

/**
 * Drabinka sezonu na tablicy i live: scena 1920×1080 skalowana do ekranu.
 * Eliminacje w dwóch kolumnach, dalej ćwierćfinały, półfinały, finał i finał nauczycieli.
 */
export function LadderBoard({ view, variant, reserveTop = 0 }: { view: LadderView; variant: 'board' | 'stream'; reserveTop?: number }) {
  const scale = useFitScale(reserveTop)
  const stage = (k: string) => view.etapy.find((e) => e.etap === k)
  const elim = stage('eliminacje')
  const rest = ['cwierc', 'polfinal', 'final'].map(stage).filter((e): e is LadderStage => Boolean(e))
  const teachers = stage('nauczyciele')
  const half = Math.ceil((elim?.mecze.length ?? 0) / 2)
  const dense = (elim?.mecze.length ?? 0) > 12

  return (
    <div className={`ladder ladder--${variant}`} style={reserveTop ? { top: reserveTop } : undefined}>
      <div className="ladder__stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <header className="ladder__head">
          <span className="ladder__eyebrow">Jaka to melodia?</span>
          <h1 className="ladder__title">Drabinka · {view.sezon}</h1>
          {view.mistrz && <span className="ladder__champion">Mistrz sezonu: {view.mistrz}</span>}
        </header>
        <div className="ladder__grid">
          {elim && (
            <section className="ladder__col ladder__col--elim">
              <h2 className="ladder__stage-name">
                {elim.nazwa}
                {elim.dzikie ? <span className="ladder__note">+ {elim.dzikie} z rankingu</span> : null}
              </h2>
              <div className={`ladder__elim ${dense ? 'is-dense' : ''}`} style={{ gridTemplateRows: `repeat(${Math.max(1, half)}, auto)` }}>
                {elim.mecze.map((m) => (
                  <MatchCard key={m.nr} m={m} />
                ))}
              </div>
            </section>
          )}
          {rest.map((s) => (
            <section key={s.etap} className={`ladder__col ladder__col--${s.etap}`}>
              <h2 className="ladder__stage-name">
                {s.nazwa}
                {s.dzikie ? <span className="ladder__note">+ {s.dzikie} z rankingu</span> : null}
              </h2>
              <div className="ladder__matches">
                {s.mecze.length > 0 ? s.mecze.map((m) => <MatchCard key={m.nr} m={m} single={s.etap === 'final'} />) : <Placeholder etap={s.etap} />}
                {s.etap === 'final' && teachers && (
                  <div className="ladder__teachers">
                    <h2 className="ladder__stage-name">{teachers.nazwa}</h2>
                    {teachers.mecze.length > 0 ? (
                      teachers.mecze.map((m) => <MatchCard key={m.nr} m={m} single />)
                    ) : (
                      <Placeholder etap="nauczyciele" />
                    )}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
        <footer className="ladder__legend">
          <span className="ladder__key is-awans">wygrana edycji</span>
          <span className="ladder__key is-dzika">awans z rankingu</span>
          <span className="ladder__key is-odpada">odpada</span>
        </footer>
      </div>
    </div>
  )
}

const PLACEHOLDER: Record<string, number> = { cwierc: 4, polfinal: 2, final: 1, nauczyciele: 1 }

function Placeholder({ etap }: { etap: string }) {
  return (
    <>
      {Array.from({ length: PLACEHOLDER[etap] ?? 1 }, (_, i) => (
        <div key={i} className="ladder-card is-empty">
          {[0, 1, 2].map((j) => (
            <span key={j} className="ladder-card__slot">
              <span className="ladder-card__name">?</span>
            </span>
          ))}
        </div>
      ))}
    </>
  )
}

function MatchCard({ m, single }: { m: LadderMatch; single?: boolean }) {
  const meta = [single ? '' : String(m.nr), m.data ? formatDate(m.data).slice(0, 5) : '', m.stan === 'gra' ? 'gra teraz' : '']
    .filter(Boolean)
    .join(' · ')
  return (
    <div className={`ladder-card is-${m.stan}`}>
      {meta && <span className="ladder-card__meta">{meta}</span>}
      {m.klasy.length === 0 ? (
        <span className="ladder-card__slot">
          <span className="ladder-card__name">?</span>
        </span>
      ) : (
        m.klasy.map((s) => (
          <span key={s.klasa} className={`ladder-card__slot is-${s.stan}`} title={s.opis}>
            <span className="ladder-card__name">{s.klasa}</span>
            {s.punkty !== undefined && <span className="ladder-card__pts">{s.punkty}</span>}
          </span>
        ))
      )}
    </div>
  )
}
