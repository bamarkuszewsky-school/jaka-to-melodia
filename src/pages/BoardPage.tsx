import { Shell } from '../components/Shell'
import { useBuzzes } from '../lib/buzzTest'
import { usePresence, usePresenceList } from '../lib/presence'
import { STANOWISKA } from '../lib/roles'
import { useWakeLock } from '../lib/screen'

/** Duży ekran dla widowni (tablica z Androidem). Tylko wyświetla. */
export function BoardPage() {
  usePresence('tablica')
  useWakeLock()
  const buzzes = useBuzzes()
  const online = usePresenceList()

  return (
    <Shell title="Tablica" subtitle="Ekran widowni" hideBarInFullscreen>
      <div className="board">
        <h1 className="board__title">
          Jaka to <span className="accent">melodia?</span>
        </h1>

        <div className="board__stations">
          {STANOWISKA.map((s) => {
            const idx = buzzes.findIndex((b) => b.stanowisko === s)
            const cls = idx === 0 ? 'is-first' : idx > 0 ? 'is-buzzed' : ''
            const isOnline = Boolean(online[`stanowisko${s}`])
            return (
              <div key={s} className={`board-station ${cls}`}>
                <span className="board-station__num">{s}</span>
                <span className="board-station__label">{idx === 0 ? 'Pierwszy!' : isOnline ? 'Gotowy' : 'Czeka na iPada'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Shell>
  )
}
