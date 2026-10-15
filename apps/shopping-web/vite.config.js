import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/bagisto-api': {
        target: process.env.VITE_BAGISTO_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/bagisto-api/, ''),
      },
    },
  },
})
