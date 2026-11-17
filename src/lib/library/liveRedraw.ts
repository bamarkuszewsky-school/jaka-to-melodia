import type { GameState, StationKey } from '../game/types'
import { redrawOne, type DrawKey, type EditionRecord, type Songs } from './library'

/**
 * Przelosowanie utworu w trakcie gry (np. plik nie chce się odtworzyć).
 * Wolno tylko dla utworów, których jeszcze nikt nie zgadywał.
 */

export type LiveRedraw = { ok: true; id: string; updates: Record<string, unknown> } | { ok: false; reason: string }

/** Czy ten utwór można teraz przelosować (i dlaczego nie). */
export function canRedrawLive(game: GameState, key: DrawKey, index: number): string | undefined {
  if (key === 'runda1' || key === 'runda2' || key === 'dogrywka2') {
    const runda = key === 'runda1' ? 1 : 2
    const r = runda === 1 ? game.runda1 : game.runda2
    const tiles = key === 'dogrywka2' ? r?.dogrywki : r?.hasla
    const tile = tiles?.[index]
    if (!r || !tile) return undefined // runda jeszcze się nie zaczęła — zmieniamy tylko edycję
    if (tile.stan !== 'ukryte') return 'To hasło jest już rozegrane.'
    const p = game.pytanie
    const same = p && p.runda === runda && p.haslo === index && Boolean(p.dogrywka) === (key === 'dogrywka2')
    if (same) {
      if (p.faza === 'odpowiedz' || p.faza === 'odslona') return 'Ktoś właśnie odpowiada — przelosować można przed zgłoszeniem.'
      const poza = p.poza ?? {}
      const blocked = Object.keys(p.zablokowane ?? {}).filter((k) => !poza[k as StationKey])
      if (blocked.length > 0) return 'Ktoś już odpowiadał na ten utwór.'
    }
    return undefined
  }
  if (key === 'runda3') {
    const tile = game.runda3?.hasla[index]
    if (!tile) return undefined
    if (tile.stan !== 'ukryte') return 'Ta zagadka jest już rozegrana.'
    if (game.pytanie3 && game.pytanie3.haslo === index) return 'Ta zagadka jest właśnie w grze.'
    return undefined
  }
  const r4 = game.runda4
  if (!r4) return undefined
  const s = r4.utwory[index]
  if (r4.faza === 'koniec') return 'Finał już się skończył.'
  if (s && s.stan !== 'czeka') return 'Ta melodia już grała.'
  if (r4.faza !== 'gotowe' && index === r4.biezacy) return 'Ta melodia właśnie gra.'
  return undefined
}

/**
 * Losuje nowy utwór na miejsce `index` i przygotowuje jedną wspólną zmianę w bazie:
 * edycja (/baza/edycje) + plansza w grze (/gra) — hasło na tablicy i ewentualnie
 * wybrany kafelek wraca do stanu „wybrane”, żeby host puścił nowy utwór.
 */
export function planLiveRedraw(
  game: GameState,
  editionId: string,
  rec: EditionRecord,
  songs: Songs,
  key: DrawKey,
  index: number,
  rng: () => number = Math.random,
): LiveRedraw {
  const why = canRedrawLive(game, key, index)
  if (why) return { ok: false, reason: why }
  const id = redrawOne(songs, rec.utwory, key, index, rng)
  if (!id) return { ok: false, reason: 'Brak wolnych, gotowych utworów do przelosowania w tej rundzie.' }
  const s = songs[id]
  const updates: Record<string, unknown> = { [`baza/edycje/${editionId}/utwory/${key}/${index}`]: id }

  if (key === 'runda1' || key === 'runda2' || key === 'dogrywka2') {
    const runda = key === 'runda1' ? 1 : 2
    const r = runda === 1 ? game.runda1 : game.runda2
    const list = key === 'dogrywka2' ? 'dogrywki' : 'hasla'
    if ((key === 'dogrywka2' ? r?.dogrywki : r?.hasla)?.[index]) {
      updates[`gra/runda${runda}/${list}/${index}/haslo`] = key === 'runda1' ? s.wykonawca : (s.haslo ?? s.wykonawca)
    }
    const p = game.pytanie
    if (p && p.runda === runda && p.haslo === index && Boolean(p.dogrywka) === (key === 'dogrywka2')) {
      updates['gra/pytanie'] = {
        runda,
        haslo: index,
        faza: 'wybrane',
        ...(p.dogrywka ? { dogrywka: true, poza: p.poza ?? null, zablokowane: p.poza ?? null } : {}),
      }
      updates['gra/zgloszenie'] = null
    }
  }
  return { ok: true, id, updates }
}
