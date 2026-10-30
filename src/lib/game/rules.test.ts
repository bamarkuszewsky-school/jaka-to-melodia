import { describe, expect, it } from 'vitest'
import { elapsedOf, elimination, lowestStation, remaining, round1Value, round2Value, secondsLeft } from './rules'

describe('round1Value', () => {
  it('zaczyna od 100 pkt', () => {
    expect(round1Value(0)).toBe(100)
  })

  it('rośnie co 10 pkt w ciągu 15 s', () => {
    expect(round1Value(1_499)).toBe(100)
    expect(round1Value(1_500)).toBe(110)
    expect(round1Value(7_500)).toBe(150)
    expect(round1Value(14_999)).toBe(190)
  })

  it('kończy na 200 pkt i nie rośnie dalej', () => {
    expect(round1Value(15_000)).toBe(200)
    expect(round1Value(60_000)).toBe(200)
  })

  it('ujemny czas (rozjazd zegarów) traktuje jak start', () => {
    expect(round1Value(-300)).toBe(100)
  })
})

describe('odliczanie', () => {
  it('liczy pozostały czas i nie schodzi poniżej zera', () => {
    expect(remaining(10_000, 1_000, 4_000)).toBe(7_000)
    expect(remaining(10_000, 1_000, 99_000)).toBe(0)
    expect(remaining(10_000, undefined, 4_000)).toBe(10_000)
  })

  it('pokazuje pełne sekundy', () => {
    expect(secondsLeft(10_000)).toBe(10)
    expect(secondsLeft(9_001)).toBe(10)
    expect(secondsLeft(9_000)).toBe(9)
    expect(secondsLeft(0)).toBe(0)
  })
})

describe('runda 2', () => {
  it('wartość maleje 200 → 100 co 10 pkt', () => {
    expect(round2Value(0)).toBe(200)
    expect(round2Value(1_499)).toBe(200)
    expect(round2Value(1_500)).toBe(190)
    expect(round2Value(7_500)).toBe(150)
    expect(round2Value(15_000)).toBe(100)
    expect(round2Value(99_000)).toBe(100)
  })

  it('wznowienie po złej odpowiedzi liczy czas łącznie', () => {
    // zagrało 6 s, przerwa na odpowiedź, wznowienie 2 s temu
    expect(elapsedOf({ przesuniecie: 6_000, start: 10_000 }, 12_000)).toBe(8_000)
    expect(round2Value(elapsedOf({ przesuniecie: 6_000, start: 10_000 }, 12_000))).toBe(150)
  })

  it('zaczyna stanowisko z najmniejszą liczbą punktów', () => {
    expect(lowestStation({ '1': 300, '2': 140, '3': 270 })).toBe('2')
    expect(lowestStation({ '1': 300, '2': 140, '3': 140 })).toBe('2')
  })
})

describe('eliminacja po rundzie 2', () => {
  it('odpada stanowisko z najmniejszą liczbą punktów', () => {
    expect(elimination({ '1': 500, '2': 300, '3': 420 })).toEqual({
      status: 'decided',
      odpada: '2',
      awans: ['1', '3'],
    })
  })

  it('remis na dole = dogrywka, kategorię wybiera bezpieczny gracz', () => {
    expect(elimination({ '1': 300, '2': 500, '3': 300 })).toEqual({
      status: 'dogrywka',
      contenders: ['1', '3'],
      safe: ['2'],
      chooser: '2',
    })
  })

  it('zwycięzca dogrywki przechodzi, przegrany odpada', () => {
    expect(elimination({ '1': 300, '2': 500, '3': 300 }, { '3': true })).toMatchObject({
      status: 'decided',
      odpada: '1',
    })
  })

  it('remis na górze nie wymaga dogrywki', () => {
    expect(elimination({ '1': 400, '2': 400, '3': 100 })).toMatchObject({ status: 'decided', odpada: '3' })
  })

  it('remis wszystkich trzech = dwie dogrywki', () => {
    const first = elimination({ '1': 200, '2': 200, '3': 200 })
    expect(first).toMatchObject({ status: 'dogrywka', contenders: ['1', '2', '3'], chooser: undefined })
    const second = elimination({ '1': 200, '2': 200, '3': 200 }, { '2': true })
    expect(second).toMatchObject({ status: 'dogrywka', contenders: ['1', '3'], chooser: '2' })
    expect(elimination({ '1': 200, '2': 200, '3': 200 }, { '2': true, '3': true })).toMatchObject({
      status: 'decided',
      odpada: '1',
    })
  })
})
