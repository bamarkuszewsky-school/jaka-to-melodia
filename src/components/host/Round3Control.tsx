import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resetGame } from '../../lib/game/hostActions'
import type { LoadedEdition } from '../../lib/game/questions'
import {
  cancelTile3,
  closeQuestion3,
  judge3,
  notesPlayed,
  processBid,
  replayNotes,
  selectTile3,
  setChooser3,
  sheetToDataUrl,
} from '../../lib/game/round3Actions'
import { ANSWER_MS, remaining, secondsLeft } from '../../lib/game/rules'
import { allowedBids, canPass, nut, opponent, poNutach, WINS_TO_FINAL } from '../../lib/game/rules3'
import { useGame, useServerNow } from '../../lib/game/state'
import type { StationKey } from '../../lib/game/types'
import { labelForKey, useStationNames } from '../../lib/stations'

/** Panel prowadzącego dla rundy 3 — licytacja nut, gra do 3 wygranych. */
export function Round3Control({ edition }: { edition: LoadedEdition | null }) {
  const game = useGame()
  const names = useStationNames()
  const label = useCallback((k: StationKey) => labelForKey(names, k), [names])
  const [error, setError] = useState<string | null>(null)
  const [bidNote, setBidNote] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState(false)

  const r3 = game.runda3
  const p = game.pytanie3
  const questions = edition?.set.runda3 ?? []
  const q = p ? questions[p.haslo] : undefined
  const now = useServerNow(p?.faza === 'odpowiedz')

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      console.error(e)
      setError('Nie udało się zapisać zmiany. Sprawdź połączenie.')
    }
  }, [])

  // Ruch z iPada w licytacji.
  const handledMove = useRef<number | null>(null)
  useEffect(() => {
    const move = game.ruch
    if (!move || p?.faza !== 'licytacja' || handledMove.current === move.czas) return
    handledMove.current = move.czas
    processBid(game, move)
      .then((reason) => setBidNote(reason ? `Odrzucono ruch ${label(move.stanowisko)}: ${reason}` : null))
      .catch(() => setError('Nie udało się przetworzyć licytacji.'))
  }, [game, p?.faza, label])

  // Muzyk kliknął „Zagrane”.
  const handledPlayed = useRef<number | null>(null)
  useEffect(() => {
    if (game.zagrane && p?.faza === 'granie' && handledPlayed.current !== game.zagrane) {
      handledPlayed.current = game.zagrane
      run(notesPlayed)
    }
  }, [game.zagrane, p?.faza, run])

  // Podgląd nut u hosta (z pliku na dysku).
  const sheetFile = q?.nuty ? edition?.images.get(q.nuty) : undefined
  const sheetUrl = useMemo(() => (sheetFile ? URL.createObjectURL(sheetFile) : null), [sheetFile])
  useEffect(() => () => (sheetUrl ? URL.revokeObjectURL(sheetUrl) : undefined), [sheetUrl])

  if (!r3) return null

  if (!edition || questions.length !== 6) {
    return (
      <section className="card card--wide">
        <h2 className="card__title">Runda 3</h2>
        <p className="muted">
          {edition
            ? 'W pytania.json brakuje listy „runda3” (6 zagadek) — dopisz ją i wczytaj folder ponownie.'
            : 'Wczytaj folder edycji, żeby prowadzić rundę 3.'}
        </p>
      </section>
    )
  }

  const pick = (i: number) =>
    run(async () => {
      setBusy(true)
      try {
        const question = questions[i]
        const file = question.nuty ? edition.images.get(question.nuty) : undefined
        const sheet = file ? await sheetToDataUrl(file) : null
        await selectTile3(game, i, question, sheet)
      } finally {
        setBusy(false)
      }
    })

  const hostBid = (stanowisko: StationKey, bid: { nuty?: number; pas?: boolean }) =>
    run(async () => {
      const reason = await processBid(game, { stanowisko, ...bid })
      setBidNote(reason)
    })

  const answerLeft = remaining(ANSWER_MS, p?.odpowiedzStart, now)

  return (
    <section className="card card--wide round-host">
      <div className="card__head">
        <h2 className="card__title">Runda 3 · Licytacja nut · {edition.set.edycja}</h2>
        <div className="card__actions">
          {confirmReset ? (
            <>
              <span className="muted small">Wyzerować grę?</span>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  setConfirmReset(false)
                  run(resetGame)
                }}
              >
                Tak, od nowa
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmReset(false)}>
                Nie
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmReset(true)}>
              Nowa gra
            </button>
          )}
        </div>
      </div>

      {/* Dwie klasy: punkty, wygrane zagadki, kto wybiera */}
      <div className="scores-host scores-host--two">
        {r3.gracze.map((k) => (
          <div key={k} className={`score-host ${!p && r3.wybiera === k ? 'is-chooser' : ''}`}>
            <div className="score-host__name">
              {label(k)}
              {r3.zwyciezca === k && <span className="tag">finał</span>}
            </div>
            <div className="score-host__points">{game.punkty[k]}</div>
            <Wins count={r3.wygrane[k] ?? 0} />
            {!p && !r3.zwyciezca && (
              <div className="score-host__row">
                <button
                  type="button"
                  className={`btn btn--tiny ${r3.wybiera === k ? 'btn--primary' : ''}`}
                  onClick={() => run(() => setChooser3(k))}
                >
                  {r3.wybiera === k ? 'Wybiera numer' : 'Niech wybiera'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {p && q ? (
        <div className={`stage-host phase-${p.faza}`}>
          <div className="stage-host__top">
            <span className="eyebrow">
              Zagadka {p.haslo + 1} · {p.wartosc} pkt
            </span>
            <h3 className="stage-host__haslo">{q.wykonawca}</h3>
            <p className="stage-host__answer">
              Odpowiedź: <strong>{q.tytul}</strong>
            </p>
            {q.podpowiedz && (
              <p className="hint-box">
                <span className="hint-box__label">Przeczytaj podpowiedź</span>
                {q.podpowiedz}
              </p>
            )}
            {sheetUrl && <img className="sheet-preview" src={sheetUrl} alt="Nuty" />}
            {q.nuty && !sheetFile && <p className="error">Brak pliku nut: {q.nuty}</p>}
          </div>

          <div className="stage-host__live">
            {p.faza === 'licytacja' && (
              <>
                <p className="stage-host__who">
                  Licytuje <strong>{label(p.licytacja.kolej)}</strong>
                  {p.licytacja.nuty !== undefined && p.licytacja.prowadzi && (
                    <>
                      {' '}
                      · oferta {label(p.licytacja.prowadzi)}: <strong>{p.licytacja.nuty} {nut(p.licytacja.nuty)}</strong>
                    </>
                  )}
                </p>
                <p className="muted small">Klasy licytują na iPadach. Jeśli mówią na głos — wpisz ruch tutaj:</p>
                <div className="bid-row">
                  {allowedBids(p.licytacja).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="btn btn--tiny bid-row__btn"
                      onClick={() => hostBid(p.licytacja.kolej, { nuty: n })}
                    >
                      {n}
                    </button>
                  ))}
                  {canPass(p.licytacja) && p.licytacja.prowadzi && (
                    <button
                      type="button"
                      className="btn btn--tiny btn--primary"
                      onClick={() => hostBid(p.licytacja.kolej, { pas: true })}
                    >
                      Pas — „Graj, {label(p.licytacja.prowadzi)}!”
                    </button>
                  )}
                </div>
                {bidNote && <p className="error small">{bidNote}</p>}
                <button type="button" className="btn btn--ghost" onClick={() => run(cancelTile3)}>
                  Wybierz inny numer
                </button>
              </>
            )}

            {p.faza === 'granie' && p.gra && p.nuty && (
              <>
                <p className="stage-host__who">
                  <strong>{label(p.gra)}</strong> zgaduje {poNutach(p.nuty)}
                </p>
                <p className="muted">Muzyk gra {p.nuty} {nut(p.nuty)} i klika „Zagrane” — wtedy rusza 10 s.</p>
                <button type="button" className="btn btn--primary btn--huge" onClick={() => run(notesPlayed)}>
                  Zagrane (za muzyka)
                </button>
              </>
            )}

            {p.faza === 'odpowiedz' && p.gra && (
              <>
                <p className="stage-host__who">
                  <strong>{label(p.gra)}</strong> odpowiada za <strong>{p.wartosc} pkt</strong>
                </p>
                <div className={`countdown ${answerLeft === 0 ? 'is-over' : ''}`}>
                  {answerLeft === 0 ? 'Czas minął' : secondsLeft(answerLeft)}
                </div>
                <div className="stage-host__actions">
                  <button type="button" className="btn btn--ok btn--huge" onClick={() => run(() => judge3(game, q, true))}>
                    ✓ Dobrze
                  </button>
                  <button type="button" className="btn btn--danger btn--huge" onClick={() => run(() => judge3(game, q, false))}>
                    ✗ Źle
                  </button>
                </div>
                <p className="muted small">
                  Po „Źle” punkt i {p.wartosc} pkt dostaje {label(opponent(r3.gracze, p.gra))}.
                </p>
                <button type="button" className="link-button" onClick={() => run(replayNotes)}>
                  Muzyk się pomylił — zagraj jeszcze raz
                </button>
              </>
            )}

            {p.faza === 'odslona' && p.wynik && (
              <>
                <p className="stage-host__who">
                  {p.wynik.trafil
                    ? `${label(p.wynik.stanowisko)} zgaduje! +${p.wynik.punkty} pkt`
                    : `Pudło — punkt i ${p.wynik.punkty} pkt dla ${label(p.wynik.stanowisko)}`}
                </p>
                <button type="button" className="btn btn--primary btn--huge" onClick={() => run(closeQuestion3)}>
                  {r3.zwyciezca ? 'Pokaż zwycięzcę rundy' : 'Wróć do numerów'}
                </button>
              </>
            )}
          </div>
        </div>
      ) : r3.zwyciezca ? (
        <p className="notice">
          Do finału przechodzi <strong>{label(r3.zwyciezca)}</strong> ({r3.wygrane[r3.zwyciezca]} : {' '}
          {r3.wygrane[opponent(r3.gracze, r3.zwyciezca)] ?? 0}). Runda 4 wkrótce.
        </p>
      ) : (
        <>
          <p className="muted">
            Numer wybiera <strong>{label(r3.wybiera)}</strong>, licytację zaczyna {label(opponent(r3.gracze, r3.wybiera))}.
            Gra do {WINS_TO_FINAL} wygranych zagadek.
          </p>
          <div className="tiles-host tiles-host--six">
            {r3.hasla.map((t, i) => {
              const question = questions[i]
              const done = t.stan !== 'ukryte'
              return (
                <button
                  key={i}
                  type="button"
                  className={`tile-host ${done ? 'is-done' : ''}`}
                  disabled={done || busy}
                  onClick={() => pick(i)}
                >
                  <span className="tile-host__num">
                    {i + 1} · {question.wartosc} pkt
                  </span>
                  <span className="tile-host__haslo">{question.wykonawca}</span>
                  <span className="tile-host__answer">{question.tytul}</span>
                  {done && t.stanowisko && (
                    <span className="tile-host__result">
                      {t.trafil ? `${label(t.stanowisko)} zgadł` : `pudło → ${label(t.stanowisko)}`}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {error && <p className="error">{error}</p>}
    </section>
  )
}

function Wins({ count }: { count: number }) {
  return (
    <div className="wins" aria-label={`${count} z ${WINS_TO_FINAL} wygranych`}>
      {Array.from({ length: WINS_TO_FINAL }, (_, i) => (
        <span key={i} className={i < count ? 'is-on' : ''} />
      ))}
    </div>
  )
}
