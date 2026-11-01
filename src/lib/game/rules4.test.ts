import { describe, expect, it } from 'vitest'
import { clockLeft, formatClock, nextSong } from './rules4'
import type { FinalSong, FinalSongState } from './types'

const songs = (...states: FinalSongState[]): FinalSong[] => states.map((stan) => ({ stan }))

describe('zegar finału', () => {
  it('liczy w dół tylko w fazie „gra”', () => {
    expect(clockLeft({ faza: 'gra', czasZostal: 30_000, start: 1_000 }, 5_000)).toBe(26_000)
    expect(clockLeft({ faza: 'stop', czasZostal: 26_000, start: 1_000 }, 99_000)).toBe(26_000)
    expect(clockLeft({ faza: 'gra', czasZostal: 2_000, start: 0 }, 10_000)).toBe(0)
  })

  it('pokazuje sekundy z dziesiątymi', () => {
    expect(formatClock(30_000)).toBe('30,0')
    expect(formatClock(29_401)).toBe('29,5')
    expect(formatClock(0)).toBe('0,0')
  })
})

describe('kolejność melodii', () => {
  it('najpierw kolejne niegrane', () => {
    expect(nextSong(songs('odgadnieta', 'czeka', 'czeka', 'czeka', 'czeka', 'czeka', 'czeka'), 0)).toBe(1)
    expect(nextSong(songs('odgadnieta', 'pominieta', 'czeka', 'czeka', 'czeka', 'czeka', 'czeka'), 1)).toBe(2)
  })

  it('po siódmej wraca do pominiętych', () => {
    const s = songs('odgadnieta', 'pominieta', 'odgadnieta', 'pominieta', 'odgadnieta', 'odgadnieta', 'odgadnieta')
    expect(nextSong(s, 6)).toBe(1)
    expect(nextSong(s, 1)).toBe(3)
  })

  it('niegrane mają pierwszeństwo przed pominiętymi', () => {
    const s = songs('pominieta', 'odgadnieta', 'czeka', 'odgadnieta', 'odgadnieta', 'odgadnieta', 'odgadnieta')
    expect(nextSong(s, 1)).toBe(2)
  })

  it('wszystko odgadnięte = koniec', () => {
    expect(nextSong(songs('odgadnieta', 'odgadnieta', 'odgadnieta'), 2)).toBeUndefined()
  })

  it('ostatnia pominięta wraca sama do siebie', () => {
    expect(nextSong(songs('odgadnieta', 'pominieta', 'odgadnieta'), 1)).toBe(1)
  })
})
