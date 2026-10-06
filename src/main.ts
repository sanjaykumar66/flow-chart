import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import './style.css'
import App from './App.vue'
import { createAppQueryClient } from './queries/client'
import { createAppRouter } from './router'

createApp(App)
  .use(createPinia())
  .use(VueQueryPlugin, { queryClient: createAppQueryClient() })
  .use(createAppRouter())
  .mount('#app')
