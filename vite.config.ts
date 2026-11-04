import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Numer wersji (czas budowania) — urządzenia porównują go z version.json i same się odświeżają. */
const BUILD_ID = Date.now().toString(36)

function versionFile(): Plugin {
  return {
    name: 'jtm-version',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) })
    },
  }
}

// base: './' — strona działa pod dowolnym adresem,
// np. https://<login>.github.io/jaka-to-melodia/
export default defineConfig({
  base: './',
  plugins: [react(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  // Firebase sam waży ok. 450 kB — to normalne dla tej biblioteki.
  build: { chunkSizeWarningLimit: 800 },
})
