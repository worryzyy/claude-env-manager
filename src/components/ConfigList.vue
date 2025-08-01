<template>
  <div class="config-list-view">
    <!-- 搜索和筛选栏 -->
    <div class="list-header">
      <div class="search-section">
        <div class="search-bar">
          <Search :size="18" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search configurations..."
            class="search-input"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="clear-search-btn"
          >
            <X :size="16" />
          </button>
        </div>
        
        <div class="filter-section">
          <select v-model="sortBy" class="filter-select">
            <option value="name">Sort by Name</option>
            <option value="updated">Sort by Updated</option>
            <option value="created">Sort by Created</option>
          </select>
          
          <button @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'" class="sort-btn">
            <component :is="sortOrder === 'asc' ? ArrowUp : ArrowDown" :size="16" />
          </button>
        </div>
      </div>
      
      <div class="action-section">
        <button @click="showBulkActions = !showBulkActions" class="btn btn-secondary">
          <MoreHorizontal :size="16" />
          <span>Bulk Actions</span>
        </button>
        
        <button @click="$emit('add-config')" class="btn btn-primary">
          <Plus :size="16" />
          <span>Add Configuration</span>
        </button>
      </div>
    </div>

    <!-- 批量操作面板 -->
    <div v-if="showBulkActions" class="bulk-actions-panel">
      <div class="bulk-actions-content">
        <div class="bulk-selection">
          <label class="checkbox-label">
            <input
              v-model="selectAll"
              type="checkbox"
              class="checkbox"
              @change="handleSelectAll"
            />
            <span class="checkbox-custom"></span>
            Select All ({{ selectedConfigs.length }} selected)
          </label>
        </div>
        
        <div class="bulk-buttons" v-if="selectedConfigs.length > 0">
          <button @click="handleBulkExport" class="btn btn-secondary btn-sm">
            <Download :size="16" />
            Export Selected
          </button>
          
          <button @click="handleBulkDelete" class="btn btn-danger btn-sm">
            <Trash2 :size="16" />
            Delete Selected
          </button>
        </div>
      </div>
    </div>

    <!-- 配置统计 -->
    <div class="list-stats">
      <span class="stats-text">
        {{ filteredConfigs.length }} of {{ totalConfigs }} configurations
        <span v-if="searchQuery" class="search-results">
          (filtered by "{{ searchQuery }}")
        </span>
      </span>
    </div>

    <!-- 配置列表 -->
    <div class="configs-grid" v-if="filteredConfigs.length > 0">
      <div
        v-for="config in filteredConfigs"
        :key="config.id"
        class="config-item"
        :class="{ 'selected': selectedConfigs.includes(config.id) }"
      >
        <div v-if="showBulkActions" class="selection-checkbox">
          <label class="checkbox-label">
            <input
              v-model="selectedConfigs"
              :value="config.id"
              type="checkbox"
              class="checkbox"
            />
            <span class="checkbox-custom"></span>
          </label>
        </div>
        
        <ConfigCard
          :config="config"
          :loading="loadingConfigs.includes(config.id)"
          @activate="handleActivateConfig"
          @edit="handleEditConfig"
          @duplicate="handleDuplicateConfig"
          @export="handleExportConfig"
          @delete="handleDeleteConfig"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <Settings :size="48" />
      </div>
      <h3>{{ searchQuery ? 'No matching configurations' : 'No configurations yet' }}</h3>
      <p v-if="searchQuery">
        Try adjusting your search terms or 
        <button @click="searchQuery = ''" class="link-btn">clear the search</button>
      </p>
      <p v-else>
        Get started by creating your first Claude Code configuration
      </p>
      <button 
        v-if="!searchQuery"
        @click="$emit('add-config')"
        class="btn btn-primary"
      >
        <Plus :size="16" />
        Add Your First Configuration
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <Loader2 :size="32" class="animate-spin" />
        <span>Loading configurations...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Search,
  X,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Plus,
  Download,
  Trash2,
  Settings,
  Loader2
} from 'lucide-vue-next'
import ConfigCard from './ConfigCard.vue'
import type { ClaudeConfig } from '../stores/config'

interface Props {
  configs: ClaudeConfig[]
  loading?: boolean
}

interface Emits {
  (e: 'add-config'): void
  (e: 'edit-config', id: string): void
  (e: 'activate-config', id: string): void
  (e: 'duplicate-config', id: string): void
  (e: 'delete-config', id: string): void
  (e: 'export-config', id: string): void
  (e: 'bulk-export', ids: string[]): void
  (e: 'bulk-delete', ids: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 搜索和排序
const searchQuery = ref('')
const sortBy = ref<'name' | 'updated' | 'created'>('updated')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 批量操作
const showBulkActions = ref(false)
const selectedConfigs = ref<string[]>([])
const selectAll = ref(false)

// 加载状态
const loadingConfigs = ref<string[]>([])

// 计算属性
const totalConfigs = computed(() => props.configs.length)

const filteredConfigs = computed(() => {
  let filtered = props.configs.filter(config => {
    if (!searchQuery.value) return true
    
    const query = searchQuery.value.toLowerCase()
    return (
      config.name.toLowerCase().includes(query) ||
      config.description?.toLowerCase().includes(query) ||
      config.env.ANTHROPIC_BASE_URL?.toLowerCase().includes(query)
    )
  })
  
  // 排序
  filtered.sort((a, b) => {
    let aValue: string | Date
    let bValue: string | Date
    
    switch (sortBy.value) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'created':
        aValue = new Date(a.createdAt)
        bValue = new Date(b.createdAt)
        break
      case 'updated':
      default:
        aValue = new Date(a.updatedAt)
        bValue = new Date(b.updatedAt)
    }
    
    if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
  
  return filtered
})

// 事件处理
const handleActivateConfig = (id: string) => {
  loadingConfigs.value.push(id)
  emit('activate-config', id)
  
  // 模拟加载完成
  setTimeout(() => {
    loadingConfigs.value = loadingConfigs.value.filter(loadingId => loadingId !== id)
  }, 1000)
}

const handleEditConfig = (id: string) => {
  emit('edit-config', id)
}

const handleDuplicateConfig = (id: string) => {
  emit('duplicate-config', id)
}

const handleDeleteConfig = (id: string) => {
  emit('delete-config', id)
}

const handleExportConfig = (id: string) => {
  emit('export-config', id)
}

const handleSelectAll = () => {
  if (selectAll.value) {
    selectedConfigs.value = filteredConfigs.value.map(config => config.id)
  } else {
    selectedConfigs.value = []
  }
}

const handleBulkExport = () => {
  if (selectedConfigs.value.length > 0) {
    emit('bulk-export', selectedConfigs.value)
  }
}

const handleBulkDelete = () => {
  if (selectedConfigs.value.length > 0) {
    const confirmMessage = `Are you sure you want to delete ${selectedConfigs.value.length} configuration(s)? This action cannot be undone.`
    
    if (confirm(confirmMessage)) {
      emit('bulk-delete', selectedConfigs.value)
      selectedConfigs.value = []
      selectAll.value = false
    }
  }
}

// 监听选中项变化
watch(selectedConfigs, (newSelected) => {
  selectAll.value = newSelected.length === filteredConfigs.value.length && newSelected.length > 0
}, { deep: true })

// 搜索时重置选择
watch(searchQuery, () => {
  selectedConfigs.value = []
  selectAll.value = false
})
</script>

<style scoped>
.config-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.search-section {
  display: flex;
  gap: var(--spacing-md);
  flex: 1;
  min-width: 300px;
}

.search-bar {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm) 44px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background-color: var(--card-background);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  color: var(--text-primary);
  background-color: var(--surface);
}

.filter-section {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
}

.filter-select {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background-color: var(--card-background);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.sort-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background-color: var(--card-background);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-btn:hover {
  color: var(--text-primary);
  border-color: var(--border);
}

.action-section {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.bulk-actions-panel {
  background-color: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

.bulk-actions-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
}

.bulk-selection {
  display: flex;
  align-items: center;
}

.bulk-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: 14px;
  user-select: none;
}

.checkbox {
  display: none;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox:checked + .checkbox-custom {
  background-color: var(--primary);
  border-color: var(--primary);
}

.checkbox:checked + .checkbox-custom::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.list-stats {
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--border-light);
}

.stats-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.search-results {
  color: var(--primary);
}

.configs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: var(--spacing-lg);
}

.config-item {
  position: relative;
  transition: all 0.2s ease;
}

.config-item.selected {
  transform: scale(0.98);
  opacity: 0.8;
}

.selection-checkbox {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  z-index: 10;
  background-color: var(--card-background);
  border-radius: 50%;
  padding: 4px;
  box-shadow: var(--shadow-sm);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-md);
  color: var(--text-secondary);
}

.empty-icon {
  margin-bottom: var(--spacing-md);
  color: var(--text-tertiary);
}

.empty-state h3 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
  font-size: 18px;
}

.empty-state p {
  margin: 0 0 var(--spacing-md) 0;
  line-height: 1.5;
}

.link-btn {
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;
}

.link-btn:hover {
  color: var(--primary-hover);
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  color: white;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  min-height: 32px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-section {
    flex-direction: column;
    min-width: auto;
  }
  
  .action-section {
    justify-content: center;
  }
  
  .bulk-actions-content {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .configs-grid {
    grid-template-columns: 1fr;
  }
  
  .config-item {
    margin: 0 -var(--spacing-sm);
  }
}
</style>