import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Libraries in their own long-cached chunks, so an app change doesn't re-download them.
        codeSplitting: {
          groups: [
            {
              name: 'vue',
              test: /node_modules[\\/](@vue[\\/](runtime|reactivity|shared)|vue|vue-router|pinia|@tanstack)[\\/]/,
              priority: 30,
            },
            { name: 'vue-flow', test: /node_modules[\\/](@vue-flow|d3-[^\\/]+)[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
})
