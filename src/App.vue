<script setup lang="ts">
import { NConfigProvider, NDialogProvider, NMessageProvider } from 'naive-ui'
import { themeOverrides } from '@/theme/naive'
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <!-- Toasts render into the live region below, so screen readers announce them (WCAG 4.1.3). -->
    <NMessageProvider to="#app-notifications">
      <NDialogProvider>
        <RouterView />
      </NDialogProvider>
    </NMessageProvider>
    <section aria-label="Notifications">
      <div id="app-notifications" role="status" aria-live="polite" />
    </section>
  </NConfigProvider>
</template>
