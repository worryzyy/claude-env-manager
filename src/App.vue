<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Settings, Download, Upload, AlertCircle, Plus, X } from 'lucide-vue-next'
import ThemeToggle from './components/ThemeToggle.vue'
import ConfigList from './components/ConfigList.vue'
import ConfigForm from './components/ConfigForm.vue'
import { useThemeStore } from './stores/theme'
import { useConfigStore } from './stores/config'
import type { ClaudeConfig } from './stores/config'

const themeStore = useThemeStore()
const configStore = useConfigStore()

// 应用状态
const currentView = ref<'overview' | 'list' | 'settings'>('overview')
const showConfigForm = ref(false)
const editingConfig = ref<ClaudeConfig | null>(null)
const showImportDialog = ref(false)
const notification = ref<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

// 计算属性
const isFormOpen = computed(() => showConfigForm.value)
const isEditing = computed(() => !!editingConfig.value)

// 通知系统
const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
  notification.value = { type, message }
  setTimeout(() => {
    notification.value = null
  }, 5000)
}

// 配置管理方法
const handleAddConfig = () => {
  editingConfig.value = null
  showConfigForm.value = true
}

const handleEditConfig = (id: string) => {
  const config = configStore.configs.find(c => c.id === id)
  if (config) {
    editingConfig.value = config
    showConfigForm.value = true
  }
}

const handleFormSubmit = async (configData: Partial<ClaudeConfig>) => {
  try {
    if (editingConfig.value) {
      // 编辑现有配置
      const success = configStore.updateConfig(editingConfig.value.id, configData)
      if (success) {
        showNotification('success', `Configuration "${configData.name}" updated successfully`)
      } else {
        showNotification('error', 'Failed to update configuration')
      }
    } else {
      // 添加新配置
      const newId = configStore.addConfig(configData as Omit<ClaudeConfig, 'id' | 'createdAt' | 'updatedAt'>)
      if (newId) {
        showNotification('success', `Configuration "${configData.name}" created successfully`)
      } else {
        showNotification('error', 'Failed to create configuration')
      }
    }
    
    showConfigForm.value = false
    editingConfig.value = null
  } catch (error) {
    showNotification('error', 'An error occurred while saving the configuration')
  }
}

const handleActivateConfig = async (id: string) => {
  try {
    const success = configStore.setActiveConfig(id)
    if (success) {
      const config = configStore.configs.find(c => c.id === id)
      showNotification('success', `Activated configuration: ${config?.name}`)
    } else {
      showNotification('error', 'Failed to activate configuration')
    }
  } catch (error) {
    showNotification('error', 'An error occurred while activating the configuration')
  }
}

const handleDuplicateConfig = (id: string) => {
  try {
    const newId = configStore.duplicateConfig(id)
    if (newId) {
      const originalConfig = configStore.configs.find(c => c.id === id)
      showNotification('success', `Duplicated configuration: ${originalConfig?.name}`)
    } else {
      showNotification('error', 'Failed to duplicate configuration')
    }
  } catch (error) {
    showNotification('error', 'An error occurred while duplicating the configuration')
  }
}

const handleDeleteConfig = (id: string) => {
  try {
    const config = configStore.configs.find(c => c.id === id)
    const confirmMessage = `Are you sure you want to delete "${config?.name}"? This action cannot be undone.`
    
    if (confirm(confirmMessage)) {
      const success = configStore.deleteConfig(id)
      if (success) {
        showNotification('success', `Deleted configuration: ${config?.name}`)
      } else {
        showNotification('error', 'Failed to delete configuration')
      }
    }
  } catch (error) {
    showNotification('error', 'An error occurred while deleting the configuration')
  }
}

// 导入导出功能
const handleExportConfig = (id: string) => {
  try {
    const configData = configStore.exportConfig(id)
    if (configData) {
      const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `claude-config-${configData.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      showNotification('success', 'Configuration exported successfully')
    } else {
      showNotification('error', 'Failed to export configuration')
    }
  } catch (error) {
    showNotification('error', 'An error occurred while exporting the configuration')
  }
}

const handleExportAll = () => {
  try {
    const allConfigs = configStore.exportAllConfigs()
    const blob = new Blob([JSON.stringify(allConfigs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `claude-configs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    showNotification('success', `Exported ${allConfigs.length} configurations`)
  } catch (error) {
    showNotification('error', 'An error occurred while exporting configurations')
  }
}

const handleImportConfig = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.multiple = true
  
  input.onchange = (e) => {
    const files = (e.target as HTMLInputElement).files
    if (!files) return
    
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const configData = JSON.parse(e.target?.result as string)
          
          // 支持单个配置和配置数组
          const configs = Array.isArray(configData) ? configData : [configData]
          let successCount = 0
          
          configs.forEach((config: any) => {
            const newId = configStore.importConfig(config)
            if (newId) successCount++
          })
          
          if (successCount > 0) {
            showNotification('success', `Successfully imported ${successCount} configuration(s)`)
          } else {
            showNotification('error', 'No valid configurations found in the file')
          }
        } catch (error) {
          showNotification('error', `Failed to parse ${file.name}: Invalid JSON format`)
        }
      }
      reader.readAsText(file)
    })
  }
  
  input.click()
}

const handleBulkExport = (ids: string[]) => {
  try {
    const configs = ids.map(id => configStore.exportConfig(id)).filter(Boolean)
    const blob = new Blob([JSON.stringify(configs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `claude-configs-selected-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    showNotification('success', `Exported ${configs.length} selected configurations`)
  } catch (error) {
    showNotification('error', 'An error occurred while exporting selected configurations')
  }
}

const handleBulkDelete = (ids: string[]) => {
  try {
    let successCount = 0
    ids.forEach(id => {
      const success = configStore.deleteConfig(id)
      if (success) successCount++
    })
    
    showNotification('success', `Deleted ${successCount} configurations`)
  } catch (error) {
    showNotification('error', 'An error occurred while deleting configurations')
  }
}

const handleClearData = () => {
  try {
    const confirmMessage = 'Are you sure you want to clear all configurations? This will only clear the app data, not your actual Claude config file.'
    
    if (confirm(confirmMessage)) {
      configStore.clearLocalStorage()
      showNotification('success', 'All app data has been cleared')
    }
  } catch (error) {
    showNotification('error', 'An error occurred while clearing data')
  }
}

// 生命周期
onMounted(() => {
  // 初始化主题
  themeStore.initTheme()
  // 初始化配置
  configStore.initStore()
})
</script>

<template>
  <div id="app">
    <!-- 通知系统 -->
    <div v-if="notification" class="notification" :class="`notification-${notification.type}`">
      <AlertCircle :size="20" />
      <span>{{ notification.message }}</span>
      <button @click="notification = null" class="notification-close">
        <X :size="16" />
      </button>
    </div>

    <!-- 头部栏 -->
    <header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="app-title">Claude Environment Manager</h1>
          <span class="app-subtitle">Manage your Claude Code configurations</span>
        </div>
        <div class="header-right">
          <nav class="header-nav">
            <button 
              @click="currentView = 'overview'"
              class="nav-btn"
              :class="{ active: currentView === 'overview' }"
            >
              Overview
            </button>
            <button 
              @click="currentView = 'list'"
              class="nav-btn"
              :class="{ active: currentView === 'list' }"
            >
              Configurations
            </button>
            <button 
              @click="currentView = 'settings'"
              class="nav-btn"
              :class="{ active: currentView === 'settings' }"
            >
              <Settings :size="16" />
              Settings
            </button>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="app-main">
      <div class="main-content">
        <!-- 概览页面 -->
        <div v-if="currentView === 'overview'" class="overview-view">
          <!-- 配置概览卡片 -->
          <div class="overview-section">
            <div class="card">
              <div class="card-header">
                <h2>Configuration Overview</h2>
              </div>
              <div class="card-body">
                <div class="stats-grid">
                  <div class="stat-item">
                    <div class="stat-number">{{ configStore.configCount }}</div>
                    <div class="stat-label">Total Configurations</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-number">{{ configStore.activeConfig ? '1' : '0' }}</div>
                    <div class="stat-label">Active Configuration</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-number text-primary">{{ themeStore.theme }}</div>
                    <div class="stat-label">Current Theme</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 当前活跃配置 -->
          <div class="active-config-section" v-if="configStore.activeConfig">
            <div class="card">
              <div class="card-header">
                <h2>Active Configuration</h2>
              </div>
              <div class="card-body">
                <div class="config-info">
                  <h3>{{ configStore.activeConfig.name }}</h3>
                  <p class="text-secondary" v-if="configStore.activeConfig.description">
                    {{ configStore.activeConfig.description }}
                  </p>
                  <div class="config-details mt-md">
                    <div class="detail-item">
                      <strong>API Key:</strong>
                      <span class="api-key">
                        {{ configStore.activeConfig.env.ANTHROPIC_API_KEY ? '••••••••••••' + configStore.activeConfig.env.ANTHROPIC_API_KEY.slice(-4) : 'Not set' }}
                      </span>
                    </div>
                    <div class="detail-item" v-if="configStore.activeConfig.env.ANTHROPIC_BASE_URL">
                      <strong>Base URL:</strong>
                      <span>{{ configStore.activeConfig.env.ANTHROPIC_BASE_URL }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 快速操作按钮 -->
          <div class="actions-section">
            <div class="actions-grid">
              <button @click="handleAddConfig" class="btn btn-primary action-btn">
                <Plus :size="20" />
                <span>Add New Configuration</span>
              </button>
              <button @click="handleImportConfig" class="btn btn-secondary action-btn">
                <Upload :size="20" />
                <span>Import Configuration</span>
              </button>
              <button @click="handleExportAll" class="btn btn-secondary action-btn" :disabled="!configStore.configCount">
                <Download :size="20" />
                <span>Export All</span>
              </button>
              <button @click="currentView = 'list'" class="btn btn-secondary action-btn">
                <Settings :size="20" />
                <span>Manage Configurations</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 配置列表页面 -->
        <div v-else-if="currentView === 'list'" class="list-view">
          <ConfigList
            :configs="configStore.configs"
            :loading="configStore.isLoading"
            @add-config="handleAddConfig"
            @edit-config="handleEditConfig"
            @activate-config="handleActivateConfig"
            @duplicate-config="handleDuplicateConfig"
            @delete-config="handleDeleteConfig"
            @export-config="handleExportConfig"
            @bulk-export="handleBulkExport"
            @bulk-delete="handleBulkDelete"
          />
        </div>

        <!-- 设置页面 -->
        <div v-else-if="currentView === 'settings'" class="settings-view">
          <div class="card">
            <div class="card-header">
              <h2>Application Settings</h2>
            </div>
            <div class="card-body">
              <div class="settings-grid">
                <div class="setting-item">
                  <h3>Theme</h3>
                  <p class="text-secondary">Choose your preferred color scheme</p>
                  <div class="theme-options">
                    <button 
                      @click="themeStore.setTheme('light')"
                      class="theme-option"
                      :class="{ active: themeStore.theme === 'light' }"
                    >
                      Light
                    </button>
                    <button 
                      @click="themeStore.setTheme('dark')"
                      class="theme-option"
                      :class="{ active: themeStore.theme === 'dark' }"
                    >
                      Dark
                    </button>
                    <button 
                      @click="themeStore.setTheme('auto')"
                      class="theme-option"
                      :class="{ active: themeStore.theme === 'auto' }"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                <div class="setting-item">
                  <h3>Data Management</h3>
                  <p class="text-secondary">Import and export your configurations</p>
                  <div class="setting-actions">
                    <button @click="handleImportConfig" class="btn btn-secondary">
                      <Upload :size="16" />
                      Import Configurations
                    </button>
                    <button @click="handleExportAll" class="btn btn-secondary" :disabled="!configStore.configCount">
                      <Download :size="16" />
                      Export All Configurations
                    </button>
                    <button @click="handleClearData" class="btn btn-danger">
                      <X :size="16" />
                      Clear All Data
                    </button>
                  </div>
                </div>

                <div class="setting-item">
                  <h3>About</h3>
                  <p class="text-secondary">Claude Environment Manager v0.1.0</p>
                  <p class="text-secondary">
                    A modern desktop application to manage Claude Code environment configurations.
                    Built with Tauri, Vue 3, and TypeScript.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 配置表单模态框 -->
    <ConfigForm
      v-if="isFormOpen"
      :config="editingConfig"
      :loading="configStore.isLoading"
      @submit="handleFormSubmit"
      @close="showConfigForm = false; editingConfig = null"
    />
  </div>
</template>

<style scoped>

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 通知系统 */
.notification {
  position: fixed;
  top: var(--spacing-md);
  right: var(--spacing-md);
  background-color: var(--card-background);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-lg);
  border-left: 4px solid var(--primary);
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  max-width: 400px;
  animation: slideIn 0.3s ease;
}

.notification-success {
  border-left-color: var(--secondary);
}

.notification-error {
  border-left-color: var(--danger);
}

.notification-info {
  border-left-color: var(--primary);
}

.notification-close {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
}

.notification-close:hover {
  color: var(--text-primary);
  background-color: var(--surface);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 头部栏 */
.app-header {
  background-color: var(--card-background);
  border-bottom: 1px solid var(--border-light);
  padding: var(--spacing-md) var(--spacing-lg);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.app-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.app-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.header-nav {
  display: flex;
  gap: var(--spacing-xs);
}

.nav-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.nav-btn:hover {
  color: var(--text-primary);
  background-color: var(--surface);
}

.nav-btn.active {
  color: var(--primary);
  background-color: rgba(0, 122, 255, 0.1);
}

/* 主要内容区域 */
.app-main {
  flex: 1;
  padding: var(--spacing-lg);
  background-color: var(--background);
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
}

/* 概览视图样式 */
.overview-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.overview-section .card-header h2,
.active-config-section .card-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-lg);
}

.stat-item {
  text-align: center;
  padding: var(--spacing-md);
  background-color: var(--surface);
  border-radius: var(--radius-sm);
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.config-info h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
}

.config-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 14px;
}

.detail-item strong {
  min-width: 80px;
  color: var(--text-secondary);
}

.api-key {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: var(--surface);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.actions-section {
  margin-top: var(--spacing-md);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-md);
}

.action-btn {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: 14px;
  font-weight: 500;
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

/* 设置视图样式 */
.settings-view .card-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.setting-item h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-primary);
}

.setting-item p {
  margin: 0 0 var(--spacing-md) 0;
  line-height: 1.5;
}

.theme-options {
  display: flex;
  gap: var(--spacing-sm);
}

.theme-option {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background-color: var(--card-background);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.theme-option:hover {
  border-color: var(--border);
}

.theme-option.active {
  background-color: var(--primary);
  border-color: var(--primary);
  color: white;
}

.setting-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: var(--spacing-md);
    text-align: center;
  }
  
  .header-nav {
    order: -1;
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
  
  .app-main {
    padding: var(--spacing-md);
  }
  
  .notification {
    left: var(--spacing-sm);
    right: var(--spacing-sm);
    max-width: none;
  }
  
  .setting-actions {
    flex-direction: column;
  }
  
  .theme-options {
    flex-direction: column;
  }
}
</style>