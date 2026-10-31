import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseQuestionSet, QuestionFileError } from './questions'

const example = JSON.parse(readFileSync(new URL('../../../przyklad/pytania.json', import.meta.url), 'utf8'))

describe('parseQuestionSet', () => {
  it('wczytuje przykładowy plik pytania.json', () => {
    const set = parseQuestionSet(example)
    expect(set.edycja).toBe('Edycja testowa')
    expect(set.runda1).toHaveLength(5)
    expect(set.runda1[0]).toMatchObject({ haslo: 'Gama w górę', plik: 'test-r1-01.mp3', start: 0 })
  })

  it('brak „start” = początek utworu', () => {
    const raw = structuredClone(example)
    delete raw.runda1[2].start
    expect(parseQuestionSet(raw).runda1[2].start).toBe(0)
  })

  it('wymaga dokładnie 5 haseł w rundzie 1', () => {
    const raw = structuredClone(example)
    raw.runda1.pop()
    expect(() => parseQuestionSet(raw)).toThrow(QuestionFileError)
  })

  it('mówi, którego pola brakuje', () => {
    const raw = structuredClone(example)
    delete raw.runda1[1].tytul
    expect(() => parseQuestionSet(raw)).toThrow('Runda 1, hasło 2: brakuje pola „tytul”.')
  })
})

describe('runda 2 i dogrywka w pytania.json', () => {
  it('wczytuje 3 hasła rundy 2 i hasła dogrywki', () => {
    const set = parseQuestionSet(example)
    expect(set.runda2).toHaveLength(3)
    expect(set.dogrywka2).toHaveLength(2)
  })

  it('plik bez rundy 2 nadal działa (runda 1 z wersji 0.3)', () => {
    const raw = structuredClone(example)
    delete raw.runda2
    delete raw.dogrywka2
    const set = parseQuestionSet(raw)
    expect(set.runda2).toEqual([])
    expect(set.dogrywka2).toEqual([])
  })

  it('runda 2 musi mieć dokładnie 3 hasła', () => {
    const raw = structuredClone(example)
    raw.runda2.push(raw.runda2[0])
    expect(() => parseQuestionSet(raw)).toThrow('Runda 2 musi mieć dokładnie 3 hasła (jest 4).')
  })
})

describe('runda 3 w pytania.json', () => {
  it('wczytuje 6 zagadek; bez „wartosc” ostatnia jest za 400 pkt', () => {
    const set = parseQuestionSet(example)
    expect(set.runda3).toHaveLength(6)
    expect(set.runda3.map((q) => q.wartosc)).toEqual([200, 200, 200, 200, 200, 400])
    expect(set.runda3[0]).toMatchObject({ wykonawca: 'Zespół Testowy', nuty: 'test-r3-01.png' })
  })

  it('wartości z pliku mają pierwszeństwo', () => {
    const raw = structuredClone(example)
    raw.runda3[2].wartosc = 400
    expect(parseQuestionSet(raw).runda3.map((q) => q.wartosc)).toEqual([200, 200, 400, 200, 200, 200])
  })
})
