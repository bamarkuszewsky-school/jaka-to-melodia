import { useState, type ReactNode } from 'react'
import { Shell } from '../components/Shell'
import { useMusicianSheet } from '../lib/game/musician'
import { musicianPlayed } from '../lib/game/round3Actions'
import { nut } from '../lib/game/rules3'
import { useGame } from '../lib/game/state'
import { usePresence } from '../lib/presence'
import { useWakeLock } from '../lib/screen'
import { labelForKey, useStationNames } from '../lib/stations'

/** Widok muzyka (tablet przy pianinie): nuty aktualnej zagadki i ile nut zagrać. */
export function MusicianPage() {
  usePresence('muzyk')
  useWakeLock()
  const game = useGame()
  const names = useStationNames()
  const sheet = useMusicianSheet()
  const [sending, setSending] = useState(false)
  const p = game.pytanie3

  const onPlayed = async () => {
    setSending(true)
    try {
      await musicianPlayed()
    } catch {
      /* host może kliknąć „Zagrane” za muzyka */
    } finally {
      setSending(false)
    }
  }

  let status: ReactNode = <p className="muzyk__status">Czekaj na rundę 3.</p>
  if (game.runda === 3 && !p) status = <p className="muzyk__status">Czekaj, aż klasa wybierze numer zagadki.</p>
  if (p?.faza === 'licytacja') {
    status = (
      <p className="muzyk__status">
        Trwa licytacja{p.licytacja.nuty ? ` — na razie ${p.licytacja.nuty} ${nut(p.licytacja.nuty)}` : ''}. Przygotuj się.
      </p>
    )
  }

  return (
    <Shell title="Muzyk" subtitle="Runda 3 — licytacja nut" hideBarInFullscreen>
      <div className="muzyk">
        {p?.faza === 'granie' && p.nuty ? (
          <div className="muzyk__play">
            <p className="muzyk__who">{p.gra ? `Zgaduje ${labelForKey(names, p.gra)}` : ''}</p>
            <p className="muzyk__count">
              Zagraj <strong>{p.nuty}</strong> {nut(p.nuty)}
            </p>
            <button type="button" className="btn btn--primary btn--huge" onClick={onPlayed} disabled={sending || Boolean(game.zagrane)}>
              {game.zagrane ? 'Wysłano…' : '✓ Zagrane'}
            </button>
          </div>
        ) : p?.faza === 'odpowiedz' ? (
          <p className="muzyk__status">Klasa odpowiada…</p>
        ) : p?.faza === 'odslona' ? (
          <p className="muzyk__status">Odsłonięte. Czekaj na następny numer.</p>
        ) : (
          status
        )}

        {sheet && p ? (
          <div className="muzyk__sheet">
            <p className="muzyk__title">
              {sheet.tytul} <span>— {sheet.wykonawca}</span>
            </p>
            {sheet.nuty ? (
              <img src={sheet.nuty} alt={`Nuty: ${sheet.tytul}`} />
            ) : (
              <p className="muted">Do tej zagadki nie ma zrzutu nut.</p>
            )}
          </div>
        ) : null}
      </div>
    </Shell>
  )
}
