// Cztery role aplikacji. Każda rola = jedno konto w Firebase Authentication.
// Adresy e-mail są zmyślone (domena example.pl) — użytkownik wpisuje tylko hasło.

export type RoleId = 'zawodnik' | 'host' | 'tech' | 'tablica' | 'muzyk'

export interface Role {
  id: RoleId
  label: string
  description: string
  email: string
  path: string
}

export const ROLES: readonly Role[] = [
  {
    id: 'zawodnik',
    label: 'Zawodnik',
    description: 'Przycisk na stanowisku (iPad)',
    email: 'zawodnik@cyfroweszkoly.pl',
    path: '/zawodnik',
  },
  {
    id: 'host',
    label: 'Host',
    description: 'Panel prowadzącego i muzyka (MacBook)',
    email: 'host@cyfroweszkoly.pl',
    path: '/host',
  },
  {
    id: 'tech',
    label: 'Tech Support',
    description: 'Ekipa od live (OBS / vMix)',
    email: 'techsupport@cyfroweszkoly.pl',
    path: '/tech',
  },
  {
    id: 'tablica',
    label: 'Tablica',
    description: 'Duży ekran dla widowni',
    email: 'tablica@cyfroweszkoly.pl',
    path: '/tablica',
  },
  {
    id: 'muzyk',
    label: 'Muzyk',
    description: 'Nuty do rundy 3 (przy pianinie)',
    email: 'muzyk@cyfroweszkoly.pl',
    path: '/muzyk',
  },
]

export function roleById(id: string | undefined): Role | undefined {
  return ROLES.find((r) => r.id === id)
}

export function roleByEmail(email: string | null | undefined): Role | undefined {
  if (!email) return undefined
  return ROLES.find((r) => r.email === email.toLowerCase())
}

export const STANOWISKA = [1, 2, 3] as const
export type Stanowisko = (typeof STANOWISKA)[number]
