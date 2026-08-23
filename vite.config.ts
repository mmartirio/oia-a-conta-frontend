import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: {
    // sockjs-client (usado no WebSocketContext) espera o objeto `global` do
    // Node, que não existe no navegador — sem isso a conexão STOMP quebra.
    global: 'globalThis'
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'generateSW',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      devOptions: {
        enabled: false
      },
      manifest: {
        name: 'Oia a Conta',
        short_name: 'Oia a Conta',
        description: 'Sistema de gestão de pedidos para restaurantes',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 }
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true'
    },
    proxy: {
      '/api': { target: process.env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:8090', changeOrigin: true },
      '/ws':  { target: process.env.VITE_DEV_WS_PROXY_TARGET || 'http://localhost:8085', changeOrigin: true, ws: true }
    }
  },
  resolve: {
    alias: { '@': '/src' }
  }
})
