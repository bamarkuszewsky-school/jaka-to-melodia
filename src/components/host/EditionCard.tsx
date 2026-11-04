import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { canEndRound, endRound } from '../../lib/game/endRound'
import type { LoadedEdition } from '../../lib/game/questions'
import type { GameState, StationKey } from '../../lib/game/types'
import { cancelEdition, createEdition, finishEdition } from '../../lib/library/db'
import {
  DRAW_KEYS,
  DRAW_LABEL,
  drawEdition,
  drawTestEdition,
  isPlayed,
  isReady,
  LIB_ROUNDS,
  redrawOne,
  ROUND_LABEL,
  type DrawKey,
  type DrawnSongs,
  type DrawShortage,
  type EditionRecord,
  type ScanResult,
  type Songs,
} from '../../lib/library/library'
import type { StationNames } from '../../lib/stations'

interface Props {
  scan: ScanResult<File> | null
  onFolder: (files: FileList) => ScanResult<File>
  songs: Songs | undefined
  editions: Record<string, EditionRecord> | undefined
  currentId: string | null | undefined
  game: GameState
  names: StationNames
  edition: LoadedEdition | null
}

type Confirm = 'round' | 'edition' | 'cancel' | null

/** Folder z muzyką, losowanie nowej edycji, „Zakończ rundę” i „Zakończ edycję”. */
export function EditionCard({ scan, onFolder, songs, editions, currentId, game, names, edition }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<{ utwory: DrawnSongs; braki: DrawShortage[]; test: boolean } | null>(null)
  const [nazwa, setNazwa] = useState('')
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [showSongs, setShowSongs] = useState(false)

  useEffect(() => {
    inputRef.current?.setAttribute('webkitdirectory', '')
    inputRef.current?.setAttribute('directory', '')
  }, [])

  const current = currentId && editions ? editions[currentId] : undefined
  const nextNumber = Math.max(0, ...Object.values(editions ?? {}).map((e) => e.numer ?? 0)) + 1

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      console.error(e)
      setError('Nie udało się zapisać — sprawdź połączenie.')
    } finally {
      setBusy(false)
    }
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const s = onFolder(files)
    e.target.value = ''
    if (s.songs.size === 0) {
      setError('W tym folderze nie ma podfolderów RUNDA 1, RUNDA 2, RUNDA 3, FINAŁ z plikami.')
      return
    }
    setInfo(null)
  }

  const stats = LIB_ROUNDS.map((r) => {
    const list = Object.values(songs ?? {}).filter((s) => s.runda === r && !s.brak)
    return {
      r,
      gotowe: list.filter((s) => isReady(s) && !isPlayed(s)).length,
      doUzupelnienia: list.filter((s) => !isReady(s) && !isPlayed(s)).length,
      zagrane: list.filter(isPlayed).length,
    }
  })

  const startDraw = (test = false) => {
    if (!songs) return
    setDraft({ ...(test ? drawTestEdition(songs) : drawEdition(songs)), test })
    setNazwa(test ? 'Edycja testowa' : `Edycja ${nextNumber}`)
  }

  const redraw = (key: DrawKey, i: number) => {
    if (!songs || !draft) return
    const id = redrawOne(songs, draft.utwory, key, i)
    if (!id) return setError('Nie ma już innych gotowych utworów do tej rundy.')
    const utwory = { ...draft.utwory, [key]: draft.utwory[key].map((x, j) => (j === i ? id : x)) }
    setDraft({ ...draft, utwory })
  }

  const confirmDraft = () =>
    run(async () => {
      if (!draft) return
      if (draft.test) await createEdition(nazwa.trim() || 'Edycja testowa', 0, draft.utwory, true)
      else await createEdition(nazwa.trim() || `Edycja ${nextNumber}`, nextNumber, draft.utwory)
      setDraft(null)
    })

  const klasy = { '1': names[1], '2': names[2], '3': names[3] } as Record<StationKey, string>

  return (
    <section className="card card--wide edition-card">
      <div className="card__head">
        <div>
          <h2 className="card__title">Edycja{current ? ` · ${current.nazwa}` : ''}</h2>
          <p className="muted">
            {scan
              ? `Folder z muzyką wczytany: ${scan.songs.size} utworów${scan.intro ? ', czołówka jest' : ', bez czołówki'}.`
              : 'Wybierz folder z muzyką (podfoldery RUNDA 1, RUNDA 2, RUNDA 3, FINAŁ).'}
          </p>
        </div>
        <div className="card__actions">
          <button type="button" className={`btn ${scan ? 'btn--ghost' : 'btn--primary'}`} onClick={() => inputRef.current?.click()} disabled={busy}>
            {scan ? 'Wczytaj folder ponownie' : 'Wybierz folder z muzyką'}
          </button>
          <input ref={inputRef} type="file" multiple hidden onChange={onChange} />
        </div>
      </div>

      {songs && (
        <div className="lib-stats">
          {stats.map((s) => (
            <div key={s.r} className="lib-stat">
              <span className="lib-stat__label">{ROUND_LABEL[s.r]}</span>
              <strong>{s.gotowe}</strong> <span className="muted small">gotowych</span>
              {s.doUzupelnienia > 0 && <span className="muted small"> · {s.doUzupelnienia} do uzupełnienia</span>}
              {s.zagrane > 0 && <span className="muted small"> · {s.zagrane} zagranych</span>}
            </div>
          ))}
        </div>
      )}

      {current && currentId ? (
        <>
          <div className="edition-card__row">
            <p className="notice">
              Trwa <strong>{current.nazwa}</strong>
              {current.test && ' (testowa — nie liczy się do rankingu)'}
              {game.runda ? ` · runda ${game.runda === 4 ? 'finałowa' : game.runda}` : ' · gra jeszcze nie ruszyła'}.
              {!scan && ' Wybierz folder z muzyką, żeby grać.'}
            </p>
            <div className="card__actions">
              {confirm === null && (
                <>
                  {canEndRound(game) && (
                    <button type="button" className="btn btn--ghost" onClick={() => setConfirm('round')} disabled={busy}>
                      Zakończ rundę
                    </button>
                  )}
                  <button type="button" className="btn btn--primary" onClick={() => setConfirm('edition')} disabled={busy}>
                    Zakończ edycję
                  </button>
                  {!game.runda && (
                    <button type="button" className="btn btn--ghost" onClick={() => setConfirm('cancel')} disabled={busy}>
                      Porzuć losowanie
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {confirm && (
            <div className="confirm-box">
              <p>
                {confirm === 'round' &&
                  'Zakończyć bieżącą rundę? Niezagrane hasła zostaną pominięte (utwory wrócą do puli), muzyka stanie. Potem przejdziesz do kolejnej rundy jak zwykle.'}
                {confirm === 'edition' &&
                  (current.test
                    ? 'Zakończyć edycję testową? Gra wyzeruje się. Do rankingu nic nie trafi, a utwory nie zostaną oznaczone jako zagrane.'
                    : 'Zakończyć edycję? Wyniki klas trafią do rankingu, zagrane utwory zostaną oznaczone w bazie, a gra wyzeruje się na kolejną edycję.')}
                {confirm === 'cancel' && 'Porzucić wylosowaną edycję? Utwory wrócą do puli, nic nie trafi do rankingu.'}
              </p>
              <div className="card__actions">
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (confirm === 'round') await endRound(game, edition?.set)
                      if (confirm === 'edition') await finishEdition(currentId, current, game, klasy)
                      if (confirm === 'cancel') await cancelEdition(currentId)
                      setConfirm(null)
                    })
                  }
                >
                  {confirm === 'round' ? 'Tak, kończę rundę' : confirm === 'edition' ? 'Tak, kończę edycję' : 'Tak, porzuć'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setConfirm(null)}>
                  Nie
                </button>
              </div>
            </div>
          )}

          {edition && edition.missing.length > 0 && (
            <p className="error">Brakuje plików w folderze: {edition.missing.join(', ')}</p>
          )}

          <button type="button" className="link-button" onClick={() => setShowSongs((v) => !v)}>
            {showSongs ? 'Ukryj wylosowane utwory' : 'Pokaż wylosowane utwory (odpowiedzi!)'}
          </button>
          {showSongs && songs && <DrawList utwory={current.utwory} songs={songs} />}
        </>
      ) : draft && songs ? (
        <div className="draw">
          <label className="field">
            <span className="field__label">Nazwa edycji</span>
            <input className="field__input" value={nazwa} onChange={(e) => setNazwa(e.target.value)} maxLength={40} />
          </label>
          {draft.test && (
            <p className="notice">
              Edycja testowa: losuje spośród wszystkich utworów z plikiem (także zagranych i bez ustawionego startu — wtedy
              gra od początku). Przy małej bazie bierze utwory z innych rund i powtarza je. Nie trafia do rankingu i nie
              oznacza utworów jako zagranych.
            </p>
          )}
          {draft.braki.length > 0 && (
            <p className="error">
              {draft.test ? 'Brak plików w folderze:' : 'Za mało gotowych utworów:'}{' '}
              {draft.braki.map((b) => `${DRAW_LABEL[b.key]} — jest ${b.jest} z ${b.potrzeba}`).join(', ')}. Uzupełnij start
              (i hasła / anegdoty) w zakładce „Baza utworów”.
            </p>
          )}
          <DrawList utwory={draft.utwory} songs={songs} onRedraw={draft.test ? undefined : redraw} />
          <div className="card__actions">
            <button type="button" className="btn btn--primary btn--big" disabled={busy || draft.braki.length > 0} onClick={confirmDraft}>
              Zatwierdź edycję
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => startDraw(draft.test)}>
              Losuj wszystko od nowa
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setDraft(null)}>
              Anuluj
            </button>
          </div>
        </div>
      ) : (
        <div className="edition-card__row">
          <p className="muted">
            {songs === undefined
              ? 'Wczytywanie bazy utworów…'
              : 'Aplikacja wylosuje utwory gotowe do gry (z ustawionym startem), które nie były jeszcze grane.'}
          </p>
          <div className="card__actions">
            <button type="button" className="btn btn--ghost" onClick={() => startDraw(true)} disabled={!songs || busy}>
              Edycja testowa
            </button>
            <button type="button" className="btn btn--primary" onClick={() => startDraw()} disabled={!songs || busy}>
              Nowa edycja — losuj utwory
            </button>
          </div>
        </div>
      )}

      {info && <p className="muted small">{info}</p>}
      {scan && scan.skipped.length > 0 && (
        <p className="muted small">Pominięte (poza folderami rund): {scan.skipped.slice(0, 5).join(', ')}{scan.skipped.length > 5 ? '…' : ''}</p>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  )
}

function DrawList({
  utwory,
  songs,
  onRedraw,
}: {
  utwory: DrawnSongs
  songs: Songs
  onRedraw?: (key: DrawKey, i: number) => void
}) {
  return (
    <div className="draw-list">
      {DRAW_KEYS.map((key) => (
        <div key={key} className="draw-list__group">
          <h3 className="draw-list__title">
            {DRAW_LABEL[key]} <span className="muted small">({utwory[key].length})</span>
          </h3>
          <ol>
            {utwory[key].map((id, i) => {
              const s = songs[id]
              return (
                <li key={`${id}-${i}`}>
                  <span>
                    {key === 'runda2' || key === 'dogrywka2' ? <em className="draw-list__haslo">{s?.haslo} · </em> : null}
                    {s ? `${s.tytul} — ${s.wykonawca}` : id}
                  </span>
                  {onRedraw && (
                    <button type="button" className="btn btn--tiny" title="Wylosuj inny" onClick={() => onRedraw(key, i)}>
                      ↻
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </div>
  )
}
