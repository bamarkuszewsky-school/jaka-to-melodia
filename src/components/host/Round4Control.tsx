import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resetGame } from '../../lib/game/hostActions'
import type { LoadedEdition } from '../../lib/game/questions'
import { clockRun, clockStop, finalCorrect, finalSkip, finalWrong } from '../../lib/game/round4Actions'
import { ANSWER_MS, remaining, secondsLeft } from '../../lib/game/rules'
import { clockLeft, FINAL_BONUS, FINAL_MS, FINAL_POINTS, formatClock, guessedCount } from '../../lib/game/rules4'
import { useGame, useServerNow } from '../../lib/game/state'
import { STATION_KEYS, type StationKey } from '../../lib/game/types'
import { labelForKey, useStationNames } from '../../lib/stations'

/** Prosty odtwarzacz finału: melodia gra od początku fragmentu, bez limitu 15 s (pilnuje zegar). */
function useFinalPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const play = useCallback(async (url: string, startSec: number) => {
    if (!audioRef.current) audioRef.current = new Audio()
    const audio = audioRef.current
    audio.pause()
    if (audio.src !== url) {
      audio.src = url
      audio.load()
    }
    if (audio.readyState < 1) {
      await new Promise<void>((r) => audio.addEventListener('loadedmetadata', () => r(), { once: true }))
    }
    audio.currentTime = startSec
    await audio.play()
  }, [])
  const stop = useCallback(() => audioRef.current?.pause(), [])
  useEffect(() => () => audioRef.current?.pause(), [])
  return { play, stop }
}

/** Panel prowadzącego — finał: 7 melodii w 30 sekund. */
export function Round4Control({ edition }: { edition: LoadedEdition | null }) {
  const game = useGame()
  const names = useStationNames()
  const label = useCallback((k: StationKey) => labelForKey(names, k), [names])
  const r = game.runda4
  const questions = useMemo(() => edition?.set.final ?? [], [edition])
  const now = useServerNow(r?.faza === 'gra' || r?.faza === 'stop')
  const player = useFinalPlayer()
  const [error, setError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      console.error(e)
      setError('Nie udało się — sprawdź połączenie i plik melodii.')
    }
  }, [])

  const playSong = useCallback(
    async (index: number, czasZostal: number) => {
      const q = questions[index]
      const url = q ? edition?.audio.get(q.plik) : undefined
      if (!q || !url) throw new Error(`Brak pliku melodii ${index + 1}`)
      await player.play(url, q.start)
      await clockRun(index, czasZostal)
    },
    [questions, edition, player],
  )

  // STOP z iPada finalisty.
  const handledStop = useRef<number | null>(null)
  useEffect(() => {
    const s = game.stop4
    if (r?.faza === 'gra' && s && s.stanowisko === r.gracz && handledStop.current !== s.czas) {
      handledStop.current = s.czas
      player.stop()
      run(() => clockStop(game, s.czas))
    }
  }, [game, r?.faza, r?.gracz, player, run])

  // Koniec czasu — muzyka staje, zawodnik ma ostatnią szansę.
  const timedOut = useRef<number | null>(null)
  useEffect(() => {
    if (r?.faza === 'gra' && r.start !== undefined && clockLeft(r, now) <= 0 && timedOut.current !== r.start) {
      timedOut.current = r.start
      player.stop()
      run(() => clockStop(game, now, true))
    }
  }, [now, r, game, player, run])

  if (!r) return null

  if (!edition || questions.length !== 7) {
    return (
      <section className="card card--wide">
        <h2 className="card__title">Finał</h2>
        <p className="muted">
          {edition
            ? 'W pytania.json brakuje listy „final” (7 melodii) — dopisz ją i wczytaj folder ponownie.'
            : 'Wczytaj folder edycji, żeby poprowadzić finał.'}
        </p>
      </section>
    )
  }

  const current = questions[r.biezacy]
  const left = clockLeft(r, now)
  const answerLeft = remaining(ANSWER_MS, r.odpowiedzStart, now)
  const guessed = guessedCount(r.utwory)

  const afterAnswer = (result: { kind: 'play'; index: number; czasZostal: number } | { kind: 'end' }) =>
    result.kind === 'play' ? playSong(result.index, result.czasZostal) : Promise.resolve()

  const ranking = [...STATION_KEYS].sort((a, b) => game.punkty[b] - game.punkty[a])

  return (
    <section className="card card--wide round-host">
      <div className="card__head">
        <h2 className="card__title">Finał · {label(r.gracz)} · {edition.set.edycja}</h2>
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

      <div className="final-host">
        <div className="final-host__clock-box">
          <div className={`final-clock ${r.faza === 'gra' ? 'is-running' : ''} ${left < 5000 ? 'is-low' : ''}`}>
            {formatClock(left)}
          </div>
          <p className="muted">
            Odgadnięte {guessed}/7 · {r.zdobyte} pkt w finale ({FINAL_POINTS} za melodię, komplet +{FINAL_BONUS})
          </p>
        </div>

        <div className="final-host__stage">
          {r.faza === 'gotowe' && (
            <>
              <p className="stage-host__who">
                Gra <strong>{label(r.gracz)}</strong>. Zegar ruszy razem z pierwszą melodią.
              </p>
              <button
                type="button"
                className="btn btn--primary btn--huge"
                onClick={() => run(() => playSong(0, FINAL_MS))}
              >
                ▶ Start finału
              </button>
            </>
          )}

          {r.faza === 'gra' && current && (
            <>
              <p className="stage-host__answer">
                Melodia {r.biezacy + 1}: <strong>{current.tytul}</strong> — {current.wykonawca}
              </p>
              <p className="muted">Czekamy, aż zawodnik wciśnie STOP na iPadzie.</p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  player.stop()
                  run(() => clockStop(game, now))
                }}
              >
                STOP (za zawodnika)
              </button>
            </>
          )}

          {r.faza === 'stop' && current && (
            <>
              <p className="stage-host__answer">
                Melodia {r.biezacy + 1}: <strong>{current.tytul}</strong> — {current.wykonawca}
              </p>
              {r.ostatnia && <p className="notice">Czas minął — ostatnia szansa na odpowiedź.</p>}
              <div className={`countdown ${answerLeft === 0 ? 'is-over' : ''}`}>
                {answerLeft === 0 ? 'Czas na odpowiedź minął' : secondsLeft(answerLeft)}
              </div>
              <div className="stage-host__actions">
                <button
                  type="button"
                  className="btn btn--ok btn--huge"
                  onClick={() => run(async () => afterAnswer(await finalCorrect(game, questions)))}
                >
                  ✓ Dobrze
                </button>
                {!r.ostatnia && (
                  <button
                    type="button"
                    className="btn btn--primary btn--huge"
                    onClick={() => run(async () => afterAnswer(await finalSkip(game, questions)))}
                  >
                    ↷ Dalej
                  </button>
                )}
                <button type="button" className="btn btn--danger btn--huge" onClick={() => run(() => finalWrong(game, questions))}>
                  ✗ Źle
                </button>
              </div>
              <p className="muted small">„Dalej” = zawodnik prosi o następną melodię (zegar rusza dalej). Zła odpowiedź kończy finał.</p>
            </>
          )}

          {r.faza === 'koniec' && (
            <>
              <p className="stage-host__who">
                {r.wynik === 'komplet'
                  ? `KOMPLET! ${label(r.gracz)} zostaje mistrzem edycji (+${FINAL_BONUS} pkt bonusu).`
                  : r.wynik === 'blad'
                    ? `Błędna odpowiedź — koniec finału. ${guessed}/7, +${r.zdobyte} pkt.`
                    : `Czas minął — ${guessed}/7, +${r.zdobyte} pkt.`}
              </p>
              <ol className="final-ranking">
                {ranking.map((k) => (
                  <li key={k}>
                    <span>{label(k)}</span>
                    <strong>{game.punkty[k]} pkt</strong>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      <ol className="final-songs">
        {questions.map((q, i) => {
          const s = r.utwory[i]
          return (
            <li key={i} className={`final-song is-${s?.stan ?? 'czeka'} ${i === r.biezacy && r.faza !== 'koniec' && r.faza !== 'gotowe' ? 'is-current' : ''}`}>
              <span className="final-song__num">{i + 1}</span>
              <span>
                {q.tytul} <span className="muted">— {q.wykonawca}</span>
              </span>
              <span className="final-song__state">
                {s?.stan === 'odgadnieta' ? '✓' : s?.stan === 'pominieta' ? '↷' : s?.stan === 'zla' ? '✗' : ''}
              </span>
            </li>
          )
        })}
      </ol>

      {error && <p className="error">{error}</p>}
    </section>
  )
}
