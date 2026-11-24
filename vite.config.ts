import { defineConfig } from 'vite'

export default defineConfig({
  server: { host: '127.0.0.1', port: 5183 },
  build: { target: 'esnext' },
  optimizeDeps: { exclude: ['@mtcute/wasm'] },
})
