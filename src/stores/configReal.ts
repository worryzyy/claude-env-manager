import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  readClaudeConfig, 
  writeClaudeConfig, 
  backupClaudeConfig, 
  configExists,
  testConnection,
  getConfigPath,
  type TauriClaudeConfig 
} from '../services/tauri'

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
  
  // 计算属性
  const activeConfig = computed(() => {
    return configs.value.find(config => config.id === activeConfigId.value) || null
  })
  
  const configCount = computed(() => configs.value.length)
  
  // 工具函数
  const generateId = () => {
    return 'config_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
  
  const convertToTauriConfig = (config: ClaudeConfig): TauriClaudeConfig => {
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
  
  const convertFromTauriConfig = (tauriConfig: TauriClaudeConfig, name: string = 'Current Configuration'): ClaudeConfig => {
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
  
  // 初始化
  const initStore = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      // 获取配置文件路径
      configPath.value = await getConfigPath()
      
      // 检查Claude配置文件是否存在
      hasClaudeConfig.value = await configExists()
      
      // 加载本地管理的配置
      loadFromLocalStorage()
      
      // 如果存在Claude配置文件，将其加载为当前配置
      if (hasClaudeConfig.value) {
        try {
          const claudeConfig = await readClaudeConfig()
          const currentConfig = convertFromTauriConfig(claudeConfig)
          
          // 检查是否已经存在current配置
          const existingIndex = configs.value.findIndex(c => c.id === 'current')
          if (existingIndex >= 0) {
            configs.value[existingIndex] = currentConfig
          } else {
            configs.value.unshift(currentConfig)
          }
          
          activeConfigId.value = 'current'
          saveToLocalStorage()
        } catch (err) {
          console.warn('Failed to load Claude config:', err)
        }
      }
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize'
    } finally {
      isLoading.value = false
    }
  }
  
  // 应用配置到Claude
  const applyConfigToClause = async (config: ClaudeConfig) => {
    isLoading.value = true
    error.value = null
    
    try {
      const tauriConfig = convertToTauriConfig(config)
      await writeClaudeConfig(tauriConfig)
      
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
  
  // 备份当前Claude配置
  const backupCurrentConfig = async () => {
    try {
      const backupPath = await backupClaudeConfig()
      return backupPath
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to backup configuration'
      throw err
    }
  }
  
  // 测试连接
  const testConfigConnection = async (config: ClaudeConfig) => {
    try {
      return await testConnection(
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
    applyConfigToClause,
    backupCurrentConfig,
    testConfigConnection
  }
})