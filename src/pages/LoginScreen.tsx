import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { loginErrorMessage, useAuth } from '../lib/auth'
import { roleById } from '../lib/roles'

/** Ekran hasła dla wybranej roli. */
export function LoginScreen() {
  const { roleId } = useParams()
  const role = roleById(roleId)
  const { login, role: current, loading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!role) return <Navigate to="/" replace />

  // Po zalogowaniu wracamy tam, skąd przyszliśmy (np. /stream w OBS), inaczej do widoku roli.
  const nextParam = params.get('next')
  const target = nextParam && nextParam.startsWith('/') ? nextParam : role.path

  if (!loading && current?.id === role.id) return <Navigate to={target} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password) return
    setBusy(true)
    setError(null)
    try {
      await login(role, password)
      navigate(target, { replace: true })
    } catch (err) {
      setError(loginErrorMessage(err))
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="start">
      <div className="start__glow" aria-hidden />
      <form className="login" onSubmit={onSubmit}>
        <Link to="/" className="back-link">
          ← Zmień rolę
        </Link>
        <p className="eyebrow">Logowanie</p>
        <h1 className="login__title">{role.label}</h1>
        <p className="muted">{role.description}</p>

        {current && current.id !== role.id && (
          <p className="notice">
            To urządzenie jest zalogowane jako <strong>{current.label}</strong>. Zalogowanie się tutaj przełączy rolę.
          </p>
        )}

        <label className="field">
          <span className="field__label">Hasło</span>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field__input"
            disabled={busy}
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--big" disabled={busy || !password}>
          {busy ? 'Logowanie…' : 'Wejdź'}
        </button>
      </form>
    </div>
  )
}
