import { Round1Board } from '../components/board/Round1Board'
import { Shell } from '../components/Shell'
import { useBuzzes } from '../lib/buzzTest'
import { useGame } from '../lib/game/state'
import { usePresence, usePresenceList } from '../lib/presence'
import { STANOWISKA } from '../lib/roles'
import { useWakeLock } from '../lib/screen'
import { hasClassName, useStationNames } from '../lib/stations'

/** Duży ekran dla widowni (tablica z Androidem). Tylko wyświetla. */
export function BoardPage() {
  usePresence('tablica')
  useWakeLock()
  const buzzes = useBuzzes()
  const online = usePresenceList()
  const names = useStationNames()
  const game = useGame()

  // Trwa runda 1 → plansza gry. Inaczej ekran oczekiwania z klasami (i test przycisków).
  if (game.runda === 1 && game.runda1) {
    return (
      <Shell title="Tablica" subtitle="Ekran widowni" hideBarInFullscreen>
        <Round1Board game={game} names={names} />
      </Shell>
    )
  }

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
                {/* Nazwa klasy zamiast numeru; numer tylko, gdy host jeszcze nie wpisał nazwy */}
                <span className={`board-station__num ${names[s].trim().length > 4 ? 'is-long' : ''}`}>
                  {hasClassName(names, s) ? names[s] : s}
                </span>
                <span className="board-station__label">{idx === 0 ? 'Pierwszy!' : isOnline ? 'Gotowy' : 'Czeka na iPada'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Shell>
  )
}
