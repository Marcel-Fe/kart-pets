import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Projekt-Repo "kart-pets" -> gehostet unter marcel-fe.github.io/kart-pets/.
// Asset-Pfade laufen ueber asset()/import.meta.env.BASE_URL.
export default defineConfig({
  base: '/kart-pets/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Pet Cars',
        short_name: 'Pet Cars',
        description: 'Cartoon-Kart-Racer mit sammelbaren Renn-Tieren.',
        lang: 'de',
        theme_color: '#0a1030',
        background_color: '#0a1030',
        display: 'standalone',
        // Beide Orientierungen erlauben: Menü ist Hochformat, im Rennen kann quer gedreht werden.
        orientation: 'any',
        start_url: '/kart-pets/',
        scope: '/kart-pets/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Auch 3D-Modelle offline cachen; Bundle/GLB sind groesser als der Default (2 MB).
        globPatterns: ['**/*.{js,css,html,png,svg,glb,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  server: { host: true },
})
