import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { SONG_MS } from '../../lib/game/rules'
import { applySongChanges, deleteEdition, setPlayed, updateSong } from '../../lib/library/db'
import {
  DRAW_KEYS,
  DRAW_LABEL,
  exportCsv,
  formatSec,
  importCsv,
  isPlayed,
  LIB_ROUNDS,
  MISSING_LABEL,
  missingFor,
  parseSeconds,
  ROUND_LABEL,
  type EditionRecord,
  type LibRound,
  type ScanResult,
  type SongRecord,
  type Songs,
} from '../../lib/library/library'

interface Props {
  songs: Songs | undefined
  editions: Record<string, EditionRecord> | undefined
  currentId: string | null | undefined
  scan: ScanResult<File> | null
  urlFor: (f: File) => string
}

type Tab = LibRound | 'edycje'
type Filter = 'wszystkie' | 'braki' | 'gotowe' | 'zagrane'

const FILTERS: Record<Filter, string> = {
  wszystkie: 'Wszystkie',
  braki: 'Do uzupełnienia',
  gotowe: 'Gotowe do losowania',
  zagrane: 'Zagrane',
}

/** Zakładka „Baza utworów”: start, refren, hasła, anegdoty, historia i edycje. */
export function SongDatabase({ songs, editions, currentId, scan, urlFor }: Props) {
  const [tab, setTab] = useState<Tab>('1')
  const [filter, setFilter] = useState<Filter>('wszystkie')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null)
  const csvRef = useRef<HTMLInputElement>(null)

  const current = currentId && editions ? editions[currentId] : undefined
  const inCurrent = useMemo(() => new Set(current ? DRAW_KEYS.flatMap((k) => current.utwory[k]) : []), [current])

  if (!songs) return <section className="card card--wide">Wczytywanie bazy…</section>

  const all = Object.entries(songs)
  const q = query.trim().toLowerCase()
  const list =
    tab === 'edycje'
      ? []
      : all
          .filter(([, s]) => s.runda === tab)
          .filter(([, s]) => !q || `${s.tytul} ${s.wykonawca} ${s.haslo ?? ''}`.toLowerCase().includes(q))
          .filter(([, s]) =>
            filter === 'braki'
              ? missingFor(s).length > 0 && !isPlayed(s)
              : filter === 'gotowe'
                ? missingFor(s).length === 0 && !isPlayed(s)
                : filter === 'zagrane'
                  ? isPlayed(s)
                  : true,
          )
          .sort(([, a], [, b]) => a.wykonawca.localeCompare(b.wykonawca, 'pl') || a.tytul.localeCompare(b.tytul, 'pl'))

  const download = () => {
    const blob = new Blob(['﻿' + exportCsv(songs)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `baza-utworow-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportCsv(songs))
      setMsg({ text: 'Skopiowano listę (CSV) — możesz ją wkleić na czat albo do arkusza.' })
    } catch {
      setMsg({ text: 'Przeglądarka nie pozwoliła skopiować — użyj „Pobierz CSV”.', error: true })
    }
  }

  const onCsv = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const res = importCsv(await f.text(), songs)
    try {
      await applySongChanges(res.changes)
      const parts = [`Zaktualizowano ${res.updated} utworów.`]
      if (res.unknown.length) parts.push(`Nieznane id (pominięte): ${res.unknown.length}.`)
      if (res.errors.length) parts.push(`Błędy: ${res.errors.slice(0, 3).join(' ')}`)
      setMsg({ text: parts.join(' '), error: res.errors.length > 0 })
    } catch {
      setMsg({ text: 'Nie udało się zapisać zmian z CSV.', error: true })
    }
  }

  return (
    <section className="card card--wide songdb">
      <div className="card__head">
        <div>
          <h2 className="card__title">Baza utworów</h2>
          <p className="muted">
            Zmiany zapisują się od razu. Do losowania trafiają tylko utwory gotowe (z ustawionym startem) i jeszcze niegrane.
          </p>
        </div>
        <div className="card__actions">
          <button type="button" className="btn btn--ghost" onClick={download}>
            Pobierz CSV
          </button>
          <button type="button" className="btn btn--ghost" onClick={copy}>
            Kopiuj listę
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => csvRef.current?.click()}>
            Wczytaj CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv,.txt,text/csv" hidden onChange={onCsv} />
        </div>
      </div>
      {msg && <p className={msg.error ? 'error' : 'notice'}>{msg.text}</p>}
      {!scan && <p className="muted small">Wybierz folder z muzyką w zakładce „Gra”, żeby odsłuchiwać utwory i ustawiać start.</p>}

      <div className="tabs">
        {LIB_ROUNDS.map((r) => {
          const n = all.filter(([, s]) => s.runda === r).length
          return (
            <button key={r} type="button" className={`tab ${tab === r ? 'is-active' : ''}`} onClick={() => setTab(r)}>
              {ROUND_LABEL[r]} <span className="tab__count">{n}</span>
            </button>
          )
        })}
        <button type="button" className={`tab ${tab === 'edycje' ? 'is-active' : ''}`} onClick={() => setTab('edycje')}>
          Edycje <span className="tab__count">{Object.keys(editions ?? {}).length}</span>
        </button>
      </div>

      {tab === 'edycje' ? (
        <EditionsView editions={editions ?? {}} songs={songs} currentId={currentId ?? null} />
      ) : (
        <>
          <div className="songdb__filters">
            <input
              className="field__input"
              placeholder="Szukaj tytułu, wykonawcy, hasła…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="field__input" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              {(Object.keys(FILTERS) as Filter[]).map((f) => (
                <option key={f} value={f}>
                  {FILTERS[f]}
                </option>
              ))}
            </select>
          </div>
          {list.length === 0 && <p className="muted">Brak utworów{q || filter !== 'wszystkie' ? ' dla tego filtra' : ' — wczytaj folder z muzyką'}.</p>}
          <ul className="songdb__list">
            {list.map(([id, s]) => (
              <li key={id} className={`song-row ${open === id ? 'is-open' : ''}`}>
                <button type="button" className="song-row__head" onClick={() => setOpen(open === id ? null : id)}>
                  <span className="song-row__name">
                    <strong>{s.tytul}</strong> <span className="muted">— {s.wykonawca || 'brak wykonawcy'}</span>
                    {s.runda === '2' && s.haslo && <span className="song-row__haslo">„{s.haslo}”</span>}
                  </span>
                  <SongStatus s={s} reserved={inCurrent.has(id)} />
                </button>
                {open === id && <SongEditor id={id} s={s} scan={scan} urlFor={urlFor} />}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function SongStatus({ s, reserved }: { s: SongRecord; reserved: boolean }) {
  const miss = missingFor(s)
  return (
    <span className="song-row__status">
      {s.brak && <span className="chip chip--danger">brak pliku</span>}
      {reserved && <span className="chip chip--gold">bieżąca edycja</span>}
      {isPlayed(s) ? (
        <span className="chip">zagrany: {Object.values(s.historia ?? {}).map((h) => h.nazwa).join(', ')}</span>
      ) : miss.length === 0 ? (
        <span className="chip chip--ok">gotowy</span>
      ) : (
        <span className="chip chip--muted">brak: {miss.map((m) => MISSING_LABEL[m]).join(', ')}</span>
      )}
    </span>
  )
}

// ---------- Edycja jednego utworu ----------

function SongEditor({ id, s, scan, urlFor }: { id: string; s: SongRecord; scan: ScanResult<File> | null; urlFor: (f: File) => string }) {
  const scanned = scan?.songs.get(id)
  const audioUrl = scanned?.audio ? urlFor(scanned.audio) : undefined
  const nutyUrl = scanned?.nuty ? urlFor(scanned.nuty) : undefined
  const audioRef = useRef<HTMLAudioElement>(null)
  const stopAt = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const limited = s.runda === '1' || s.runda === '2'

  // Podgląd fragmentu: w rundach 1–2 maksymalnie 15 s, jak w grze.
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => {
      if (stopAt.current !== null && a.currentTime >= stopAt.current) {
        a.pause()
        stopAt.current = null
      }
    }
    a.addEventListener('timeupdate', onTime)
    return () => a.removeEventListener('timeupdate', onTime)
  }, [audioUrl])

  const save = async (patch: Partial<Record<keyof SongRecord, unknown>>) => {
    setError(null)
    try {
      await updateSong(id, patch)
    } catch {
      setError('Nie udało się zapisać — sprawdź połączenie.')
    }
  }

  const playFrom = (sec: number | undefined, limit?: number) => {
    const a = audioRef.current
    if (!a || sec === undefined) return
    a.currentTime = sec
    stopAt.current = limit ? sec + limit : null
    a.play().catch(() => {})
  }

  const now = () => Math.round((audioRef.current?.currentTime ?? 0) * 10) / 10

  return (
    <div className="song-editor">
      <div className="song-editor__grid">
        <TextField label="Tytuł" value={s.tytul} onSave={(v) => v && save({ tytul: v })} />
        <TextField label="Wykonawca" value={s.wykonawca} onSave={(v) => save({ wykonawca: v })} />
      </div>

      {s.runda !== '3' || audioUrl ? (
        <div className="song-editor__audio">
          {audioUrl ? (
            <audio ref={audioRef} src={audioUrl} controls preload="metadata" />
          ) : (
            <p className="muted small">Brak pliku w wczytanym folderze ({s.plik ?? 'nie znaleziono'}).</p>
          )}
          <div className="song-editor__times">
            {s.runda !== '3' && (
            <TimeField
              label="Start fragmentu"
              value={s.start}
              onSave={(v) => save({ start: v ?? null })}
              onNow={audioUrl ? () => save({ start: now() }) : undefined}
              onPlay={audioUrl && s.start !== undefined ? () => playFrom(s.start, limited ? SONG_MS / 1000 : undefined) : undefined}
              playLabel={limited ? '▶ 15 s od startu' : '▶ od startu'}
            />
            )}
            <TimeField
              label="Refren"
              value={s.refren}
              onSave={(v) => save({ refren: v ?? null })}
              onNow={audioUrl ? () => save({ refren: now() }) : undefined}
              onPlay={audioUrl && s.refren !== undefined ? () => playFrom(s.refren) : undefined}
              playLabel="▶ refren"
            />
          </div>
          {limited && <p className="muted small">W rundach 1 i 2 utwór gra maksymalnie 15 s od startu.</p>}
        </div>
      ) : null}

      {s.runda === '2' && (
        <TextField label="Hasło na tablicy" value={s.haslo ?? ''} onSave={(v) => save({ haslo: v || null })} placeholder="np. Włoskie słońce" />
      )}

      {s.runda === '3' && (
        <>
          <TextField
            label="Anegdota (czyta host)"
            value={s.podpowiedz ?? ''}
            onSave={(v) => save({ podpowiedz: v || null })}
            multiline
            placeholder="Ciekawostka o utworze albo wykonawcy"
          />
          {nutyUrl ? (
            <img className="song-editor__nuty" src={nutyUrl} alt="Nuty" />
          ) : (
            <p className="muted small">Brak nut — dodaj do folderu RUNDA 3 plik PNG o tej samej nazwie co utwór.</p>
          )}
        </>
      )}

      <div className="song-editor__history">
        <strong>Historia:</strong>{' '}
        {s.historia && Object.keys(s.historia).length > 0 ? (
          <ul>
            {Object.entries(s.historia).map(([k, h]) => (
              <li key={k}>
                {h.nazwa} · {h.odgadniety ? `odgadnięty${h.klasa ? ` (${h.klasa})` : ''}` : 'nieodgadnięty'}
                {h.data ? ` · ${new Date(h.data).toLocaleDateString('pl-PL')}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <span className="muted">jeszcze nie grany</span>
        )}
        <div className="card__actions">
          {isPlayed(s) ? (
            <button type="button" className="btn btn--ghost" onClick={() => setPlayed(id, s, false)}>
              Odznacz z zagranych (wraca do losowania)
            </button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={() => setPlayed(id, s, true)}>
              Oznacz jako zagrany
            </button>
          )}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

function TextField({
  label,
  value,
  onSave,
  multiline,
  placeholder,
}: {
  label: string
  value: string
  onSave: (v: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const v = draft ?? value
  const commit = () => {
    if (draft !== null && draft.trim() !== value) onSave(draft.trim())
    setDraft(null)
  }
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {multiline ? (
        <textarea className="field__input" rows={3} value={v} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />
      ) : (
        <input
          className="field__input"
          value={v}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      )}
    </label>
  )
}

function TimeField({
  label,
  value,
  onSave,
  onNow,
  onPlay,
  playLabel,
}: {
  label: string
  value: number | undefined
  onSave: (v: number | undefined) => void
  onNow?: () => void
  onPlay?: () => void
  playLabel: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [bad, setBad] = useState(false)
  const shown = draft ?? (value === undefined ? '' : formatSec(value))
  const commit = () => {
    if (draft === null) return
    const parsed = parseSeconds(draft)
    if (parsed === null) {
      setBad(true)
      return
    }
    setBad(false)
    if (parsed !== value) onSave(parsed)
    setDraft(null)
  }
  return (
    <div className="time-field">
      <span className="field__label">{label}</span>
      <div className="time-field__row">
        <input
          className={`field__input time-field__input ${bad ? 'is-bad' : ''}`}
          value={shown}
          placeholder="0:00,0"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        {onNow && (
          <button type="button" className="btn btn--tiny btn--primary" onClick={onNow} title="Ustaw na aktualną pozycję odtwarzacza">
            = teraz
          </button>
        )}
        {onPlay && (
          <button type="button" className="btn btn--tiny" onClick={onPlay}>
            {playLabel}
          </button>
        )}
      </div>
    </div>
  )
}

// ---------- Edycje ----------

function EditionsView({ editions, songs, currentId }: { editions: Record<string, EditionRecord>; songs: Songs; currentId: string | null }) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const list = Object.entries(editions).sort(([, a], [, b]) => (b.numer ?? 0) - (a.numer ?? 0))
  if (list.length === 0) return <p className="muted">Nie było jeszcze żadnej edycji.</p>
  return (
    <div className="editions">
      {list.map(([id, e]) => (
        <details key={id} className="edition" open={id === currentId}>
          <summary>
            <strong>{e.nazwa}</strong>{' '}
            <span className="muted small">
              {e.zakonczono
                ? `zakończona ${new Date(e.zakonczono).toLocaleDateString('pl-PL')}`
                : id === currentId
                  ? 'trwa'
                  : 'niezakończona'}
            </span>
            {e.wyniki && (
              <span className="edition__results">
                {Object.values(e.wyniki)
                  .filter(Boolean)
                  .sort((a, b) => a!.miejsce - b!.miejsce)
                  .map((w) => `${w!.miejsce}. ${w!.klasa} (${w!.punkty})`)
                  .join(' · ')}
                {e.mistrz ? ' · MISTRZ EDYCJI (7/7)' : ''}
              </span>
            )}
          </summary>
          <div className="draw-list">
            {DRAW_KEYS.map((key) => (
              <div key={key} className="draw-list__group">
                <h3 className="draw-list__title">{DRAW_LABEL[key]}</h3>
                <ol>
                  {e.utwory[key].map((sid) => {
                    const s = songs[sid]
                    const h = s?.historia?.[id]
                    return (
                      <li key={sid}>
                        <span>{s ? `${s.tytul} — ${s.wykonawca}` : sid}</span>
                        <span className={`chip ${h ? (h.odgadniety ? 'chip--ok' : 'chip--danger') : 'chip--muted'}`}>
                          {h ? (h.odgadniety ? `odgadnięty${h.klasa ? ` · ${h.klasa}` : ''}` : 'nieodgadnięty') : 'nie zagrany'}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </div>
            ))}
          </div>
          {id !== currentId &&
            (confirm === id ? (
              <div className="card__actions">
                <span className="muted small">Usunąć edycję z rankingu i z historii utworów?</span>
                <button type="button" className="btn btn--danger" onClick={() => deleteEdition(id, songs).then(() => setConfirm(null))}>
                  Tak, usuń
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setConfirm(null)}>
                  Nie
                </button>
              </div>
            ) : (
              <button type="button" className="link-button" onClick={() => setConfirm(id)}>
                Usuń edycję (np. testową)
              </button>
            ))}
        </details>
      ))}
    </div>
  )
}
