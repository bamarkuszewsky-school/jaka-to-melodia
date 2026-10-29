import { useEffect } from 'react'
import { useBuzzes } from '../lib/buzzTest'
import { usePresence } from '../lib/presence'

/**
 * Nakładka do OBS / vMix: przezroczyste tło 1920×1080.
 * Na razie pokazuje belkę z logo i kto zgłosił się pierwszy.
 */
export function StreamPage() {
  usePresence('stream')
  const buzzes = useBuzzes()
  const first = buzzes[0]

  useEffect(() => {
    document.documentElement.classList.add('transparent')
    return () => document.documentElement.classList.remove('transparent')
  }, [])

  return (
    <div className="stream">
      <div className="stream__bug">
        Jaka to <span className="accent">melodia?</span>
      </div>
      {first && (
        <div className="stream__lower" key={first.stanowisko}>
          <span className="stream__lower-label">Zgłasza się</span>
          <span className="stream__lower-value">Stanowisko {first.stanowisko}</span>
        </div>
      )}
    </div>
  )
}
