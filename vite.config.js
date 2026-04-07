import { defineConfig } from 'vite'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Plugin to resolve /foo/ to /foo/index.html in public/
function publicIndexPlugin() {
  return {
    name: 'public-index-resolve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // If URL ends with / and there's an index.html in public for it
        if (req.url.endsWith('/') && req.url !== '/') {
          const publicPath = resolve(__dirname, 'public' + req.url + 'index.html')
          if (existsSync(publicPath)) {
            req.url = req.url + 'index.html'
          }
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [publicIndexPlugin()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
})
