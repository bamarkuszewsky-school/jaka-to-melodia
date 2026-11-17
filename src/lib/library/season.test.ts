import { describe, expect, it } from 'vitest'
import type { EditionRecord } from './library'
import {
  buildNextStage,
  farewells,
  ladderView,
  parseClassList,
  playableMatches,
  qualifiers,
  seedMatches,
  splitIntoMatches,
  stageToAutoFill,
  type Match,
  type Season,
} from './season'

const empty = { runda1: [], runda2: [], dogrywka2: [], runda3: [], final: [] }

/** Zakończona edycja: klasy w kolejności miejsc z punktami. */
function played(numer: number, wyniki: [string, number][]): EditionRecord {
  const keys = ['1', '2', '3'] as const
  return {
    nazwa: `Edycja ${numer}`,
    numer,
    utworzono: numer,
    zakonczono: numer + 1,
    utwory: empty,
    wyniki: Object.fromEntries(wyniki.map(([klasa, punkty], i) => [keys[i], { klasa, punkty, miejsce: i + 1 }])),
  }
}

describe('drabinka sezonu', () => {
  it('wczytuje listę klas bez powtórek i dzieli ją na mecze po 3 (resztę po 2)', () => {
    expect(parseClassList('1A\n1b, 1B\n\n2C ;3D')).toEqual(['1A', '1b', '2C', '3D'])
    expect(splitIntoMatches(['a', 'b', 'c', 'd', 'e', 'f']).map((m) => m.klasy.length)).toEqual([3, 3])
    expect(splitIntoMatches(Array.from({ length: 31 }, (_, i) => `k${i}`)).map((m) => m.klasy.length)).toEqual([
      3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2,
    ])
    expect(splitIntoMatches(Array.from({ length: 30 }, (_, i) => `k${i}`))).toHaveLength(10)
  })

  it('awansują zwycięzcy, a wolne miejsca uzupełniają najlepsze punktowo klasy', () => {
    const editions: Record<string, EditionRecord> = {
      a: played(1, [['A1', 900], ['A2', 800], ['A3', 100]]),
      b: played(2, [['B1', 700], ['B2', 300], ['B3', 200]]),
      c: played(3, [['C1', 1000], ['C2', 750], ['C3', 0]]),
    }
    const matches: Match[] = [{ klasy: [], edycja: 'a' }, { klasy: [], edycja: 'b' }, { klasy: [], edycja: 'c' }]
    const q = qualifiers(matches, editions, 5)
    expect(q.map((x) => [x.klasa, x.dzika])).toEqual([
      ['C1', false],
      ['A1', false],
      ['B1', false],
      ['A2', true],
      ['C2', true],
    ])
  })

  it('rozstawia wężykiem — najlepsze klasy w różnych edycjach', () => {
    const m = seedMatches(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'])
    expect(m.map((x) => x.klasy)).toEqual([
      ['s1', 's8', 's9'],
      ['s2', 's7', 's10'],
      ['s3', 's6', 's11'],
      ['s4', 's5', 's12'],
    ])
  })

  it('po eliminacjach (30 klas) układa ćwierćfinały: 12 klas w 4 edycjach', () => {
    const editions: Record<string, EditionRecord> = {}
    const elim: Match[] = []
    for (let i = 0; i < 10; i++) {
      editions[`e${i}`] = played(i + 1, [
        [`W${i}`, 1000 + i],
        [`S${i}`, 500 + i * 10],
        [`T${i}`, 100],
      ])
      elim.push({ klasy: [`W${i}`, `S${i}`, `T${i}`], edycja: `e${i}` })
    }
    const season: Season = { nazwa: 'Sezon', etapy: { eliminacje: elim } }
    expect(stageToAutoFill(season, editions)).toBe('eliminacje')
    const cw = buildNextStage(season, 'eliminacje', editions)!
    expect(cw).toHaveLength(4)
    expect(cw.flatMap((m) => m.klasy)).toHaveLength(12)
    // dwie „dzikie karty”: najlepsi z drugich miejsc
    expect(cw.flatMap((m) => m.klasy)).toEqual(expect.arrayContaining(['S9', 'S8']))
    expect(cw[0].klasy[0]).toBe('W9')

    const view = ladderView({ ...season, etapy: { eliminacje: elim, cwierc: cw } }, editions)
    const e0 = view.etapy[0].mecze[9].klasy
    expect(e0.map((s) => s.stan)).toEqual(['awans', 'dzika', 'odpada'])
    expect(e0[2].opis).toBe('odpada w rundzie 2')
    expect(view.etapy[0].dzikie).toBe(2)
  })

  it('w trakcie etapu przegrani czekają na ranking; mecze do zagrania idą po kolei', () => {
    const editions = { a: played(1, [['A1', 900], ['A2', 800], ['A3', 100]]) }
    const season: Season = {
      nazwa: 'S',
      etapy: { eliminacje: [{ klasy: ['A1', 'A2', 'A3'], edycja: 'a' }, { klasy: ['B1', 'B2', 'B3'] }, { klasy: ['', '', ''] }] },
    }
    const v = ladderView(season, editions)
    expect(v.etapy[0].mecze[0].klasy.map((s) => s.stan)).toEqual(['awans', 'niepewny', 'niepewny'])
    expect(v.etapy[0].mecze[1].stan).toBe('czeka')
    expect(playableMatches(season)).toEqual([{ etap: 'eliminacje', mecz: 1, klasy: ['B1', 'B2', 'B3'] }])
  })

  it('widok drabinki nie ma pól undefined (Firebase odrzuciłby zapis)', () => {
    const editions = { a: played(1, [['A1', 900], ['A2', 800], ['A3', 100]]) }
    const season: Season = {
      nazwa: 'S',
      etapy: { eliminacje: [{ klasy: ['A1', 'A2', 'A3'], edycja: 'a' }, { klasy: ['B1', 'B2', 'B3'] }], nauczyciele: [{ klasy: ['', '', ''] }] },
    }
    const hasUndefined = (v: unknown): boolean =>
      v === undefined || (typeof v === 'object' && v !== null && Object.values(v).some(hasUndefined))
    expect(hasUndefined(ladderView(season, editions, 'x'))).toBe(false)
  })

  it('napisy na iPadach po edycji', () => {
    const wyniki = { '1': { klasa: 'A', punkty: 900, miejsce: 1 }, '2': { klasa: 'B', punkty: 300, miejsce: 2 } }
    const f = farewells(wyniki, 'polfinal', 0)
    expect(f['1']?.tekst).toBe('Do zobaczenia!')
    expect(f['2']?.tekst).toBe('Do zobaczenia w następnym sezonie!')
    expect(farewells(wyniki, 'eliminacje', 2)['2']?.tekst).toMatch(/ranking/)
    expect(farewells(wyniki, 'final', 0)['1']?.tekst).toMatch(/mistrzowie sezonu/)
  })
})
