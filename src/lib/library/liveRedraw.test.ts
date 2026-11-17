import { describe, expect, it } from 'vitest'
import type { GameState, Tile } from '../game/types'
import type { EditionRecord, SongRecord, Songs } from './library'
import { canRedrawLive, planLiveRedraw } from './liveRedraw'

const s = (runda: SongRecord['runda'], i: number): [string, SongRecord] => [
  `${runda}-${i}`,
  { runda, tytul: `T${i}`, wykonawca: `W${runda}${i}`, plik: 'x.mp3', start: 5, haslo: runda === '2' ? `H${i}` : undefined },
]
const songs: Songs = Object.fromEntries([...[0, 1, 2].map((i) => s('1', i)), ...[0, 1, 2].map((i) => s('2', i))])
const rec: EditionRecord = {
  nazwa: 'Edycja 1',
  numer: 1,
  utworzono: 1,
  utwory: { runda1: ['1-0', '1-1'], runda2: ['2-0'], dogrywka2: [], runda3: [], final: [] },
}
const hidden = (haslo: string): Tile => ({ haslo, stan: 'ukryte' })
const base: GameState = { punkty: { '1': 0, '2': 0, '3': 0 }, runda: 1, runda1: { hasla: [hidden('W10'), hidden('W11')], wybiera: '1' } }

describe('przelosowanie w trakcie gry', () => {
  it('zmienia utwór w edycji i hasło na tablicy, a wybrane hasło wraca do „wybrane”', () => {
    const game: GameState = { ...base, pytanie: { runda: 1, haslo: 1, faza: 'gra', start: 100 } }
    const plan = planLiveRedraw(game, 'e1', rec, songs, 'runda1', 1, () => 0)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.id).toBe('1-2')
    expect(plan.updates).toEqual({
      'baza/edycje/e1/utwory/runda1/1': '1-2',
      'gra/runda1/hasla/1/haslo': 'W12',
      'gra/pytanie': { runda: 1, haslo: 1, faza: 'wybrane' },
      'gra/zgloszenie': null,
    })
  })

  it('nie pozwala, gdy ktoś już odpowiadał albo hasło jest rozegrane', () => {
    const answering: GameState = { ...base, pytanie: { runda: 1, haslo: 0, faza: 'odpowiedz', odpowiada: '2' } }
    expect(canRedrawLive(answering, 'runda1', 0)).toMatch(/odpowiada/)
    const wrong: GameState = { ...base, pytanie: { runda: 1, haslo: 0, faza: 'gra', zablokowane: { '2': true } } }
    expect(canRedrawLive(wrong, 'runda1', 0)).toMatch(/odpowiadał/)
    const done: GameState = { ...base, runda1: { hasla: [{ haslo: 'x', stan: 'odgadniete' }, hidden('y')], wybiera: '1' } }
    expect(canRedrawLive(done, 'runda1', 0)).toMatch(/rozegrane/)
  })

  it('runda 2 dostaje hasło nowego utworu; brak wolnych utworów = komunikat', () => {
    const game: GameState = { ...base, runda: 2, runda2: { hasla: [hidden('H0')], wybiera: '1' } }
    const plan = planLiveRedraw(game, 'e1', rec, songs, 'runda2', 0, () => 0)
    expect(plan.ok && plan.updates['gra/runda2/hasla/0/haslo']).toBe('H1')
    const full = { ...rec, utwory: { ...rec.utwory, runda2: ['2-0', '2-1', '2-2'] } }
    expect(planLiveRedraw(game, 'e1', full, songs, 'runda2', 0)).toEqual({
      ok: false,
      reason: 'Brak wolnych, gotowych utworów do przelosowania w tej rundzie.',
    })
  })

  it('finał: melodia, która już grała albo gra teraz, zostaje', () => {
    const game: GameState = {
      ...base,
      runda: 4,
      runda4: {
        gracz: '1',
        utwory: [{ stan: 'pominieta' }, { stan: 'czeka' }, { stan: 'czeka' }],
        biezacy: 1,
        faza: 'gra',
        czasZostal: 20000,
        zdobyte: 0,
      },
    }
    expect(canRedrawLive(game, 'final', 0)).toMatch(/grała/)
    expect(canRedrawLive(game, 'final', 1)).toMatch(/gra/)
    expect(canRedrawLive(game, 'final', 2)).toBeUndefined()
  })
})
