import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// MatrixScan AR (Scandit BarcodeAr) requires browser multithreading via
// SharedArrayBuffer, which needs the page to be cross-origin isolated.
// COEP 'credentialless' is used because the SDK engine is loaded from the
// jsDelivr CDN (not self-hosted). Applied to both dev and preview servers.
//
// NOTE: for the deployed site (Vercel) these same two headers must be set on
// the served responses, or AR falls back to slow single-threaded mode.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: crossOriginIsolation,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  preview: {
    headers: crossOriginIsolation,
    // Mirror the dev proxy so `npm run preview` reaches the local Django
    // backend too; without this, /api POSTs hit the static server and 405.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
