import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        collection: resolve(import.meta.dirname, 'collection.html'),
        team: resolve(import.meta.dirname, 'team.html'),
        contact: resolve(import.meta.dirname, 'contact.html'),
      },
    },
  },
})
