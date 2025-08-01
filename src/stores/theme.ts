import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'auto'

export const useThemeStore = defineStore('theme', () => {
  // 状态
  const theme = ref<Theme>('auto')
  
  // 计算属性
  const isDark = computed(() => {
    if (theme.value === 'dark') return true
    if (theme.value === 'light') return false
    // auto 模式：检测系统主题
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  
  const systemTheme = computed(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  
  // 方法
  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
    applyTheme()
    // 保存到本地存储
    localStorage.setItem('theme', newTheme)
  }
  
  const toggleTheme = () => {
    if (theme.value === 'light') {
      setTheme('dark')
    } else if (theme.value === 'dark') {
      setTheme('auto')
    } else {
      setTheme('light')
    }
  }
  
  const applyTheme = () => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme.value)
    
    // 为了确保主题立即生效，直接操作class
    if (isDark.value) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }
  
  const initTheme = () => {
    // 从本地存储读取主题设置
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      theme.value = savedTheme
    }
    
    applyTheme()
    
    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (theme.value === 'auto') {
        applyTheme()
      }
    })
  }
  
  // 监听主题变化
  watch(theme, applyTheme)
  
  return {
    theme: computed(() => theme.value),
    isDark,
    systemTheme,
    setTheme,
    toggleTheme,
    initTheme
  }
})