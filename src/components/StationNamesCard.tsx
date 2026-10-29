import { useState, type FormEvent } from 'react'
import { usePresenceList } from '../lib/presence'
import { STANOWISKA, type Stanowisko } from '../lib/roles'
import { MAX_NAZWA, saveStationNames, useStationNames, type StationNames } from '../lib/stations'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** Panel hosta: podpisanie stanowisk 1–3 nazwami klas. Zmiana od razu widać wszędzie. */
export function StationNamesCard() {
  const saved = useStationNames()
  const online = usePresenceList()
  // draft = null → nic nie edytujemy i pola pokazują to, co jest w bazie.
  const [draft, setDraft] = useState<StationNames | null>(null)
  const [state, setState] = useState<SaveState>('idle')
  const values = draft ?? saved
  const dirty = draft !== null

  const onChange = (s: Stanowisko, value: string) => {
    setDraft({ ...values, [s]: value.slice(0, MAX_NAZWA) })
    setState('idle')
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setState('saving')
    try {
      await saveStationNames(values)
      setDraft(null)
      setState('saved')
    } catch {
      setState('error')
    }
  }

  const onClear = () => {
    setDraft({ 1: '', 2: '', 3: '' })
    setState('idle')
  }

  return (
    <form className="card card--wide" onSubmit={onSubmit}>
      <div className="card__head">
        <h2 className="card__title">Klasy na stanowiskach</h2>
        <div className="card__actions">
          <button type="button" className="btn btn--ghost" onClick={onClear}>
            Wyczyść
          </button>
          <button type="submit" className="btn btn--primary" disabled={!dirty || state === 'saving'}>
            {state === 'saving' ? 'Zapisywanie…' : 'Zapisz nazwy'}
          </button>
        </div>
      </div>

      <div className="station-names">
        {STANOWISKA.map((s) => {
          const isOnline = Boolean(online[`stanowisko${s}`])
          return (
            <label key={s} className="station-name">
              <span className="station-name__head">
                <span className="station-name__num">Stanowisko {s}</span>
                <span className={isOnline ? 'station-name__ipad is-online' : 'station-name__ipad'}>
                  {isOnline ? 'iPad online' : 'brak iPada'}
                </span>
              </span>
              <input
                className="field__input"
                value={values[s]}
                onChange={(e) => onChange(s, e.target.value)}
                placeholder="np. 4BT"
                maxLength={MAX_NAZWA}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          )
        })}
      </div>

      <p className="muted station-names__hint" aria-live="polite">
        {state === 'saved' && 'Zapisano — nazwy są już na tablicy, iPadach i streamie.'}
        {state === 'error' && <span className="error">Nie udało się zapisać. Sprawdź połączenie.</span>}
        {state === 'idle' && (dirty ? 'Masz niezapisane zmiany.' : 'Puste pole = „Stanowisko N”.')}
        {state === 'saving' && 'Zapisywanie…'}
      </p>
    </form>
  )
}
