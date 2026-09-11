import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  server: { port: 5173, proxy: { '/api': { target: 'http://127.0.0.1:8765', changeOrigin: false, ws: true } } },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
})
