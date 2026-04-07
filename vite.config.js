import { defineConfig } from 'vite'

export default defineConfig({
  // Landing page is the root index.html
  // Everything in public/ is served as-is (vl/, instruct/, base/, audio-test/)
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
})
