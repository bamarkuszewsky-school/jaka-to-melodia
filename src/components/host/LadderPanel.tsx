import { useMemo, useState } from 'react'
import {
  createSeason,
  endSeason,
  formatDate,
  linkEdition,
  renameSeason,
  saveStage,
  setCurrentSeason,
  setLadderShown,
  startSeason,
  today,
  type Pokaz,
} from '../../lib/library/db'
import { classKey, type EditionRecord } from '../../lib/library/library'
import {
  ALL_STAGES,
  buildNextStage,
  ladderView,
  parseClassList,
  prevStage,
  splitIntoMatches,
  STAGE_LABEL,
  STAGE_SIZE,
  stageComplete,
  stageMatches,
  wildcardSlots,
  type LadderMatch,
  type Match,
  type Season,
  type StageKey,
} from '../../lib/library/season'

interface Props {
  seasons: Record<string, Season> | undefined
  seasonId: string | null | undefined
  editions: Record<string, EditionRecord> | undefined
  currentId: string | null | undefined
  pokaz: Pokaz | undefined
}

function defaultSeasonName(): string {
  const d = new Date()
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1
  return `Sezon ${y}/${y + 1}`
}

/** Zakładka „Drabinka”: sezon (start/koniec z datą), etapy, mecze i pokaz na tablicy / live. */
export function LadderPanel({ seasons, seasonId, editions, currentId, pokaz }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const season = seasonId && seasons ? seasons[seasonId] : undefined

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

  if (seasons === undefined || editions === undefined) return <section className="card card--wide">Wczytywanie sezonu…</section>

  if (!season || !seasonId) {
    return (
      <NewSeason
        busy={busy}
        error={error}
        others={Object.entries(seasons)}
        onCreate={(nazwa, matches, teachers) => run(() => createSeason(nazwa, matches, teachers))}
        onPick={(id) => run(() => setCurrentSeason(id))}
      />
    )
  }

  return (
    <>
      <SeasonHeader
        id={seasonId}
        season={season}
        editions={editions}
        pokaz={pokaz}
        busy={busy}
        run={run}
      />
      {error && <p className="error">{error}</p>}
      {ALL_STAGES.map((k) => (
        <StageCard key={k} etap={k} seasonId={seasonId} season={season} editions={editions} currentId={currentId} busy={busy} run={run} />
      ))}
    </>
  )
}

// ---------- Nowy sezon ----------

function NewSeason({
  busy,
  error,
  others,
  onCreate,
  onPick,
}: {
  busy: boolean
  error: string | null
  others: [string, Season][]
  onCreate: (nazwa: string, matches: Match[], teachers: string[]) => void
  onPick: (id: string) => void
}) {
  const [nazwa, setNazwa] = useState(defaultSeasonName)
  const [text, setText] = useState('')
  const [shuffle, setShuffle] = useState(true)
  const [teachers, setTeachers] = useState(['', '', ''])
  const classes = parseClassList(text)
  const matches = useMemo(() => splitIntoMatches(classes), [classes])

  return (
    <section className="card card--wide ladder-new">
      <h2 className="card__title">Nowy sezon — drabinka</h2>
      <p className="muted">
        Wpisz wszystkie klasy biorące udział. Aplikacja ułoży z nich eliminacje (po 3 klasy na edycję), a kolejne etapy —
        ćwierćfinały (12 klas), półfinały (6) i finał (3) — ułoży sama po każdym etapie: awansują zwycięzcy edycji, wolne
        miejsca dostają klasy z największą liczbą punktów. Wszystko można potem zmienić.
      </p>
      <label className="field">
        <span className="field__label">Nazwa sezonu</span>
        <input className="field__input" value={nazwa} maxLength={40} onChange={(e) => setNazwa(e.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Klasy (jedna w linii albo po przecinku)</span>
        <textarea className="field__input ladder-new__classes" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'1A\n1B LO\n2AT\n…'} />
      </label>
      <label className="check">
        <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} /> Rozlosuj, kto z kim gra w
        eliminacjach (bez zaznaczenia — po kolei z listy)
      </label>
      <div className="field">
        <span className="field__label">Finał nauczycieli — 3 drużyny (można wpisać później)</span>
        <div className="ladder-match__inputs">
          {teachers.map((t, i) => (
            <input
              key={i}
              className="field__input"
              value={t}
              maxLength={20}
              placeholder={`Drużyna ${i + 1}`}
              onChange={(e) => setTeachers(teachers.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
        </div>
      </div>
      <p className="muted small">
        {classes.length === 0
          ? 'Lista jest pusta.'
          : `${classes.length} klas → ${matches.length} edycji eliminacji${
              matches.some((m) => m.klasy.length === 2) ? ` (${matches.filter((m) => m.klasy.length === 2).length} po 2 klasy)` : ''
            }. Do ćwierćfinałów wejdzie 12 klas.`}
      </p>
      <div className="card__actions">
        <button
          type="button"
          className="btn btn--primary btn--big"
          disabled={busy || classes.length < 2 || !nazwa.trim()}
          onClick={() => onCreate(nazwa.trim(), splitIntoMatches(classes, shuffle ? Math.random : undefined), teachers)}
        >
          Utwórz drabinkę
        </button>
      </div>
      {others.length > 0 && (
        <div className="ladder-new__old">
          <span className="muted small">Wcześniejsze sezony:</span>
          {others.map(([id, s]) => (
            <button key={id} type="button" className="btn btn--tiny btn--ghost" onClick={() => onPick(id)}>
              {s.nazwa}
              {s.koniec ? ` (zakończony ${formatDate(s.koniec)})` : ''}
            </button>
          ))}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  )
}

// ---------- Nagłówek sezonu ----------

function SeasonHeader({
  id,
  season,
  editions,
  pokaz,
  busy,
  run,
}: {
  id: string
  season: Season
  editions: Record<string, EditionRecord>
  pokaz: Pokaz | undefined
  busy: boolean
  run: (fn: () => Promise<unknown>) => Promise<void>
}) {
  // null = bez zmian (pokazujemy nazwę z bazy).
  const [edited, setNazwa] = useState<string | null>(null)
  const nazwa = edited ?? season.nazwa
  const [data, setData] = useState(today)
  const [dolicz, setDolicz] = useState(true)
  const [confirm, setConfirm] = useState<'start' | 'koniec' | null>(null)

  // Edycje rozegrane przed założeniem sezonu (bez przypisanego sezonu) — mogą wejść do rankingu tego sezonu.
  const loose = Object.entries(editions).filter(([, e]) => e.zakonczono && !e.test && !e.sezon).map(([eid]) => eid)
  const view = ladderView(season, editions)
  const status = season.koniec
    ? `zakończony ${formatDate(season.koniec)}`
    : season.start
      ? `trwa od ${formatDate(season.start)}`
      : 'jeszcze nie rozpoczęty'

  return (
    <section className="card card--wide">
      <div className="card__head">
        <div>
          <h2 className="card__title">{season.nazwa}</h2>
          <p className="muted">
            Sezon {status}.{view.mistrz && ` Mistrz sezonu: ${view.mistrz}.`}
            {view.mistrzNauczycieli && ` Finał nauczycieli: ${view.mistrzNauczycieli}.`}
          </p>
        </div>
        <div className="card__actions">
          <button
            type="button"
            className={`btn ${pokaz?.drabinkaTablica ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => run(() => setLadderShown('tablica', !pokaz?.drabinkaTablica))}
          >
            {pokaz?.drabinkaTablica ? 'Ukryj drabinkę z tablicy' : 'Pokaż drabinkę na tablicy'}
          </button>
          <button
            type="button"
            className={`btn ${pokaz?.drabinkaStream ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => run(() => setLadderShown('stream', !pokaz?.drabinkaStream))}
          >
            {pokaz?.drabinkaStream ? 'Ukryj drabinkę z live' : 'Pokaż drabinkę na live'}
          </button>
        </div>
      </div>

      <div className="ladder-season">
        <label className="field">
          <span className="field__label">Nazwa sezonu</span>
          <input
            className="field__input"
            value={nazwa}
            maxLength={40}
            onChange={(e) => setNazwa(e.target.value)}
            onBlur={() => {
              if (nazwa.trim() && nazwa !== season.nazwa) run(() => renameSeason(id, nazwa.trim()))
              setNazwa(null)
            }}
          />
        </label>
        {!season.koniec && (
          <label className="field">
            <span className="field__label">Data</span>
            <input className="field__input" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </label>
        )}
        <div className="card__actions">
          {!season.start && (
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => setConfirm('start')}>
              Rozpocznij sezon
            </button>
          )}
          {season.start && !season.koniec && (
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setConfirm('koniec')}>
              Zakończ sezon
            </button>
          )}
          {season.koniec && (
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => run(() => setCurrentSeason(null))}>
              Nowy sezon
            </button>
          )}
        </div>
      </div>

      {confirm && (
        <div className="confirm-box">
          <p>
            {confirm === 'start'
              ? `Rozpocząć ${season.nazwa} z datą ${formatDate(data)}? Tablica i live pokażą planszę „Rozpoczynamy sezon”.`
              : `Zakończyć ${season.nazwa} z datą ${formatDate(data)}? Tablica i live pokażą planszę z mistrzami sezonu.`}
          </p>
          {confirm === 'start' && loose.length > 0 && (
            <label className="check">
              <input type="checkbox" checked={dolicz} onChange={(e) => setDolicz(e.target.checked)} /> Dolicz do rankingu tego
              sezonu {loose.length} {loose.length === 1 ? 'wcześniej rozegraną edycję' : 'wcześniej rozegranych edycji'}
            </label>
          )}
          <div className="card__actions">
            <button
              type="button"
              className="btn btn--danger"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  if (confirm === 'start') await startSeason(id, season, data, dolicz ? loose : [])
                  else await endSeason(id, season, data, editions)
                  setConfirm(null)
                })
              }
            >
              {confirm === 'start' ? 'Tak, rozpoczynam' : 'Tak, kończę sezon'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirm(null)}>
              Nie
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// ---------- Etap ----------

function StageCard({
  etap,
  seasonId,
  season,
  editions,
  currentId,
  busy,
  run,
}: {
  etap: StageKey
  seasonId: string
  season: Season
  editions: Record<string, EditionRecord>
  currentId: string | null | undefined
  busy: boolean
  run: (fn: () => Promise<unknown>) => Promise<void>
}) {
  const saved = stageMatches(season, etap)
  // null = bez niezapisanych zmian (pokazujemy drabinkę z bazy).
  const [edits, setEdits] = useState<Match[] | null>(null)
  const draft = edits ?? saved
  const dirty = edits !== null
  const setDirty = (on: boolean) => !on && setEdits(null)
  const [confirmAuto, setConfirmAuto] = useState(false)

  const view = ladderView(season, editions, currentId).etapy.find((e) => e.etap === etap)
  const prev = prevStage(etap)
  const prevDone = prev ? stageComplete(stageMatches(season, prev), editions) : false
  const auto = prev ? buildNextStage(season, prev, editions) : undefined
  const size = STAGE_SIZE[etap]
  const played = saved.filter((m) => m.edycja && editions[m.edycja]?.zakonczono).length
  const dzikie = wildcardSlots(etap, saved)

  // Rozegrane edycje, których nie podpięto jeszcze pod żaden mecz (np. eliminacje grane przed drabinką).
  const linked = new Set(ALL_STAGES.flatMap((k) => stageMatches(season, k).map((m) => m.edycja).filter(Boolean)))
  const loose = Object.entries(editions)
    .filter(([id, e]) => e.zakonczono && !e.test && !linked.has(id))
    .sort(([, a], [, b]) => a.numer - b.numer)

  const dupes = (() => {
    const seen = new Map<string, number>()
    for (const m of draft) for (const k of m.klasy) if (k.trim()) seen.set(classKey(k), (seen.get(classKey(k)) ?? 0) + 1)
    return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k)
  })()

  const edit = (next: Match[]) => setEdits(next)
  const setClass = (mi: number, ci: number, v: string) =>
    edit(draft.map((m, i) => (i === mi ? { ...m, klasy: [0, 1, 2].map((j) => (j === ci ? v : (m.klasy[j] ?? ''))) } : m)))

  const teachers = etap === 'nauczyciele'
  const sub =
    etap === 'eliminacje'
      ? `${saved.length} edycji · rozegrane ${played}/${saved.length}${dzikie > 0 ? ` · dalej: zwycięzcy + ${dzikie} z rankingu` : ''}`
      : teachers
        ? 'Jedna edycja, osobno od rankingu klas.'
        : saved.length === 0
          ? prevDone
            ? 'Ułoży się samo po zakończeniu poprzedniego etapu.'
            : `${size} klas — ułoży się samo, gdy skończy się ${STAGE_LABEL[prev!].toLowerCase()}.`
          : `${saved.length} ${saved.length === 1 ? 'edycja' : 'edycje'} · rozegrane ${played}/${saved.length}${dzikie > 0 ? ` · dalej: zwycięzcy + ${dzikie} z rankingu` : ''}`

  return (
    <section className={`card card--wide ladder-stage ladder-stage--${etap}`}>
      <div className="card__head">
        <div>
          <h2 className="card__title">{STAGE_LABEL[etap]}</h2>
          <p className="muted">{sub}</p>
        </div>
        <div className="card__actions">
          {prev && auto && !confirmAuto && !saved.some((m) => m.edycja) && (
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setConfirmAuto(true)}>
              Ułóż od nowa według punktów
            </button>
          )}
          {((etap !== 'final' && !teachers) || draft.length === 0) && (
            <button type="button" className="btn btn--ghost" onClick={() => edit([...draft, { klasy: ['', '', ''] }])}>
              + Dodaj edycję
            </button>
          )}
        </div>
      </div>

      {confirmAuto && auto && (
        <div className="confirm-box">
          <p>
            Ułożyć {STAGE_LABEL[etap].toLowerCase()} od nowa z wyników poprzedniego etapu? Obecny układ zostanie zastąpiony:{' '}
            {auto.map((m, i) => `${i + 1}) ${m.klasy.join(', ')}`).join(' · ')}
          </p>
          <div className="card__actions">
            <button
              type="button"
              className="btn btn--danger"
              disabled={busy || saved.some((m) => m.edycja)}
              onClick={() =>
                run(async () => {
                  await saveStage(seasonId, etap, auto)
                  setDirty(false)
                  setConfirmAuto(false)
                })
              }
            >
              Tak, ułóż od nowa
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmAuto(false)}>
              Nie
            </button>
            {saved.some((m) => m.edycja) && <span className="muted small">Część edycji tego etapu już trwa lub jest rozegrana.</span>}
          </div>
        </div>
      )}

      {draft.length > 0 && (
        <ol className="ladder-matches">
          {draft.map((m, i) => (
            <MatchRow
              key={i}
              nr={i + 1}
              match={m}
              live={view?.mecze[i]}
              editions={editions}
              loose={loose}
              onClass={(ci, v) => setClass(i, ci, v)}
              onRemove={() => edit(draft.filter((_, j) => j !== i))}
              onLink={(eid) =>
                run(() =>
                  linkEdition(
                    seasonId,
                    { etap, mecz: i },
                    eid,
                    eid ? (Object.values(editions[eid]?.wyniki ?? {}).map((w) => w?.klasa ?? '') as string[]) : undefined,
                  ),
                )
              }
              canEdit={!m.edycja}
            />
          ))}
        </ol>
      )}

      {dupes.length > 0 && <p className="error">Ta sama klasa jest w etapie kilka razy: {dupes.join(', ')}.</p>}
      {dirty && (
        <div className="card__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await saveStage(
                  seasonId,
                  etap,
                  draft.map((m) => ({ ...m, klasy: m.klasy.map((k) => k.trim()) })),
                )
                setDirty(false)
              })
            }
          >
            Zapisz zmiany
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setDirty(false)}>
            Cofnij
          </button>
        </div>
      )}
    </section>
  )
}

function MatchRow({
  nr,
  match,
  live,
  editions,
  loose,
  onClass,
  onRemove,
  onLink,
  canEdit,
}: {
  nr: number
  match: Match
  live?: LadderMatch
  editions: Record<string, EditionRecord>
  loose: [string, EditionRecord][]
  onClass: (i: number, v: string) => void
  onRemove: () => void
  onLink: (editionId: string | null) => void
  canEdit: boolean
}) {
  const e = match.edycja ? editions[match.edycja] : undefined
  return (
    <li className={`ladder-match is-${live?.stan ?? 'czeka'}`}>
      <span className="ladder-match__nr">{nr}</span>
      {live?.stan === 'koniec' ? (
        <div className="ladder-match__result">
          {live.klasy.map((s) => (
            <span key={s.klasa} className={`ladder-slot is-${s.stan}`}>
              <strong>{s.klasa}</strong> <span className="muted small">{s.punkty} pkt · {s.opis}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="ladder-match__inputs">
          {[0, 1, 2].map((ci) => (
            <input
              key={ci}
              className="field__input"
              value={match.klasy[ci] ?? ''}
              maxLength={20}
              placeholder={ci === 2 ? '(opcjonalnie)' : `Klasa ${ci + 1}`}
              disabled={!canEdit}
              onChange={(ev) => onClass(ci, ev.target.value)}
            />
          ))}
        </div>
      )}
      <div className="ladder-match__side">
        {e ? (
          <span className="muted small">
            {e.nazwa}
            {e.data && ` · ${formatDate(e.data)}`}
            {!e.zakonczono && ' · trwa'}
          </span>
        ) : (
          <>
            {loose.length > 0 && (
              <select className="field__input ladder-match__link" value="" onChange={(ev) => ev.target.value && onLink(ev.target.value)}>
                <option value="">Podepnij rozegraną edycję…</option>
                {loose.map(([id, le]) => (
                  <option key={id} value={id}>
                    {le.nazwa}: {Object.values(le.wyniki ?? {}).map((w) => w?.klasa).join(', ')}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="btn btn--tiny btn--ghost" onClick={onRemove} title="Usuń tę edycję z drabinki">
              ✕
            </button>
          </>
        )}
        {e?.zakonczono && (
          <button type="button" className="btn btn--tiny btn--ghost" onClick={() => onLink(null)} title="Odepnij edycję od meczu">
            Odepnij
          </button>
        )}
      </div>
    </li>
  )
}
