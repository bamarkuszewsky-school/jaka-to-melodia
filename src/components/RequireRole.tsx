import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import type { RoleId } from '../lib/roles'

/**
 * Wpuszcza tylko zalogowaną, właściwą rolę.
 * Prawdziwą ochroną są reguły bazy — to tylko wygoda w interfejsie.
 */
export function RequireRole({ allow, children }: { allow: RoleId[]; children: ReactNode }) {
  const { role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="center-screen muted">Ładowanie…</div>
  if (!role) {
    const next = encodeURIComponent(location.pathname)
    return <Navigate to={`/logowanie/${allow[0]}?next=${next}`} replace />
  }
  if (!allow.includes(role.id)) return <Navigate to={role.path} replace />
  return <>{children}</>
}
