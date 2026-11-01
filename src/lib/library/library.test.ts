import { describe, expect, it } from 'vitest'
import type { GameState } from '../game/types'
import {
  computeRanking,
  drawEdition,
  exportCsv,
  importCsv,
  isPlayed,
  missingFor,
  parseRoundFolder,
  parseSongName,
  redrawOne,
  roundIntroFor,
  systemSound,
  scanLibrary,
  songId,
  songOutcomes,
  stationResults,
  syncChanges,
  type SongRecord,
  type Songs,
} from './library'

const f = (path: string) => ({ name: path.split('/').pop()!, webkitRelativePath: path })

describe('folder z muzyką', () => {
  it('rozpoznaje podfoldery rund', () => {
    expect(parseRoundFolder('RUNDA 1')).toBe('1')
    expect(parseRoundFolder('runda_2')).toBe('2')
    expect(parseRoundFolder('Runda3')).toBe('3')
    expect(parseRoundFolder('FINAŁ')).toBe('F')
    expect(parseRoundFolder('Finał')).toBe('F')
    expect(parseRoundFolder('Inne')).toBeNull()
  })

  it('dzieli nazwę pliku na tytuł i wykonawcę', () => {
    expect(parseSongName('Takie Tango - Budka Suflera')).toEqual({ tytul: 'Takie Tango', wykonawca: 'Budka Suflera' })
    expect(parseSongName('Jolka, Jolka pamiętasz – Budka Suflera')).toEqual({
      tytul: 'Jolka, Jolka pamiętasz',
      wykonawca: 'Budka Suflera',
    })
    expect(parseSongName('Bez myślnika')).toEqual({ tytul: 'Bez myślnika', wykonawca: '' })
  })

  it('id jest bezpieczne dla Firebase i stałe', () => {
    expect(songId('1', 'Takie Tango - Budka Suflera')).toBe('r1-takie-tango-budka-suflera')
    expect(songId('F', 'Żółta łódź - Zespół')).toBe('f-zolta-lodz-zespol')
  })

  it('skanuje rundy, łączy mp3 z nutami i znajduje czołówkę', () => {
    const scan = scanLibrary([
      f('Muzyka/RUNDA 1/Takie Tango - Budka Suflera.mp3'),
      f('Muzyka/RUNDA 3/Lato - Zespół.png'),
      f('Muzyka/RUNDA 3/Lato - Zespół.mp3'),
      f('Muzyka/FINAŁ/Edycja 1/Hit - Ktoś.mp3'),
      f('Muzyka/czolowka.wav'),
      f('Muzyka/.DS_Store'),
      f('Muzyka/luzem.mp3'),
    ])
    expect([...scan.songs.keys()].sort()).toEqual(['f-hit-ktos', 'r1-takie-tango-budka-suflera', 'r3-lato-zespol'])
    const r3 = scan.songs.get('r3-lato-zespol')!
    expect(r3.audioPath).toBe('RUNDA 3/Lato - Zespół.mp3')
    expect(r3.nutyPath).toBe('RUNDA 3/Lato - Zespół.png')
    expect(scan.intro?.name).toBe('czolowka.wav')
    expect(scan.skipped).toEqual(['luzem.mp3'])
  })

  it('rozpoznaje dźwięki systemowe', () => {
    const scan = scanLibrary([
      f('Muzyka/SYSTEMOWE/Jaka to melodia czołówka intro.mp3'),
      f('Muzyka/SYSTEMOWE/Jaka to melodia runda intro.mp3'),
      f('Muzyka/SYSTEMOWE/Finał intro.mp3'),
      f('Muzyka/czolowka.wav'),
      f('Muzyka/RUNDA 1/A - B.mp3'),
    ])
    expect(scan.intro?.name).toBe('Jaka to melodia czołówka intro.mp3')
    expect(scan.roundIntros.wszystkie?.name).toBe('Jaka to melodia runda intro.mp3')
    expect(roundIntroFor(scan.roundIntros, 1)?.name).toBe('Jaka to melodia runda intro.mp3')
    expect(roundIntroFor(scan.roundIntros, 4)?.name).toBe('Finał intro.mp3')
    expect(scan.songs.size).toBe(1)
    expect(systemSound('Runda 2 intro.mp3')).toEqual({ kind: 'runda', key: '2' })
  })

  it('synchronizacja dodaje nowe, nie rusza ustawień, oznacza brakujące', () => {
    const scan = scanLibrary([f('M/RUNDA 1/A - X.mp3'), f('M/RUNDA 1/B - Y.mp3')])
    const songs: Songs = {
      'r1-a-x': { runda: '1', tytul: 'A', wykonawca: 'X', plik: 'RUNDA 1/A - X.mp3', start: 12 },
      'r1-stary-z': { runda: '1', tytul: 'Stary', wykonawca: 'Z', plik: 'RUNDA 1/Stary - Z.mp3' },
    }
    expect(syncChanges(scan, songs)).toEqual({
      'r1-b-y': { runda: '1', tytul: 'B', wykonawca: 'Y', plik: 'RUNDA 1/B - Y.mp3', nuty: null },
      'r1-stary-z/brak': true,
    })
  })
})

function song(runda: SongRecord['runda'], i: number, extra: Partial<SongRecord> = {}): [string, SongRecord] {
  return [
    `${runda}-${i}`,
    {
      runda,
      tytul: `T${i}`,
      wykonawca: `W${runda}${i}`,
      plik: 'x.mp3',
      nuty: runda === '3' ? 'x.png' : undefined,
      start: runda === '3' ? undefined : 5,
      haslo: runda === '2' ? `H${i}` : undefined,
      podpowiedz: runda === '3' ? 'Anegdota' : undefined,
      ...extra,
    },
  ]
}

function library(): Songs {
  return Object.fromEntries([
    ...Array.from({ length: 6 }, (_, i) => song('1', i)),
    ...Array.from({ length: 6 }, (_, i) => song('2', i)),
    ...Array.from({ length: 6 }, (_, i) => song('3', i)),
    ...Array.from({ length: 8 }, (_, i) => song('F', i)),
  ])
}

describe('gotowość i losowanie', () => {
  it('pokazuje, czego brakuje', () => {
    expect(missingFor({ runda: '1', tytul: 'a', wykonawca: 'b', plik: 'x' })).toEqual(['start'])
    expect(missingFor({ runda: '2', tytul: 'a', wykonawca: 'b', plik: 'x', start: 0 })).toEqual(['haslo'])
    expect(missingFor({ runda: '3', tytul: 'a', wykonawca: 'b', plik: 'x' })).toEqual(['nuty', 'podpowiedz'])
    expect(missingFor({ runda: 'F', tytul: 'a', wykonawca: 'b', start: 3, brak: true, plik: 'x' })).toEqual(['plik'])
  })

  it('losuje komplet bez powtórek', () => {
    const r = drawEdition(library(), () => 0.3)
    expect(r.braki).toEqual([])
    expect(r.utwory.runda1).toHaveLength(5)
    expect(r.utwory.runda2).toHaveLength(3)
    expect(r.utwory.dogrywka2).toHaveLength(2)
    expect(r.utwory.runda3).toHaveLength(6)
    expect(r.utwory.final).toHaveLength(7)
    const all = Object.values(r.utwory).flat()
    expect(new Set(all).size).toBe(all.length)
  })

  it('pomija zagrane, chyba że host je odblokował', () => {
    const songs = library()
    songs['1-0'].historia = { e1: { nazwa: 'Edycja 1', data: 1, odgadniety: true } }
    songs['1-1'].historia = { e1: { nazwa: 'Edycja 1', data: 1, odgadniety: false } }
    songs['1-1'].odblokowany = true
    expect(isPlayed(songs['1-0'])).toBe(true)
    expect(isPlayed(songs['1-1'])).toBe(false)
    const r = drawEdition(songs)
    expect(r.utwory.runda1).not.toContain('1-0')
    expect(r.utwory.runda1).toHaveLength(5)
  })

  it('zgłasza braki, gdy utworów jest za mało', () => {
    const songs = library()
    delete songs['F-0']
    delete songs['F-1']
    expect(drawEdition(songs).braki).toEqual([{ key: 'final', potrzeba: 7, jest: 6 }])
  })

  it('losuje jeden utwór na zamianę', () => {
    const songs = library()
    const r = drawEdition(songs, () => 0)
    const fresh = redrawOne(songs, r.utwory, 'runda1', 0)
    expect(fresh).toBeDefined()
    expect(r.utwory.runda1).not.toContain(fresh)
  })
})

describe('wyniki edycji i ranking', () => {
  const game = {
    punkty: { '1': 900, '2': 1200, '3': 300 },
    runda1: {
      hasla: [
        { haslo: 'a', stan: 'odgadniete', stanowisko: '2' },
        { haslo: 'b', stan: 'nieodgadniete' },
        { haslo: 'c', stan: 'pominiete' },
      ],
    },
    runda2: { hasla: [], odpada: '3' },
    runda3: {
      gracze: ['1', '2'],
      wybiera: '1',
      wygrane: { '1': 3 },
      zwyciezca: '1',
      hasla: [{ stan: 'nieodgadniete', trafil: false, zgadywal: '2', stanowisko: '1' }],
    },
    runda4: {
      gracz: '1',
      utwory: [{ stan: 'odgadnieta' }, { stan: 'pominieta' }, { stan: 'czeka' }],
      biezacy: 1,
      faza: 'koniec',
      czasZostal: 0,
      zdobyte: 250,
    },
  } as unknown as GameState
  const utwory = { runda1: ['a', 'b', 'c'], runda2: [], dogrywka2: [], runda3: ['r3'], final: ['f1', 'f2', 'f3'] }

  it('wie, które utwory zagrano', () => {
    expect(songOutcomes(game, utwory)).toEqual([
      { id: 'a', odgadniety: true, stanowisko: '2' },
      { id: 'b', odgadniety: false, stanowisko: undefined },
      { id: 'r3', odgadniety: false, stanowisko: '2' },
      { id: 'f1', odgadniety: true, stanowisko: '1' },
      { id: 'f2', odgadniety: false, stanowisko: '1' },
    ])
  })

  it('finalista jest pierwszy, nawet z mniejszą liczbą punktów', () => {
    const r = stationResults(game, { '1': '4BT', '2': '3AG', '3': '' })
    expect(r['1']).toEqual({ klasa: '4BT', punkty: 900, miejsce: 1 })
    expect(r['2'].miejsce).toBe(2)
    expect(r['3']).toEqual({ klasa: 'Stanowisko 3', punkty: 300, miejsce: 3 })
  })

  it('ranking sezonu sortuje po punktach i pomija niezakończone edycje', () => {
    const ranking = computeRanking({
      e1: {
        nazwa: 'Edycja 1',
        numer: 1,
        utworzono: 1,
        zakonczono: 2,
        utwory,
        finalista: '1',
        mistrz: true,
        wyniki: { '1': { klasa: '4BT', punkty: 900, miejsce: 1 }, '2': { klasa: '3AG', punkty: 1200, miejsce: 2 } },
      },
      e2: { nazwa: 'Edycja 2', numer: 2, utworzono: 3, utwory },
    })
    expect(ranking.map((r) => r.klasa)).toEqual(['3AG', '4BT'])
    expect(ranking[1]).toMatchObject({ mistrz: true, finalista: true, edycja: 'Edycja 1' })
  })
})

describe('CSV', () => {
  it('eksport i import w obie strony', () => {
    const songs: Songs = Object.fromEntries([song('2', 1, { haslo: undefined, start: undefined })])
    const csv = exportCsv(songs)
    expect(csv.split('\n')[0]).toBe('id;runda;tytul;wykonawca;start;refren;haslo;podpowiedz;zagrany')
    const edited = csv.replace('2-1;Runda 2;T1;W21;;;;;', '2-1;Runda 2;T1;W21;1:02,5;75;"Hasło; z średnikiem";;')
    const res = importCsv(edited, songs)
    expect(res.errors).toEqual([])
    expect(res.updated).toBe(1)
    expect(res.changes).toEqual({ '2-1/start': 62.5, '2-1/refren': 75, '2-1/haslo': 'Hasło; z średnikiem' })
  })

  it('zgłasza nieznane id i złe liczby', () => {
    const songs: Songs = Object.fromEntries([song('1', 1)])
    const res = importCsv('id,start\n1-1,abc\nnie-ma,3\n', songs)
    expect(res.unknown).toEqual(['nie-ma'])
    expect(res.errors).toHaveLength(1)
  })
})
