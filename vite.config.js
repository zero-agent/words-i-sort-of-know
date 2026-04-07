import { defineConfig } from 'vite'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Plugin to resolve /foo/ to /foo/index.html in public/
function publicIndexPlugin() {
  return {
    name: 'public-index-resolve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Redirect /foo to /foo/ if there's an index.html in public
        if (!req.url.endsWith('/') && !req.url.includes('.')) {
          const publicPath = resolve(__dirname, 'public' + req.url + '/index.html')
          if (existsSync(publicPath)) {
            res.writeHead(302, { Location: req.url + '/' })
            res.end()
            return
          }
        }
        // Resolve /foo/ to /foo/index.html
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
