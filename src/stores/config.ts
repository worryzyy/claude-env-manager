import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 检测是否在Tauri环境中运行
const isTauri = () => {
  return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined
}

// 动态导入Tauri API
let tauriAPI: any = null
const initTauriAPI = async () => {
  if (isTauri() && !tauriAPI) {
    try {
      tauriAPI = await import('../services/tauri')
    } catch (error) {
      console.warn('Failed to load Tauri API:', error)
    }
  }
}

export interface ClaudeConfig {
  id: string
  name: string
  description?: string
  env: {
    ANTHROPIC_API_KEY: string
    ANTHROPIC_BASE_URL?: string
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: number
  }
  permissions?: {
    allow: string[]
    deny: string[]
  }
  apiKeyHelper?: string
  isActive?: boolean
  createdAt: string
  updatedAt: string
}

// 用于管理多个配置的本地存储接口
interface ConfigManager {
  configs: ClaudeConfig[]
  activeConfigId: string | null
  version: string
}

export const useConfigStore = defineStore('config', () => {
  // 状态
  const configs = ref<ClaudeConfig[]>([])
  const activeConfigId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const configPath = ref<string>('')
  const hasClaudeConfig = ref(false)
  const isUsingTauri = ref(false)
  
  // 计算属性
  const activeConfig = computed(() => {
    const config = configs.value.find(config => config.id === activeConfigId.value)
    if (config) {
      // 确保isActive属性正确设置
      configs.value.forEach(c => c.isActive = c.id === activeConfigId.value)
    }
    return config || null
  })
  
  const configCount = computed(() => configs.value.length)
  
  // 工具函数
  const generateId = () => {
    return 'config_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
  
  // 本地存储管理
  const saveToLocalStorage = () => {
    try {
      const data: ConfigManager = {
        configs: configs.value,
        activeConfigId: activeConfigId.value,
        version: '1.0.0'
      }
      localStorage.setItem('claude-config-manager', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }
  
  const loadFromLocalStorage = () => {
    try {
      const data = localStorage.getItem('claude-config-manager')
      if (data) {
        const parsed: ConfigManager = JSON.parse(data)
        configs.value = parsed.configs || []
        activeConfigId.value = parsed.activeConfigId
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
    }
  }
  
  // 清理localStorage中的旧数据
  const clearLocalStorage = () => {
    try {
      localStorage.removeItem('claude-config-manager')
      configs.value = []
      activeConfigId.value = null
    } catch (error) {
      console.error('Failed to clear localStorage:', error)
    }
  }
  
  // Tauri文件操作函数
  const convertToTauriConfig = (config: ClaudeConfig) => {
    return {
      env: {
        ANTHROPIC_API_KEY: config.env.ANTHROPIC_API_KEY,
        ANTHROPIC_BASE_URL: config.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: config.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC || 0
      },
      permissions: config.permissions || { allow: [], deny: [] },
      apiKeyHelper: config.apiKeyHelper
    }
  }
  
  const convertFromTauriConfig = (tauriConfig: any, name: string = 'Current Configuration'): ClaudeConfig => {
    return {
      id: 'current',
      name,
      env: {
        ANTHROPIC_API_KEY: tauriConfig.env.ANTHROPIC_API_KEY || '',
        ANTHROPIC_BASE_URL: tauriConfig.env.ANTHROPIC_BASE_URL,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: tauriConfig.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
      },
      permissions: tauriConfig.permissions,
      apiKeyHelper: tauriConfig.apiKeyHelper,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
  
  // 应用配置到Claude（仅在Tauri环境中）
  const applyConfigToClause = async (config: ClaudeConfig) => {
    if (!isUsingTauri.value || !tauriAPI) return true
    
    isLoading.value = true
    error.value = null
    
    try {
      const tauriConfig = convertToTauriConfig(config)
      await tauriAPI.writeClaudeConfig(tauriConfig)
      
      // 更新当前配置状态
      configs.value.forEach(c => c.isActive = false)
      config.isActive = true
      activeConfigId.value = config.id
      
      // 如果不是current配置，需要创建/更新current配置
      if (config.id !== 'current') {
        const currentConfig = convertFromTauriConfig(tauriConfig, config.name)
        const existingIndex = configs.value.findIndex(c => c.id === 'current')
        if (existingIndex >= 0) {
          configs.value[existingIndex] = currentConfig
        } else {
          configs.value.unshift(currentConfig)
        }
      }
      
      saveToLocalStorage()
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to apply configuration'
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  // 初始化方法
  const initStore = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      // 检测并初始化Tauri API
      isUsingTauri.value = isTauri()
      if (isUsingTauri.value) {
        await initTauriAPI()
        
        if (tauriAPI) {
          // 获取配置文件路径
          configPath.value = await tauriAPI.getConfigPath()
          
          // 检查Claude配置文件是否存在
          hasClaudeConfig.value = await tauriAPI.configExists()
          
          // 如果存在Claude配置文件，将其加载为当前配置
          if (hasClaudeConfig.value) {
            try {
              const claudeConfig = await tauriAPI.readClaudeConfig()
              const currentConfig = convertFromTauriConfig(claudeConfig)
              
              // 清理localStorage中的旧数据，只保留真实配置
              clearLocalStorage()
              
              // 添加当前真实配置
              configs.value = [currentConfig]
              activeConfigId.value = 'current'
              saveToLocalStorage()
            } catch (err) {
              console.warn('Failed to load Claude config:', err)
            }
          } else {
            // 如果没有Claude配置文件，清理所有数据
            clearLocalStorage()
          }
        }
      } else {
        // Web环境，清理localStorage中的假数据
        clearLocalStorage()
      }
      
      // 如果还没有加载任何配置，尝试从localStorage加载（但现在应该是空的）
      if (configs.value.length === 0 && hasClaudeConfig.value === false) {
        loadFromLocalStorage()
      }
      
      // 如果没有任何配置，保持空状态，让用户手动创建
      // 不创建任何示例或假数据
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize'
    } finally {
      isLoading.value = false
    }
  }
  
  // 添加配置
  const addConfig = (config: Omit<ClaudeConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newConfig: ClaudeConfig = {
      ...config,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    configs.value.push(newConfig)
    saveToLocalStorage()
    return newConfig.id
  }
  
  // 更新配置
  const updateConfig = (id: string, updates: Partial<ClaudeConfig>) => {
    const index = configs.value.findIndex(config => config.id === id)
    if (index === -1) return false
    
    configs.value[index] = {
      ...configs.value[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    saveToLocalStorage()
    return true
  }
  
  // 删除配置
  const deleteConfig = (id: string) => {
    const index = configs.value.findIndex(config => config.id === id)
    if (index === -1) return false
    
    // 不允许删除当前活跃的配置
    if (configs.value[index].isActive) return false
    
    configs.value.splice(index, 1)
    
    // 如果删除的是当前选中的配置，重置选择
    if (activeConfigId.value === id) {
      activeConfigId.value = null
    }
    
    saveToLocalStorage()
    return true
  }
  
  // 设置活跃配置
  const setActiveConfig = async (id: string) => {
    const config = configs.value.find(c => c.id === id)
    if (!config) return false
    
    return await applyConfigToClause(config)
  }
  
  // 复制配置
  const duplicateConfig = (id: string) => {
    const config = configs.value.find(c => c.id === id)
    if (!config) return null
    
    const duplicated = {
      ...config,
      name: `${config.name} (Copy)`,
      isActive: false
    }
    
    delete (duplicated as any).id
    delete (duplicated as any).createdAt
    delete (duplicated as any).updatedAt
    
    return addConfig(duplicated)
  }
  
  // 导出配置
  const exportConfig = (id: string) => {
    const config = configs.value.find(c => c.id === id)
    if (!config) return null
    
    // 移除内部字段，只导出必要的配置信息
    const { id: configId, isActive, createdAt, updatedAt, ...exportData } = config
    return exportData
  }
  
  // 导出所有配置
  const exportAllConfigs = () => {
    return configs.value.map(config => {
      const { id, isActive, createdAt, updatedAt, ...exportData } = config
      return exportData
    })
  }
  
  // 导入配置
  const importConfig = (configData: any) => {
    try {
      // 验证配置数据结构
      if (!configData.name || !configData.env || !configData.env.ANTHROPIC_API_KEY) {
        return null
      }
      
      return addConfig({
        name: configData.name,
        description: configData.description,
        env: configData.env,
        permissions: configData.permissions,
        apiKeyHelper: configData.apiKeyHelper
      })
    } catch (error) {
      console.error('Failed to import config:', error)
      return null
    }
  }
  
  // 备份当前Claude配置（仅在Tauri环境中）
  const backupCurrentConfig = async () => {
    if (!isUsingTauri.value || !tauriAPI) {
      throw new Error('Backup is only available in desktop version')
    }
    
    try {
      const backupPath = await tauriAPI.backupClaudeConfig()
      return backupPath
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to backup configuration'
      throw err
    }
  }
  
  // 测试连接（仅在Tauri环境中）
  const testConfigConnection = async (config: ClaudeConfig) => {
    if (!isUsingTauri.value || !tauriAPI) {
      // 在Web环境中，只做简单的API Key格式验证
      return config.env.ANTHROPIC_API_KEY.startsWith('sk-') && config.env.ANTHROPIC_API_KEY.length > 10
    }
    
    try {
      return await tauriAPI.testConnection(
        config.env.ANTHROPIC_API_KEY,
        config.env.ANTHROPIC_BASE_URL
      )
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to test connection'
      return false
    }
  }
  
  return {
    // 状态
    configs,
    activeConfigId,
    activeConfig,
    configCount,
    isLoading,
    error,
    configPath,
    hasClaudeConfig,
    isUsingTauri,
    
    // 方法
    initStore,
    addConfig,
    updateConfig,
    deleteConfig,
    setActiveConfig,
    duplicateConfig,
    exportConfig,
    exportAllConfigs,
    importConfig,
    backupCurrentConfig,
    testConfigConnection,
    clearLocalStorage
  }
})