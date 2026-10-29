import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: './' — strona działa pod dowolnym adresem,
// np. https://<login>.github.io/jaka-to-melodia/
export default defineConfig({
  base: './',
  plugins: [react()],
  // Firebase sam waży ok. 450 kB — to normalne dla tej biblioteki.
  build: { chunkSizeWarningLimit: 800 },
})
