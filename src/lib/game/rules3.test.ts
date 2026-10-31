import { describe, expect, it } from 'vitest'
import { allowedBids, applyBid, canPass, firstChooser } from './rules3'
import type { StationKey } from './types'

const gracze: [StationKey, StationKey] = ['1', '3']

describe('runda 3 — kto zaczyna', () => {
  it('wybiera klasa z większą liczbą punktów', () => {
    expect(firstChooser({ '1': 300, '2': 0, '3': 450 }, gracze)).toBe('3')
  })
  it('przy remisie — niższy numer stanowiska', () => {
    expect(firstChooser({ '1': 300, '2': 0, '3': 300 }, gracze)).toBe('1')
  })
})

describe('licytacja nut', () => {
  it('pierwsza oferta: od 7 do 1, bez pasowania', () => {
    const l = { kolej: '3' as const }
    expect(allowedBids(l)).toEqual([7, 6, 5, 4, 3, 2, 1])
    expect(canPass(l)).toBe(false)
    expect(applyBid(l, { stanowisko: '3', pas: true }, gracze).status).toBe('invalid')
  })

  it('przebicie musi być niższe', () => {
    const l = { kolej: '1' as const, nuty: 4, prowadzi: '3' as const }
    expect(allowedBids(l)).toEqual([3, 2, 1])
    expect(applyBid(l, { stanowisko: '1', nuty: 4 }, gracze).status).toBe('invalid')
    expect(applyBid(l, { stanowisko: '1', nuty: 3 }, gracze)).toEqual({
      status: 'continue',
      licytacja: { kolej: '3', nuty: 3, prowadzi: '1' },
    })
  })

  it('pas — gra ten, kto złożył ostatnią ofertę', () => {
    const l = { kolej: '1' as const, nuty: 4, prowadzi: '3' as const }
    expect(applyBid(l, { stanowisko: '1', pas: true }, gracze)).toMatchObject({ status: 'done', gra: '3', nuty: 4 })
  })

  it('zejście do 1 nuty kończy licytację', () => {
    const l = { kolej: '1' as const, nuty: 3, prowadzi: '3' as const }
    expect(applyBid(l, { stanowisko: '1', nuty: 1 }, gracze)).toMatchObject({ status: 'done', gra: '1', nuty: 1 })
  })

  it('nie można licytować poza kolejką', () => {
    const l = { kolej: '1' as const, nuty: 3, prowadzi: '3' as const }
    expect(applyBid(l, { stanowisko: '3', nuty: 2 }, gracze).status).toBe('invalid')
  })
})
