import { describe, expect, it } from 'vitest'
import { editionSteps, stageStatus } from './progress'
import type { GameState } from './types'

const label = (k: string) => ({ '1': '4BT', '2': '2AT', '3': '4B LO' })[k] ?? k

describe('postęp edycji dla koordynatora', () => {
  it('pokazuje rozegrane rundy i ile haseł zostało', () => {
    const game: GameState = {
      punkty: { '1': 300, '2': 120, '3': 0 },
      runda: 2,
      runda1: { hasla: Array.from({ length: 5 }, () => ({ haslo: 'x', stan: 'odgadniete' as const })), wybiera: '1' },
      runda2: { hasla: [{ haslo: 'a', stan: 'odgadniete' }, { haslo: 'b', stan: 'ukryte' }], wybiera: '3' },
      pytanie: { runda: 2, haslo: 1, faza: 'odpowiedz', odpowiada: '2' },
    }
    expect(editionSteps(game).map((s) => [s.stan, s.opis])).toEqual([
      ['koniec', '5/5 haseł'],
      ['trwa', '1/2 haseł'],
      ['czeka', undefined],
      ['czeka', undefined],
    ])
    expect(stageStatus(game, label, false)).toBe('Runda 2 — odpowiada 2AT')
  })

  it('poza grą i w finale', () => {
    expect(stageStatus({ punkty: { '1': 0, '2': 0, '3': 0 } }, label, false)).toMatch(/czekamy/)
    const fin: GameState = {
      punkty: { '1': 0, '2': 0, '3': 0 },
      runda: 4,
      runda4: { gracz: '1', utwory: [{ stan: 'odgadnieta' }], biezacy: 0, faza: 'koniec', czasZostal: 0, zdobyte: 250 },
    }
    expect(editionSteps(fin)[3]).toMatchObject({ stan: 'koniec', opis: '1/7 melodii' })
    expect(stageStatus(fin, label, false)).toBe('Finał zakończony — 4BT')
  })
})
