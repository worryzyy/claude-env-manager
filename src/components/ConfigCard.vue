<template>
  <div class="config-card" :class="{ 'active': config.isActive }">
    <div class="card-header">
      <div class="config-info">
        <h3 class="config-name">{{ config.name }}</h3>
        <p class="config-description" v-if="config.description">{{ config.description }}</p>
      </div>
      <div class="config-status">
        <div class="status-badge" :class="{ 'active': config.isActive }">
          {{ config.isActive ? 'Active' : 'Inactive' }}
        </div>
      </div>
    </div>
    
    <div class="card-body">
      <div class="config-details">
        <div class="detail-row">
          <span class="detail-label">API Key:</span>
          <span class="detail-value api-key">
            {{ config.env.ANTHROPIC_API_KEY ? '••••••••••••' + config.env.ANTHROPIC_API_KEY.slice(-4) : 'Not set' }}
          </span>
        </div>
        <div class="detail-row" v-if="config.env.ANTHROPIC_BASE_URL">
          <span class="detail-label">Base URL:</span>
          <span class="detail-value">{{ config.env.ANTHROPIC_BASE_URL }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Last Updated:</span>
          <span class="detail-value">{{ formatDate(config.updatedAt) }}</span>
        </div>
      </div>
    </div>
    
    <div class="card-footer">
      <div class="action-buttons">
        <button 
          v-if="!config.isActive"
          @click="$emit('activate', config.id)"
          class="btn btn-primary btn-sm"
          :disabled="loading || !isUsingTauri"
          :title="isUsingTauri ? 'Activate this configuration' : 'Activation only works in desktop version'"
        >
          <Zap :size="16" />
          <span>{{ isUsingTauri ? 'Activate' : 'Activate (Desktop Only)' }}</span>
        </button>
        
        <button 
          @click="$emit('edit', config.id)"
          class="btn btn-secondary btn-sm"
        >
          <Edit :size="16" />
          <span>Edit</span>
        </button>
        
        <button 
          @click="$emit('duplicate', config.id)"
          class="btn btn-secondary btn-sm"
        >
          <Copy :size="16" />
          <span>Duplicate</span>
        </button>
        
        <button 
          @click="$emit('export', config.id)"
          class="btn btn-secondary btn-sm"
        >
          <Download :size="16" />
          <span>Export</span>
        </button>
        
        <button 
          @click="handleDelete"
          class="btn btn-danger btn-sm"
          :disabled="config.isActive || loading"
        >
          <Trash2 :size="16" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { Zap, Edit, Copy, Download, Trash2 } from 'lucide-vue-next'
import type { ClaudeConfig } from '../stores/config'

interface Props {
  config: ClaudeConfig
  loading?: boolean
}

interface Emits {
  (e: 'activate', id: string): void
  (e: 'edit', id: string): void
  (e: 'duplicate', id: string): void
  (e: 'export', id: string): void
  (e: 'delete', id: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 检测是否在Tauri环境中
const isUsingTauri = computed(() => {
  return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined
})

const showDeleteConfirm = ref(false)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleDelete = () => {
  if (showDeleteConfirm.value) {
    emit('delete', props.config.id)
    showDeleteConfirm.value = false
  } else {
    showDeleteConfirm.value = true
    // 3秒后自动取消确认状态
    setTimeout(() => {
      showDeleteConfirm.value = false
    }, 3000)
  }
}
</script>

<style scoped>
.config-card {
  background-color: var(--card-background);
  border-radius: var(--radius-md);
  border: 2px solid var(--border-light);
  transition: all 0.3s ease;
  overflow: hidden;
}

.config-card:hover {
  border-color: var(--border);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.config-card.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary), var(--shadow-md);
}

.config-card.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  position: relative;
}

.config-info {
  flex: 1;
}

.config-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-primary);
}

.config-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.config-status {
  margin-left: var(--spacing-md);
}

.status-badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: var(--surface);
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
}

.status-badge.active {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

.card-body {
  padding: var(--spacing-md);
}

.config-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.detail-label {
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 100px;
}

.detail-value {
  color: var(--text-primary);
  text-align: right;
  flex: 1;
  margin-left: var(--spacing-md);
}

.api-key {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: var(--surface);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.card-footer {
  padding: var(--spacing-md);
  background-color: var(--surface);
  border-top: 1px solid var(--border-light);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-sm span {
  display: none;
}

/* 在较大屏幕上显示按钮文字 */
@media (min-width: 640px) {
  .btn-sm span {
    display: inline;
  }
  
  .action-buttons {
    flex-wrap: nowrap;
  }
}

/* 删除确认状态 */
.btn-danger.confirm {
  background-color: var(--warning);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .card-header {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .config-status {
    margin-left: 0;
    align-self: flex-start;
  }
  
  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
  
  .detail-value {
    text-align: left;
    margin-left: 0;
  }
  
  .action-buttons {
    justify-content: center;
  }
}
</style>