import { describe, expect, it, vi } from 'vitest'

vi.mock('./firebase', () => ({ db: {}, auth: {} }))
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }))

const { isCurrentClient } = await import('./presence')

describe('obecność urządzeń', () => {
  it('stara wersja aplikacji (bez k) nie liczy się jako zalogowana', () => {
    expect(isCurrentClient({ od: 1 })).toBe(false)
    expect(isCurrentClient({ od: 1, wersja: 'abc' })).toBe(false)
    expect(isCurrentClient({ od: 1, wersja: 'abc', k: 1 })).toBe(false)
    expect(isCurrentClient({ od: 1, wersja: 'abc', k: 2 })).toBe(true)
    expect(isCurrentClient(null)).toBe(false)
  })
})
