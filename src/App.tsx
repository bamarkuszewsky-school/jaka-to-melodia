import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
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
