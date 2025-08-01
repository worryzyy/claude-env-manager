// 检测是否在Tauri环境中运行
export const isTauri = () => {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined
}

// 动态导入正确的配置store
export const useConfigStore = async () => {
  if (isTauri()) {
    const { useConfigStore: useRealConfigStore } = await import('./configReal')
    return useRealConfigStore()
  } else {
    const { useConfigStore: useMockConfigStore } = await import('./config')
    return useMockConfigStore()
  }
}