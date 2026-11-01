import { useState } from 'react'
import { assignDevice, releaseAllDevices, releaseDevice, useDevices, type Device } from '../../lib/devices'
import { STANOWISKA, type Stanowisko } from '../../lib/roles'
import { MAX_NAZWA, saveStationNames, stationLabel, useStationNames } from '../../lib/stations'

/**
 * Przypisywanie iPadów do stanowisk: zawodnik wciska „Jestem przy stanowisku”,
 * host widzi zgłoszenie (w kolejności) i nadaje mu stanowisko oraz klasę.
 */
export function DevicesCard() {
  const devices = useDevices()
  const names = useStationNames()
  const [error, setError] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)

  const entries = Object.entries(devices)
  const pending = entries
    .filter(([, d]) => !d.stanowisko && d.zgloszenie)
    .sort(([, a], [, b]) => (a.zgloszenie ?? 0) - (b.zgloszenie ?? 0))
  const byStation = (s: Stanowisko) => entries.find(([, d]) => d.stanowisko === s)
  const free = STANOWISKA.filter((s) => !byStation(s))

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      console.error(e)
      setError('Nie udało się zapisać — sprawdź połączenie.')
    }
  }

  return (
    <section className="card card--wide">
      <div className="card__head">
        <div>
          <h2 className="card__title">iPady na stanowiskach</h2>
          <p className="muted">
            Zawodnicy po kolei wciskają na iPadzie „Jestem przy stanowisku”. Ty przypisujesz stanowisko i klasę — potem iPad
            nie może sam zmienić stanowiska.
          </p>
        </div>
        <div className="card__actions">
          {confirmAll ? (
            <>
              <span className="muted small">Odpiąć wszystkie iPady?</span>
              <button type="button" className="btn btn--danger" onClick={() => run(releaseAllDevices).then(() => setConfirmAll(false))}>
                Tak
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmAll(false)}>
                Nie
              </button>
            </>
          ) : (
            entries.length > 0 && (
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmAll(true)}>
                Odepnij wszystkie
              </button>
            )
          )}
        </div>
      </div>

      {pending.length > 0 ? (
        <ol className="device-queue">
          {pending.map(([id, d], i) => (
            <PendingRow
              key={id}
              id={id}
              device={d}
              order={i + 1}
              suggested={free[i] ?? free[0] ?? 1}
              onAssign={(s, klasa) =>
                run(async () => {
                  await assignDevice(id, s, devices)
                  if (klasa.trim()) await saveStationNames({ ...names, [s]: klasa })
                })
              }
              onReject={() => run(() => releaseDevice(id))}
            />
          ))}
        </ol>
      ) : (
        <p className="muted small">Brak nowych zgłoszeń.</p>
      )}

      <div className="device-stations">
        {STANOWISKA.map((s) => {
          const found = byStation(s)
          return (
            <div key={s} className={`device-station ${found ? 'is-set' : ''}`}>
              <span className="device-station__num">Stanowisko {s}</span>
              <strong className="device-station__class">{stationLabel(names, s)}</strong>
              {found ? (
                <span className="device-station__ipad">
                  iPad <code>{found[1].kod}</code>
                  <button type="button" className="link-button" onClick={() => run(() => releaseDevice(found[0]))}>
                    odepnij
                  </button>
                </span>
              ) : (
                <span className="device-station__ipad muted">brak iPada</span>
              )}
            </div>
          )
        })}
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  )
}

interface RowProps {
  id: string
  device: Device
  order: number
  suggested: Stanowisko
  onAssign: (s: Stanowisko, klasa: string) => void
  onReject: () => void
}

function PendingRow({ device, order, suggested, onAssign, onReject }: RowProps) {
  const [s, setS] = useState<Stanowisko>(suggested)
  const [klasa, setKlasa] = useState('')
  const time = device.zgloszenie ? new Date(device.zgloszenie).toLocaleTimeString('pl-PL') : ''
  return (
    <li className="device-row">
      <span className="device-row__who">
        <span className="device-row__order">{order}.</span> iPad <code>{device.kod}</code>{' '}
        <span className="muted small">{time}</span>
      </span>
      <select className="field__input device-row__select" value={s} onChange={(e) => setS(Number(e.target.value) as Stanowisko)}>
        {STANOWISKA.map((n) => (
          <option key={n} value={n}>
            Stanowisko {n}
          </option>
        ))}
      </select>
      <input
        className="field__input device-row__class"
        placeholder="Klasa, np. 4BT"
        value={klasa}
        maxLength={MAX_NAZWA}
        onChange={(e) => setKlasa(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onAssign(s, klasa)}
      />
      <button type="button" className="btn btn--primary" onClick={() => onAssign(s, klasa)}>
        Przypisz
      </button>
      <button type="button" className="btn btn--ghost" onClick={onReject} title="Odrzuć zgłoszenie">
        ✕
      </button>
    </li>
  )
}
