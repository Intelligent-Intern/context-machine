<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1>Forgot Password</h1>
      <p>Test widget is working!</p>
      <button @click="goToLogin">Back to Login</button>
    </div>
  </div>
</template>

<script setup lang="ts">
function goToLogin() {
  window.location.href = '/login'
}
</script>

<!-- No styles in widgets - all styling via theme classes -->