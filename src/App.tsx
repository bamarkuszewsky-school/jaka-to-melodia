import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { reloadTo, useAutoUpdate } from './lib/version'
import { RequireRole } from './components/RequireRole'
import { AuthProvider } from './lib/AuthContext'
import { BoardPage } from './pages/BoardPage'
import { HostPage } from './pages/HostPage'
import { LoginScreen } from './pages/LoginScreen'
import { MusicianPage } from './pages/MusicianPage'
import { PlayerPage } from './pages/PlayerPage'
import { StartScreen } from './pages/StartScreen'
import { StreamPage } from './pages/StreamPage'
import { TechPage } from './pages/TechPage'

// HashRouter (adresy z #/...) działa na GitHub Pages bez dodatkowej konfiguracji serwera.
export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AutoUpdate />
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/logowanie/:roleId" element={<LoginScreen />} />
          <Route
            path="/host"
            element={
              <RequireRole allow={['host']}>
                <HostPage />
              </RequireRole>
            }
          />
          <Route
            path="/zawodnik"
            element={
              <RequireRole allow={['zawodnik']}>
                <PlayerPage />
              </RequireRole>
            }
          />
          <Route
            path="/tablica"
            element={
              <RequireRole allow={['tablica']}>
                <BoardPage />
              </RequireRole>
            }
          />
          <Route
            path="/tech"
            element={
              <RequireRole allow={['tech']}>
                <TechPage />
              </RequireRole>
            }
          />
          <Route
            path="/stream"
            element={
              <RequireRole allow={['tech']}>
                <StreamPage />
              </RequireRole>
            }
          />
          <Route
            path="/muzyk"
            element={
              <RequireRole allow={['muzyk']}>
                <MusicianPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

/** Nowa wersja na GitHub Pages: urządzenia odświeżają się same (poza grą), host widzi komunikat. */
function AutoUpdate() {
  const { pathname } = useLocation()
  const isHost = pathname.startsWith('/host')
  const { updateReady, latest } = useAutoUpdate(!isHost)
  if (!updateReady || !isHost) return null
  return (
    <div className="update-banner" role="status">
      Jest nowa wersja aplikacji.{' '}
      <button type="button" className="btn btn--tiny btn--primary" onClick={() => {
          try {
            sessionStorage.removeItem('jtm-reload')
          } catch {
            /* nic */
          }
          if (latest) reloadTo(latest)
          else window.location.reload()
        }}>
        Odśwież
      </button>{' '}
      <span className="muted small">(potem wybierz folder z muzyką ponownie — gra i punkty zostają)</span>
    </div>
  )
}
