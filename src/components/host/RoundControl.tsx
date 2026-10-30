import { useCallback, useEffect, useRef, useState } from 'react'
import {
  adjustScore,
  announceRound2,
  buzzAccepted,
  cancelTile,
  closeQuestion,
  markCorrect,
  markWrong,
  resetGame,
  revealUnsolved,
  selectTile,
  setChooser,
  songStarted,
  songTimedOut,
  startRound1,
  startRound2,
  undoAnnounceRound2,
} from '../../lib/game/hostActions'
import type { LoadedEdition } from '../../lib/game/questions'
import {
  ANSWER_MS,
  currentChooser,
  elapsedOf,
  elimination,
  remaining,
  resumesAfterWrong,
  roundTilesDone,
  roundValue,
  secondsLeft,
  SONG_MS,
} from '../../lib/game/rules'
import { questionFor, useGame, useServerNow } from '../../lib/game/state'
import { STATION_KEYS, type GameState, type Question, type RoundNo, type StationKey, type Tile } from '../../lib/game/types'
import { useSongPlayer } from '../../lib/game/useSongPlayer'
import { labelForKey, useStationNames } from '../../lib/stations'

type Run = (fn: () => Promise<unknown>) => Promise<void>

/** Panel prowadzącego dla rund 1–2: tablica haseł, odtwarzanie, ocena odpowiedzi, punkty, eliminacja. */
export function RoundControl({ edition }: { edition: LoadedEdition | null }) {
  const game = useGame()
  const names = useStationNames()
  const { pytanie, zgloszenie } = game
  const runda: RoundNo = game.runda === 2 ? 2 : 1
  const [error, setError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const label = useCallback((k: StationKey) => labelForKey(names, k), [names])

  const question = pytanie && edition ? questionFor(edition.set, pytanie) : undefined

  const run: Run = useCallback(async (fn) => {
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
      if (!pytanie) return
      const again = await markWrong(game)
      if (!again) return
      if (resumesAfterWrong(pytanie.runda)) await player.resume()
      else await player.playFromStart()
      await songStarted()
    })

  // --- Bez wczytanej edycji albo przed startem gry ---
  if (!edition) {
    return (
      <section className="card card--wide">
        <h2 className="card__title">Rozgrywka</h2>
        <p className="muted">Najpierw wczytaj folder edycji.</p>
        {pytanie && <p className="notice">Trwa pytanie — wczytaj ten sam folder, żeby dokończyć.</p>}
      </section>
    )
  }

  if (game.runda === undefined) {
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

  return (
    <section className="card card--wide round-host">
      <div className="card__head">
        <h2 className="card__title">
          Runda {runda} · {edition.set.edycja}
        </h2>
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

      <Scores game={game} runda={runda} label={label} run={run} />

      {pytanie && question ? (
        <Stage
          game={game}
          question={question}
          label={label}
          run={run}
          onPlay={play}
          onWrong={onWrong}
          onStop={() => {
            player.stop()
            run(songTimedOut)
          }}
        />
      ) : pytanie ? (
        <p className="notice">Trwa hasło, ale w tym folderze go nie ma — wczytaj właściwy folder.</p>
      ) : (
        <Between game={game} edition={edition} runda={runda} label={label} run={run} />
      )}

      {error && <p className="error">{error}</p>}
    </section>
  )
}

// ---------- Wyniki stanowisk ----------

interface ScoresProps {
  game: GameState
  runda: RoundNo
  label: (k: StationKey) => string
  run: Run
}

function Scores({ game, runda, label, run }: ScoresProps) {
  const chooser = currentChooser(game)
  const odpada = game.runda2?.odpada
  const canChoose = !odpada && !(runda === 2 && roundTilesDone(game, 2))
  return (
    <div className="scores-host">
      {STATION_KEYS.map((k) => (
        <div key={k} className={`score-host ${chooser === k ? 'is-chooser' : ''} ${odpada === k ? 'is-out' : ''}`}>
          <div className="score-host__name">
            {label(k)}
            {odpada === k && <span className="tag tag--out">odpada</span>}
            {game.runda2?.awans?.[k] && !odpada && <span className="tag">wygrał dogrywkę</span>}
          </div>
          <div className="score-host__points">{game.punkty[k]}</div>
          <div className="score-host__row">
            <button type="button" className="btn btn--tiny" onClick={() => run(() => adjustScore(game, k, -10))}>
              −10
            </button>
            <button type="button" className="btn btn--tiny" onClick={() => run(() => adjustScore(game, k, 10))}>
              +10
            </button>
            {canChoose && (
              <button
                type="button"
                className={`btn btn--tiny ${chooser === k ? 'btn--primary' : ''}`}
                onClick={() => run(() => setChooser(runda, k))}
                title="To stanowisko wybiera następne hasło"
              >
                {chooser === k ? 'Wybiera' : 'Niech wybiera'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- Aktywna piosenka ----------

interface StageProps {
  game: GameState
  question: Question
  label: (k: StationKey) => string
  run: Run
  onPlay: () => void
  onWrong: () => void
  onStop: () => void
}

function Stage({ game, question, label, run, onPlay, onWrong, onStop }: StageProps) {
  const pytanie = game.pytanie!
  const live = pytanie.faza === 'gra' || pytanie.faza === 'odpowiedz'
  const now = useServerNow(live)
  const poza = pytanie.poza ?? {}
  const blockedKeys = (Object.keys(pytanie.zablokowane ?? {}) as StationKey[]).filter((k) => !poza[k])
  const pozaKeys = Object.keys(poza) as StationKey[]
  const elapsed = elapsedOf(pytanie, now)
  const answerLeft = remaining(ANSWER_MS, pytanie.odpowiedzStart, now)
  const resume = resumesAfterWrong(pytanie.runda)

  return (
    <div className={`stage-host phase-${pytanie.faza}`}>
      <div className="stage-host__top">
        <span className="eyebrow">{pytanie.dogrywka ? 'Dogrywka — bez punktów' : `Hasło ${pytanie.haslo + 1}`}</span>
        <h3 className="stage-host__haslo">{question.haslo}</h3>
        <p className="stage-host__answer">
          Odpowiedź: <strong>{question.tytul}</strong> — {question.wykonawca}
        </p>
        {pozaKeys.length > 0 && <p className="muted">Nie grają: {pozaKeys.map(label).join(', ')}</p>}
        {blockedKeys.length > 0 && <p className="muted">Zablokowani: {blockedKeys.map(label).join(', ')}</p>}
      </div>

      {pytanie.faza === 'wybrane' && (
        <div className="stage-host__actions">
          <button type="button" className="btn btn--primary btn--huge" onClick={onPlay}>
            ▶ {pytanie.przesuniecie ? 'Graj dalej' : 'Graj utwór'}
          </button>
          {blockedKeys.length === 0 && (
            <button type="button" className="btn btn--ghost" onClick={() => run(cancelTile)}>
              Wybierz inne hasło
            </button>
          )}
        </div>
      )}

      {pytanie.faza === 'gra' && (
        <div className="stage-host__live">
          {pytanie.dogrywka ? (
            <div className="big-value">Dogrywka</div>
          ) : (
            <div className="big-value">
              {roundValue(pytanie.runda, elapsed)}
              <span>pkt</span>
            </div>
          )}
          <Progress ms={Math.max(0, SONG_MS - elapsed)} total={SONG_MS} />
          <p className="muted">Muzyka gra — czekamy na przycisk.</p>
          <button type="button" className="btn btn--ghost" onClick={onStop}>
            Zatrzymaj (nikt nie zgadł)
          </button>
        </div>
      )}

      {pytanie.faza === 'odpowiedz' && pytanie.odpowiada && (
        <div className="stage-host__live">
          <p className="stage-host__who">
            <strong>{label(pytanie.odpowiada)}</strong>{' '}
            {pytanie.dogrywka ? 'odpowiada w dogrywce' : <>odpowiada za <strong>{pytanie.wartosc} pkt</strong></>}
          </p>
          <div className={`countdown ${answerLeft === 0 ? 'is-over' : ''}`}>
            {answerLeft === 0 ? 'Czas minął' : secondsLeft(answerLeft)}
          </div>
          <div className="stage-host__actions">
            <button type="button" className="btn btn--ok btn--huge" onClick={() => run(() => markCorrect(game, question))}>
              ✓ Dobrze
            </button>
            <button type="button" className="btn btn--danger btn--huge" onClick={onWrong}>
              ✗ Źle
            </button>
          </div>
          <p className="muted small">
            {resume
              ? 'Po „Źle” muzyka gra dalej dla pozostałych, a stawka dalej maleje.'
              : 'Po „Źle” piosenka leci od początku dla pozostałych.'}
          </p>
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
              ? pytanie.dogrywka
                ? `${label(pytanie.wynik.stanowisko)} wygrywa dogrywkę`
                : `+${pytanie.wynik.punkty} pkt dla ${label(pytanie.wynik.stanowisko)}`
              : 'Nikt nie zdobył punktów.'}
          </p>
          <button type="button" className="btn btn--primary btn--huge" onClick={() => run(closeQuestion)}>
            Wróć do tablicy haseł
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- Między piosenkami: tablica, koniec rundy, eliminacja ----------

interface BetweenProps {
  game: GameState
  edition: LoadedEdition
  runda: RoundNo
  label: (k: StationKey) => string
  run: Run
}

function Between({ game, edition, runda, label, run }: BetweenProps) {
  const chooser = currentChooser(game)
  const set = edition.set

  // Runda 1
  if (runda === 1) {
    const r1 = game.runda1
    if (!r1) return null
    if (roundTilesDone(game, 1)) {
      return (
        <div className="round-end">
          <p className="notice">Runda 1 zakończona. Punkty przechodzą do rundy 2.</p>
          {set.runda2.length === 3 ? (
            <button
              type="button"
              className="btn btn--primary btn--huge"
              onClick={() => run(() => startRound2(game, set.runda2, set.dogrywka2))}
            >
              Rozpocznij rundę 2
            </button>
          ) : (
            <p className="error">W pytania.json brakuje listy „runda2” (3 hasła) — dopisz ją i wczytaj folder ponownie.</p>
          )}
          <TileGrid tiles={r1.hasla} questions={set.runda1} label={label} />
        </div>
      )
    }
    return (
      <>
        <p className="muted">
          Wybiera <strong>{chooser ? label(chooser) : '—'}</strong>. Kliknij hasło, które wskaże.
        </p>
        <TileGrid tiles={r1.hasla} questions={set.runda1} label={label} onPick={(i) => run(() => selectTile(1, i))} />
      </>
    )
  }

  // Runda 2
  const r2 = game.runda2
  if (!r2) return null

  if (r2.odpada) {
    const awans = STATION_KEYS.filter((k) => k !== r2.odpada)
    return (
      <div className="round-end">
        <p className="notice">
          Do rundy 3 przechodzą: <strong>{awans.map(label).join(' i ')}</strong>. Odpada <strong>{label(r2.odpada)}</strong>{' '}
          z wynikiem {game.punkty[r2.odpada]} pkt. Runda 3 wkrótce.
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => run(undoAnnounceRound2)}>
          Cofnij ogłoszenie
        </button>
      </div>
    )
  }

  if (!roundTilesDone(game, 2)) {
    return (
      <>
        <p className="muted">
          Wybiera <strong>{chooser ? label(chooser) : '—'}</strong>
          {r2.hasla.every((t) => t.stan === 'ukryte') && ' (najmniej punktów po rundzie 1)'}. Kliknij hasło, które wskaże.
        </p>
        <TileGrid tiles={r2.hasla} questions={set.runda2} label={label} onPick={(i) => run(() => selectTile(2, i))} />
      </>
    )
  }

  const e = elimination(game.punkty, r2.awans)
  return (
    <div className="round-end">
      {e.status === 'decided' ? (
        <>
          <p className="notice">
            Koniec rundy 2. Odpada <strong>{label(e.odpada)}</strong> ({game.punkty[e.odpada]} pkt). Do rundy 3:{' '}
            <strong>{e.awans.map(label).join(' i ')}</strong>.
          </p>
          <button type="button" className="btn btn--primary btn--huge" onClick={() => run(() => announceRound2(e.odpada))}>
            Ogłoś wyniki na tablicy
          </button>
        </>
      ) : (
        <>
          <p className="notice">
            Remis na ostatnim miejscu: <strong>{e.contenders.map(label).join(', ')}</strong> — dogrywka (zasady rundy 2,
            bez punktów). Kto odgadnie, przechodzi dalej.{' '}
            {e.chooser ? (
              <>
                Kategorię wybiera <strong>{label(e.chooser)}</strong> — sam nie gra.
              </>
            ) : (
              'Kategorię wybierasz Ty.'
            )}
          </p>
          {r2.dogrywki && r2.dogrywki.some((t) => t.stan === 'ukryte') ? (
            <TileGrid
              tiles={r2.dogrywki}
              questions={set.dogrywka2}
              label={label}
              onPick={(i) =>
                run(() => selectTile(2, i, { poza: STATION_KEYS.filter((k) => !e.contenders.includes(k)) }))
              }
            />
          ) : (
            <p className="error">
              Brak haseł na dogrywkę (lista „dogrywka2” w pytania.json). Rozstrzygnij ręcznie poniżej.
            </p>
          )}
        </>
      )}
      <ManualElimination label={label} run={run} />
    </div>
  )
}

function ManualElimination({ label, run }: { label: (k: StationKey) => string; run: Run }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button type="button" className="link-button" onClick={() => setOpen(true)}>
        Rozstrzygnij ręcznie
      </button>
    )
  }
  return (
    <div className="manual">
      <span className="muted small">Kto odpada?</span>
      {STATION_KEYS.map((k) => (
        <button key={k} type="button" className="btn btn--tiny" onClick={() => run(() => announceRound2(k))}>
          {label(k)}
        </button>
      ))}
      <button type="button" className="btn btn--tiny" onClick={() => setOpen(false)}>
        Anuluj
      </button>
    </div>
  )
}

// ---------- Kafelki ----------

interface TileGridProps {
  tiles: Tile[]
  questions: Question[]
  label: (k: StationKey) => string
  onPick?: (index: number) => void
}

function TileGrid({ tiles, questions, label, onPick }: TileGridProps) {
  return (
    <div className="tiles-host" style={{ gridTemplateColumns: `repeat(${Math.max(tiles.length, 3)}, minmax(0, 1fr))` }}>
      {tiles.map((t, i) => {
        const q = questions[i]
        const done = t.stan !== 'ukryte'
        return (
          <button
            key={i}
            type="button"
            className={`tile-host ${done ? 'is-done' : ''}`}
            disabled={done || !onPick}
            onClick={() => onPick?.(i)}
          >
            <span className="tile-host__num">{i + 1}</span>
            <span className="tile-host__haslo">{t.haslo}</span>
            <span className="tile-host__answer">{q ? `${q.tytul} — ${q.wykonawca}` : '?'}</span>
            {done && (
              <span className="tile-host__result">
                {t.stan === 'odgadniete' && t.stanowisko ? `${label(t.stanowisko)} +${t.punkty}` : 'nikt'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Progress({ ms, total }: { ms: number; total: number }) {
  return (
    <div className="progress" aria-hidden>
      <div className="progress__bar" style={{ width: `${(ms / total) * 100}%` }} />
    </div>
  )
}
