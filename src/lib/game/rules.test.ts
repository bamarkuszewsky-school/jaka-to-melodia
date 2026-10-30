import { describe, expect, it } from 'vitest'
import { remaining, round1Value, secondsLeft } from './rules'

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
