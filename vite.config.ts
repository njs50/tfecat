import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  base: process.env.NODE_ENV === 'production' ? '/tfecat/' : '/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Vite 8 / Rolldown: manualChunks must be a function (object map form is rejected)
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('vuetify') || id.includes('@mdi')) return 'vuetify-vendor'
          if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) return 'vue-vendor'
          if (id.includes('axios')) return 'utils-vendor'
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    // Vuetify 4 overlay stacking in Vite dev needs consistent pre-bundling
    include: [
      'vue',
      'vue-router',
      'pinia',
      'vuetify',
      'axios',
      'vuetify/components/VOverlay',
      'vuetify/components/VDialog',
      'vuetify/components/VMenu',
      'vuetify/components/VSelect',
      'vuetify/components/VTooltip',
    ]
  }
})
