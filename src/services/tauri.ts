import { invoke } from '@tauri-apps/api/core'

export interface TauriApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface TauriClaudeConfig {
  env: Record<string, any>
  permissions: {
    allow: string[]
    deny: string[]
  }
  apiKeyHelper?: string
}

/**
 * 获取Claude配置文件路径
 */
export async function getConfigPath(): Promise<string> {
  const response: TauriApiResponse<string> = await invoke('get_config_path')
  if (!response.success) {
    throw new Error(response.error || 'Failed to get config path')
  }
  return response.data!
}

/**
 * 读取Claude配置文件
 */
export async function readClaudeConfig(): Promise<TauriClaudeConfig> {
  const response: TauriApiResponse<TauriClaudeConfig> = await invoke('read_config')
  if (!response.success) {
    throw new Error(response.error || 'Failed to read config')
  }
  return response.data!
}

/**
 * 写入Claude配置文件
 */
export async function writeClaudeConfig(config: TauriClaudeConfig): Promise<void> {
  const response: TauriApiResponse<void> = await invoke('write_config', { config })
  if (!response.success) {
    throw new Error(response.error || 'Failed to write config')
  }
}

/**
 * 备份当前配置文件
 */
export async function backupClaudeConfig(): Promise<string> {
  const response: TauriApiResponse<string> = await invoke('backup_config')
  if (!response.success) {
    throw new Error(response.error || 'Failed to backup config')
  }
  return response.data!
}

/**
 * 检查配置文件是否存在
 */
export async function configExists(): Promise<boolean> {
  const response: TauriApiResponse<boolean> = await invoke('config_exists')
  if (!response.success) {
    throw new Error(response.error || 'Failed to check config existence')
  }
  return response.data!
}

/**
 * 测试API连接
 */
export async function testConnection(apiKey: string, baseUrl?: string): Promise<boolean> {
  const response: TauriApiResponse<boolean> = await invoke('test_connection', {
    apiKey,
    baseUrl: baseUrl || null
  })
  if (!response.success) {
    throw new Error(response.error || 'Failed to test connection')
  }
  return response.data!
}