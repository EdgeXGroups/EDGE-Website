import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    target: 'es2022', // content.js uses top-level await
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        collection: resolve(import.meta.dirname, 'collection.html'),
        team: resolve(import.meta.dirname, 'team.html'),
        contact: resolve(import.meta.dirname, 'contact.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        checkout: resolve(import.meta.dirname, 'checkout.html'),
        account: resolve(import.meta.dirname, 'account.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        terms: resolve(import.meta.dirname, 'terms.html'),
        refunds: resolve(import.meta.dirname, 'refunds.html'),
        shipping: resolve(import.meta.dirname, 'shipping.html'),
      },
    },
  },
})
