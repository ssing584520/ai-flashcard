import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/ai-flashcard/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AI闪卡记忆卡',
        short_name: '闪卡AI',
        description: 'AI 增强版闪卡记忆工具，艾宾浩斯记忆法',
        theme_color: '#FF9AA2',
        background_color: '#FFF5F5',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json}']
      }
    })
  ],
  build: {
    outDir: 'dist'
  }
})
