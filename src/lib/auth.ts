import type { User } from 'firebase/auth'
import { createContext, useContext } from 'react'
import type { Role } from './roles'

export interface AuthState {
  user: User | null
  role: Role | undefined
  loading: boolean
  login: (role: Role, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

/** Aktualnie zalogowana rola na tym urządzeniu. */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth musi być użyte wewnątrz <AuthProvider>')
  return ctx
}

/** Zamienia kod błędu Firebase na komunikat po polsku. */
export function loginErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Złe hasło.'
    case 'auth/too-many-requests':
      return 'Za dużo prób. Odczekaj chwilę i spróbuj ponownie.'
    case 'auth/network-request-failed':
      return 'Brak połączenia z internetem.'
    case 'auth/operation-not-allowed':
      return 'Logowanie e-mailem i hasłem nie jest włączone w Firebase.'
    default:
      return 'Nie udało się zalogować. Spróbuj jeszcze raz.'
  }
}
