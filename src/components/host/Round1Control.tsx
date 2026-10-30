import { useCallback, useEffect, useRef, useState } from 'react'
import {
  adjustScore,
  buzzAccepted,
  cancelTile,
  closeQuestion,
  markCorrect,
  markWrong,
  revealUnsolved,
  resetGame,
  selectTile,
  setChooser,
  songStarted,
  songTimedOut,
  startRound1,
} from '../../lib/game/hostActions'
import type { LoadedEdition } from '../../lib/game/questions'
import { ANSWER_MS, remaining, round1Value, secondsLeft, SONG_MS } from '../../lib/game/rules'
import { useGame, useServerNow } from '../../lib/game/state'
import { STATION_KEYS, type StationKey } from '../../lib/game/types'
import { useSongPlayer } from '../../lib/game/useSongPlayer'
import { labelForKey, useStationNames } from '../../lib/stations'

/** Panel prowadzącego dla rundy 1: tablica haseł, odtwarzanie, ocena odpowiedzi, punkty. */
export function Round1Control({ edition }: { edition: LoadedEdition | null }) {
  const game = useGame()
  const names = useStationNames()
  const { pytanie, runda1, zgloszenie } = game
  const live = pytanie?.faza === 'gra' || pytanie?.faza === 'odpowiedz'
  const now = useServerNow(live)
  const [error, setError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const question = pytanie && edition ? edition.set.runda1[pytanie.haslo] : undefined
  const label = (k: StationKey) => labelForKey(names, k)

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      console.error(e)
      setError('Nie udało się zapisać zmiany. Sprawdź połączenie.')
    }
  }, [])

  // --- Muzyka ---
  const onTimeout = useCallback(() => {
    run(songTimedOut)
  }, [run])
  const player = useSongPlayer(onTimeout)

  // Po kliknięciu kafelka od razu wczytujemy plik, żeby „Graj” startował bez opóźnienia.
  useEffect(() => {
    if (question && edition) {
      const url = edition.audio.get(question.plik)
      if (url) player.prepare(url, question.start)
    }
  }, [question, edition, player])

  // Zgłoszenie zawodnika: zatrzymujemy muzykę i zaczynamy 10 s na odpowiedź.
  const handledBuzz = useRef<number | null>(null)
  useEffect(() => {
    if (pytanie?.faza === 'gra' && zgloszenie && handledBuzz.current !== zgloszenie.czas) {
      handledBuzz.current = zgloszenie.czas
      player.stop()
      run(() => buzzAccepted(game))
    }
  }, [pytanie?.faza, zgloszenie, game, player, run])

  const play = async () => {
    if (!question || !edition?.audio.get(question.plik)) {
      setError(`Brak pliku ${question?.plik ?? ''} we wczytanym folderze.`)
      return
    }
    try {
      await player.playFromStart()
    } catch (e) {
      console.error(e)
      setError('Przeglądarka nie odtworzyła pliku. Sprawdź, czy to poprawny MP3.')
      return
    }
    await run(songStarted)
  }

  const onWrong = () =>
    run(async () => {
      const again = await markWrong(game)
      if (again) {
        await player.playFromStart()
        await songStarted()
      }
    })

  // --- Bez wczytanej edycji albo przed startem rundy ---
  if (!edition) {
    return (
      <section className="card card--wide">
        <h2 className="card__title">Runda 1</h2>
        <p className="muted">Najpierw wczytaj folder edycji.</p>
        {pytanie && <p className="notice">Trwa pytanie — wczytaj ten sam folder, żeby dokończyć.</p>}
      </section>
    )
  }

  const started = game.runda === 1 && runda1 && runda1.hasla.length > 0
  if (!started) {
    return (
      <section className="card card--wide">
        <div className="card__head">
          <h2 className="card__title">Runda 1</h2>
          <button type="button" className="btn btn--primary" onClick={() => run(() => startRound1(edition.set.runda1))}>
            Rozpocznij rundę 1
          </button>
        </div>
        <p className="muted">
          Punkty wszystkich stanowisk zostaną wyzerowane, a na tablicy pojawi się 5 haseł. Hasło wybiera najpierw
          stanowisko 1 — możesz to zmienić po starcie.
        </p>
        {error && <p className="error">{error}</p>}
      </section>
    )
  }

  const allDone = runda1.hasla.every((t) => t.stan !== 'ukryte')
  const blocked = pytanie?.zablokowane ?? {}

  return (
    <section className="card card--wide round-host">
      <div className="card__head">
        <h2 className="card__title">Runda 1 · {edition.set.edycja}</h2>
        <div className="card__actions">
          {confirmReset ? (
            <>
              <span className="muted small">Wyzerować grę?</span>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  setConfirmReset(false)
                  player.stop()
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

      {/* Wyniki i kto wybiera */}
      <div className="scores-host">
        {STATION_KEYS.map((k) => (
          <div key={k} className={`score-host ${runda1.wybiera === k ? 'is-chooser' : ''}`}>
            <div className="score-host__name">{label(k)}</div>
            <div className="score-host__points">{game.punkty[k]}</div>
            <div className="score-host__row">
              <button type="button" className="btn btn--tiny" onClick={() => run(() => adjustScore(game, k, -10))}>
                −10
              </button>
              <button type="button" className="btn btn--tiny" onClick={() => run(() => adjustScore(game, k, 10))}>
                +10
              </button>
              <button
                type="button"
                className={`btn btn--tiny ${runda1.wybiera === k ? 'btn--primary' : ''}`}
                onClick={() => run(() => setChooser(k))}
                title="To stanowisko wybiera następne hasło"
              >
                {runda1.wybiera === k ? 'Wybiera' : 'Niech wybiera'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Aktywna piosenka */}
      {pytanie && question ? (
        <div className={`stage-host phase-${pytanie.faza}`}>
          <div className="stage-host__top">
            <span className="eyebrow">Hasło {pytanie.haslo + 1}</span>
            <h3 className="stage-host__haslo">{question.haslo}</h3>
            <p className="stage-host__answer">
              Odpowiedź: <strong>{question.tytul}</strong> — {question.wykonawca}
            </p>
            {Object.keys(blocked).length > 0 && (
              <p className="muted">
                Zablokowani: {(Object.keys(blocked) as StationKey[]).map(label).join(', ')}
              </p>
            )}
          </div>

          {pytanie.faza === 'wybrane' && (
            <div className="stage-host__actions">
              <button type="button" className="btn btn--primary btn--huge" onClick={play}>
                ▶ Graj utwór
              </button>
              {Object.keys(blocked).length === 0 && (
                <button type="button" className="btn btn--ghost" onClick={() => run(cancelTile)}>
                  Wybierz inne hasło
                </button>
              )}
            </div>
          )}

          {pytanie.faza === 'gra' && (
            <div className="stage-host__live">
              <div className="big-value">
                {round1Value(now - (pytanie.start ?? now))}
                <span>pkt</span>
              </div>
              <Progress ms={remaining(SONG_MS, pytanie.start, now)} total={SONG_MS} />
              <p className="muted">Muzyka gra — czekamy na przycisk.</p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  player.stop()
                  run(songTimedOut)
                }}
              >
                Zatrzymaj (nikt nie zgadł)
              </button>
            </div>
          )}

          {pytanie.faza === 'odpowiedz' && pytanie.odpowiada && (
            <div className="stage-host__live">
              <p className="stage-host__who">
                <strong>{label(pytanie.odpowiada)}</strong> odpowiada za <strong>{pytanie.wartosc} pkt</strong>
              </p>
              <div className={`countdown ${remaining(ANSWER_MS, pytanie.odpowiedzStart, now) === 0 ? 'is-over' : ''}`}>
                {remaining(ANSWER_MS, pytanie.odpowiedzStart, now) === 0
                  ? 'Czas minął'
                  : secondsLeft(remaining(ANSWER_MS, pytanie.odpowiedzStart, now))}
              </div>
              <div className="stage-host__actions">
                <button type="button" className="btn btn--ok btn--huge" onClick={() => run(() => markCorrect(game, question))}>
                  ✓ Dobrze
                </button>
                <button type="button" className="btn btn--danger btn--huge" onClick={onWrong}>
                  ✗ Źle
                </button>
              </div>
              <p className="muted small">Po „Źle” piosenka leci od początku dla pozostałych.</p>
            </div>
          )}

          {pytanie.faza === 'brak' && (
            <div className="stage-host__actions">
              <p className="stage-host__who">Nikt nie zgadł.</p>
              <button type="button" className="btn btn--primary btn--huge" onClick={() => run(() => revealUnsolved(game, question))}>
                Odsłoń tytuł
              </button>
            </div>
          )}

          {pytanie.faza === 'odslona' && (
            <div className="stage-host__actions">
              <p className="stage-host__who">
                {pytanie.wynik?.stanowisko
                  ? `+${pytanie.wynik.punkty} pkt dla ${label(pytanie.wynik.stanowisko)}`
                  : 'Nikt nie zdobył punktów.'}
              </p>
              <button type="button" className="btn btn--primary btn--huge" onClick={() => run(closeQuestion)}>
                {allDone ? 'Pokaż wyniki rundy' : 'Wróć do tablicy haseł'}
              </button>
            </div>
          )}
        </div>
      ) : pytanie ? (
        <p className="notice">Trwa hasło nr {pytanie.haslo + 1}, ale w tym folderze go nie ma — wczytaj właściwy folder.</p>
      ) : (
        <>
          {allDone ? (
            <p className="notice">Runda 1 zakończona. Kolejne rundy wkrótce.</p>
          ) : (
            <p className="muted">
              Wybiera <strong>{runda1.wybiera ? label(runda1.wybiera) : '—'}</strong>. Kliknij hasło, które wskaże.
            </p>
          )}
          <div className="tiles-host">
            {runda1.hasla.map((t, i) => {
              const q = edition.set.runda1[i]
              const done = t.stan !== 'ukryte'
              return (
                <button
                  key={i}
                  type="button"
                  className={`tile-host ${done ? 'is-done' : ''}`}
                  disabled={done}
                  onClick={() => run(() => selectTile(i))}
                >
                  <span className="tile-host__num">{i + 1}</span>
                  <span className="tile-host__haslo">{t.haslo}</span>
                  <span className="tile-host__answer">
                    {q ? `${q.tytul} — ${q.wykonawca}` : '?'}
                  </span>
                  {done && (
                    <span className="tile-host__result">
                      {t.stan === 'odgadniete' && t.stanowisko ? `${label(t.stanowisko)} +${t.punkty}` : 'nikt'}
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

function Progress({ ms, total }: { ms: number; total: number }) {
  return (
    <div className="progress" aria-hidden>
      <div className="progress__bar" style={{ width: `${(ms / total) * 100}%` }} />
    </div>
  )
}
