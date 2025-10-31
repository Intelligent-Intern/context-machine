<template>
  <div class="dashboard-default">
    <div class="welcome-header">
      <h1>{{ title }}</h1>
      <p>Sie sind erfolgreich als <strong>{{ user?.name || 'Admin' }}</strong> angemeldet</p>
    </div>
    
    <div class="welcome-grid">
      <div class="welcome-card">
        <div class="card-icon">✓</div>
        <h3>System Status</h3>
        <p class="status-ok">Alle Systeme betriebsbereit</p>
      </div>
      
      <div class="welcome-card">
        <div class="card-icon">👤</div>
        <h3>Benutzerrolle</h3>
        <p>{{ user?.role || 'Administrator' }}</p>
      </div>
      
      <div class="welcome-card">
        <div class="card-icon">📅</div>
        <h3>Letzter Login</h3>
        <p>{{ new Date().toLocaleDateString('de-DE') }}</p>
      </div>
    </div>
    
    <div class="welcome-info">
      <div class="info-card">
        <h3>🚀 System bereit</h3>
        <p>Alle Services sind erfolgreich gestartet und betriebsbereit. Sie können jetzt mit der Arbeit beginnen.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'

interface Props {
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Willkommen'
})

// Injected dependencies
const ctx = inject('ctx', {
  widgetId: 'dashboard@Default',
  port: 'main'
}) as any

// Get user info from auth store
const user = computed(() => {
  try {
    const authData = localStorage.getItem('auth_user')
    return authData ? JSON.parse(authData) : null
  } catch {
    return null
  }
})

// No navigation methods needed
</script>

<style scoped>
.dashboard-default {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.welcome-header {
  text-align: center;
  margin-bottom: 2rem;
}

.welcome-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-header p {
  font-size: 1.125rem;
  color: #6b7280;
}

.welcome-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.welcome-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.welcome-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  display: block;
}

.welcome-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.welcome-card p {
  color: #6b7280;
  font-size: 1rem;
}

.status-ok {
  color: #10b981 !important;
  font-weight: 600;
}

.welcome-info {
  margin-top: 2rem;
}

.info-card {
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
  border: 1px solid #d1fae5;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.info-card h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #065f46;
  margin-bottom: 1rem;
}

.info-card p {
  color: #047857;
  font-size: 1.125rem;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .dashboard-default {
    padding: 1rem;
  }
  
  .welcome-header h1 {
    font-size: 2rem;
  }
  
  .welcome-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .info-card {
    padding: 1.5rem;
  }
  
  .info-card h3 {
    font-size: 1.25rem;
  }
  
  .info-card p {
    font-size: 1rem;
  }
}
</style>