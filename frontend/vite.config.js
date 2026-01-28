// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0', // Esto permite que otros vean tu sitio en la red
    proxy: {
    '/api': {
    target: 'http://10.15.0.221:5050', // Usa la IP real en lugar de 127.0.0.1
    changeOrigin: true,
    secure: false,
    }
      }
  },
  build: {
    outDir: '../backend/InventarioTI.API/wwwroot',
    emptyOutDir: true
  }
})