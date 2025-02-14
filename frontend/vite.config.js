import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/grateful-dead-timemachine/',
  optimizeDeps: {
    include: ['./src/data/shows.json']
  }
}) 