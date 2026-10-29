import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useConnected } from '../lib/presence'
import { useFullscreen } from '../lib/screen'

interface ShellProps {
  title: string
  subtitle?: string
  children: ReactNode
  /** Ukrywa pasek całkowicie. */
  bare?: boolean
  /** Ukrywa pasek w trybie pełnoekranowym (tablica, iPady) — widownia widzi czysty ekran. */
  hideBarInFullscreen?: boolean
}

/** Wspólna rama widoków: pasek z nazwą roli, stanem połączenia, pełnym ekranem i wylogowaniem. */
export function Shell({ title, subtitle, children, bare = false, hideBarInFullscreen = false }: ShellProps) {
  const { logout } = useAuth()
  const connected = useConnected()
  const { isFullscreen, supported, toggle } = useFullscreen()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  const showBar = !bare && !(hideBarInFullscreen && isFullscreen)

  return (
    <div className="shell">
      {showBar && (
        <header className="topbar">
          <div className="topbar__brand">
            <span className="logo-dot" aria-hidden />
            <div>
              <div className="topbar__title">{title}</div>
              {subtitle && <div className="topbar__subtitle">{subtitle}</div>}
            </div>
          </div>
          <div className="topbar__actions">
            <span className={`status ${connected ? 'status--on' : 'status--off'}`}>
              {connected ? 'Połączono' : 'Brak połączenia'}
            </span>
            {supported && (
              <button type="button" className="btn btn--ghost" onClick={toggle}>
                {isFullscreen ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'}
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={onLogout}>
              Wyloguj
            </button>
          </div>
        </header>
      )}
      <main className="shell__main">{children}</main>
    </div>
  )
}
