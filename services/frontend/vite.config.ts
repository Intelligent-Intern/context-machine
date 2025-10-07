// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// Vite-Konfiguration
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  css: {
    postcss: path.resolve(__dirname, './postcss.config.cjs')
  },
  server: {
    port: 5173,
    host: true,
    open: true
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    outDir: 'dist'
  }
})
