import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ROLES } from '../lib/roles'

/** Pierwszy ekran: wybór roli. Zalogowane urządzenie od razu trafia do swojego widoku. */
export function StartScreen() {
  const { role, loading } = useAuth()
  if (!loading && role) return <Navigate to={role.path} replace />

  return (
    <div className="start">
      <div className="start__glow" aria-hidden />
      <header className="start__header">
        <p className="eyebrow">Szkolny teleturniej</p>
        <h1 className="start__title">
          Jaka to <span className="accent">melodia?</span>
        </h1>
        <p className="start__lead">Wybierz, kim jesteś na tym urządzeniu.</p>
      </header>

      <nav className="roles" aria-label="Wybór roli">
        {ROLES.map((r, i) => (
          <Link key={r.id} to={`/logowanie/${r.id}`} className="role-card" style={{ animationDelay: `${i * 70}ms` }}>
            <span className="role-card__label">{r.label}</span>
            <span className="role-card__desc">{r.description}</span>
            <span className="role-card__arrow" aria-hidden>
              →
            </span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
