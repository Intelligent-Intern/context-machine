// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './core/routing'
import { initCore } from './core/initCore'
import { i18n } from '@/core/i18n'

// Globale Styles
import '@/styles/index.css'
import '@/styles/tailwind.css'

const app = createApp(App)

// Pinia
const pinia = createPinia()
app.use(pinia)

// Router
app.use(router)

// i18n
app.use(i18n)

// Core-System initialisieren (Stores, Handler, WS etc.)
initCore()

// Register essential widgets immediately for login page
import('@/core/stores/discovery').then(({ useDiscoveryStore }) => {
  const discovery = useDiscoveryStore()
  discovery.registerBuiltInWidgets()
})

// App mounten
app.mount('#app')
