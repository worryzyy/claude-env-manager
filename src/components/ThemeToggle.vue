<template>
  <div class="theme-toggle">
    <button
      @click="toggleTheme"
      class="theme-btn"
      :title="themeTooltip"
    >
      <component :is="themeIcon" :size="20" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Sun, Moon, Monitor } from 'lucide-vue-next'
import { useThemeStore } from '../stores/theme'

const themeStore = useThemeStore()

const themeIcon = computed(() => {
  switch (themeStore.theme) {
    case 'light':
      return Sun
    case 'dark':
      return Moon
    case 'auto':
    default:
      return Monitor
  }
})

const themeTooltip = computed(() => {
  switch (themeStore.theme) {
    case 'light':
      return 'Switch to Dark Theme'
    case 'dark':
      return 'Switch to Auto Theme'
    case 'auto':
    default:
      return 'Switch to Light Theme'
  }
})

const toggleTheme = () => {
  themeStore.toggleTheme()
}
</script>

<style scoped>
.theme-toggle {
  position: relative;
}

.theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--surface);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.theme-btn:hover {
  background-color: var(--border-light);
  transform: scale(1.05);
}

.theme-btn:active {
  transform: scale(0.95);
}

/* 添加切换动画效果 */
.theme-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background-color: var(--primary);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
  opacity: 0;
  z-index: 0;
}

.theme-btn:active::before {
  width: 80px;
  height: 80px;
  opacity: 0.1;
}

.theme-btn > * {
  position: relative;
  z-index: 1;
}
</style>