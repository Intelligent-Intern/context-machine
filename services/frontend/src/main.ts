// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './core/routing'
import { initCore } from './core/initCore'
import { i18n } from '@/core/i18n'

// Globale Styles
import '@/core/layout/styles/index.css'
import '@/core/layout/styles/tailwind.css'

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

// TODO: Register auth widget pack for login page

// App mounten
app.mount('#app')
