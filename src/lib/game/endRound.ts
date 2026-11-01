import { ref, remove, update } from 'firebase/database'
import { db } from '../firebase'
import type { GameState, QuestionSet } from './types'

/**
 * „Zakończ rundę” — host przerywa bieżącą rundę (np. brak czasu).
 * Niezagrane hasła zostają oznaczone jako pominięte; dalsze kroki (eliminacja,
 * przejście do kolejnej rundy) idą jak zwykle.
 */
export async function endRound(game: GameState, set: QuestionSet | undefined): Promise<void> {
  const changes: Record<string, unknown> = {}
  if (game.runda === 1 || game.runda === 2) {
    const r = game.runda === 1 ? game.runda1 : game.runda2
    r?.hasla.forEach((t, i) => {
      if (t.stan === 'ukryte') changes[`runda${game.runda}/hasla/${i}/stan`] = 'pominiete'
    })
    changes.pytanie = null
    changes.zgloszenie = null
  } else if (game.runda === 3 && game.runda3) {
    const r3 = game.runda3
    r3.hasla.forEach((t, i) => {
      if (t.stan === 'ukryte') changes[`runda3/hasla/${i}/stan`] = 'pominiete'
    })
    if (!r3.zwyciezca) {
      const [a, b] = r3.gracze
      const wa = r3.wygrane[a] ?? 0
      const wb = r3.wygrane[b] ?? 0
      const winner = wa !== wb ? (wa > wb ? a : b) : game.punkty[a] >= game.punkty[b] ? a : b
      changes['runda3/zwyciezca'] = winner
    }
    changes.pytanie3 = null
    changes.ruch = null
    changes.zagrane = null
    await remove(ref(db, 'muzyk/biezace'))
  } else if (game.runda === 4 && game.runda4 && game.runda4.faza !== 'koniec') {
    const r = game.runda4
    changes['runda4/faza'] = 'koniec'
    changes['runda4/wynik'] = 'czas'
    changes['runda4/start'] = null
    changes['runda4/odpowiedzStart'] = null
    changes['runda4/utwory'] = r.utwory.map((s, i) => ({
      ...s,
      tytul: set?.final[i]?.tytul ?? s.tytul ?? null,
      wykonawca: set?.final[i]?.wykonawca ?? s.wykonawca ?? null,
    }))
    changes.stop4 = null
  }
  if (Object.keys(changes).length > 0) await update(ref(db, 'gra'), changes)
}

/** Czy jest co kończyć w bieżącej rundzie. */
export function canEndRound(game: GameState): boolean {
  if (game.runda === 1) return Boolean(game.runda1?.hasla.some((t) => t.stan === 'ukryte'))
  if (game.runda === 2) return Boolean(game.runda2?.hasla.some((t) => t.stan === 'ukryte'))
  if (game.runda === 3) return Boolean(game.runda3 && !game.runda3.zwyciezca)
  if (game.runda === 4) return Boolean(game.runda4 && game.runda4.faza !== 'koniec')
  return false
}
