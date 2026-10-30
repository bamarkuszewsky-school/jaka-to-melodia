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
