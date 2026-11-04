import { Fragment, useEffect, useState } from 'react'
import { useServerOffset } from '../../lib/game/state'
import type { Plansza } from '../../lib/library/db'
import type { RankingEntry } from '../../lib/library/library'
import { FitText } from '../FitText'
import { RankingView } from '../RankingView'

/** Jak długo tablica pokazuje ranking, zanim przejdzie do napisu z edycją. */
export const RANKING_MS = 20_000

/**
 * Tablica przed rundą 1 i po zakończeniu edycji: najpierw ranking sezonu (20 s),
 * potem sam napis „Edycja 5 · 4BT VS 2AT VS 4B LO” (+ „zakończona”).
 */
export function EditionScreen({ plansza, lista, klasy }: { plansza: Plansza; lista: RankingEntry[]; klasy: string[] }) {
  const offset = useServerOffset()
  // Dla której planszy (czas `od`) ranking już się pokazał — wtedy zostaje sam napis.
  const [doneFor, setDoneFor] = useState<number | null>(() =>
    Date.now() - plansza.od >= RANKING_MS ? plansza.od : null,
  )

  useEffect(() => {
    const left = RANKING_MS - (Date.now() + offset - plansza.od)
    const od = plansza.od
    const t = setTimeout(() => setDoneFor(od), Math.max(0, left))
    return () => clearTimeout(t)
  }, [plansza.od, offset])

  const showRanking = lista.length > 0 && doneFor !== plansza.od

  if (showRanking) return <RankingView lista={lista} variant="board" />

  const names = plansza.tryb === 'koniec' && plansza.klasy?.length ? plansza.klasy : klasy
  return (
    <div className={`edition-screen is-${plansza.tryb}`}>
      <p className="edition-screen__eyebrow">Jaka to melodia?</p>
      <FitText className="edition-screen__name" max={[8, 160]} min={40} widthRatio={0.8}>
        {plansza.nazwa}
      </FitText>
      {names.length > 0 && (
        <p className="edition-screen__classes">
          {names.map((n, i) => (
            <Fragment key={`${n}-${i}`}>
              {i > 0 && <span className="edition-screen__vs">VS</span>}
              <span className="edition-screen__class">{n}</span>
            </Fragment>
          ))}
        </p>
      )}
      {plansza.tryb === 'koniec' && <p className="edition-screen__done">zakończona</p>}
    </div>
  )
}
