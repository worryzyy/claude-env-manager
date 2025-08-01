<template>
  <div class="config-form-overlay" @click="handleOverlayClick">
    <div class="config-form-modal" @click.stop>
      <div class="modal-header">
        <h2>{{ isEdit ? 'Edit Configuration' : 'Add New Configuration' }}</h2>
        <button @click="$emit('close')" class="close-btn">
          <X :size="20" />
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="modal-body">
        <div class="form-section">
          <h3>Basic Information</h3>
          <div class="form-group">
            <label for="name">Configuration Name *</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              class="input"
              placeholder="e.g., OpenAI GPT-4, Anthropic Claude"
              required
              :class="{ 'error': errors.name }"
            />
            <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
          </div>
          
          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="form.description"
              class="input textarea"
              placeholder="Optional description for this configuration"
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="form-section">
          <h3>Environment Variables</h3>
          <div class="form-group">
            <label for="apiKey">API Key *</label>
            <div class="input-with-toggle">
              <input
                id="apiKey"
                v-model="form.env.ANTHROPIC_API_KEY"
                :type="showApiKey ? 'text' : 'password'"
                class="input"
                placeholder="sk-ant-api03-..."
                required
                :class="{ 'error': errors.apiKey }"
              />
              <button
                type="button"
                @click="showApiKey = !showApiKey"
                class="toggle-visibility-btn"
                :title="showApiKey ? 'Hide API Key' : 'Show API Key'"
              >
                <component :is="showApiKey ? EyeOff : Eye" :size="18" />
              </button>
            </div>
            <span v-if="errors.apiKey" class="error-message">{{ errors.apiKey }}</span>
          </div>
          
          <div class="form-group">
            <label for="baseUrl">Base URL</label>
            <input
              id="baseUrl"
              v-model="form.env.ANTHROPIC_BASE_URL"
              type="url"
              class="input"
              placeholder="https://api.anthropic.com"
            />
            <small class="form-help">Leave empty to use default endpoint</small>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="form.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"
                type="checkbox"
                class="checkbox"
              />
              <span class="checkbox-custom"></span>
              Disable Non-essential Traffic
            </label>
            <small class="form-help">Reduces analytics and telemetry data</small>
          </div>
        </div>

        <div class="form-section">
          <h3>Permissions (Optional)</h3>
          <div class="permissions-grid">
            <div class="form-group">
              <label for="allowList">Allow List</label>
              <textarea
                id="allowList"
                v-model="allowListText"
                class="input textarea"
                placeholder="Enter allowed permissions, one per line"
                rows="4"
              ></textarea>
            </div>
            
            <div class="form-group">
              <label for="denyList">Deny List</label>
              <textarea
                id="denyList"
                v-model="denyListText"
                class="input textarea"
                placeholder="Enter denied permissions, one per line"
                rows="4"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Advanced Settings</h3>
          <div class="form-group">
            <label for="apiKeyHelper">API Key Helper Command</label>
            <input
              id="apiKeyHelper"
              v-model="form.apiKeyHelper"
              type="text"
              class="input"
              placeholder="echo 'your-api-key'"
            />
            <small class="form-help">Command to retrieve API key dynamically</small>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" @click="$emit('close')" class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading || !isFormValid">
            <Loader2 v-if="loading" :size="16" class="animate-spin" />
            <span>{{ isEdit ? 'Update Configuration' : 'Create Configuration' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { X, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import type { ClaudeConfig } from '../stores/config'

interface Props {
  config?: ClaudeConfig
  loading?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'submit', data: Partial<ClaudeConfig>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isEdit = computed(() => !!props.config)
const showApiKey = ref(false)

// 表单数据
const form = ref({
  name: '',
  description: '',
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 0
  },
  permissions: {
    allow: [] as string[],
    deny: [] as string[]
  },
  apiKeyHelper: ''
})

// 权限列表的文本表示
const allowListText = ref('')
const denyListText = ref('')

// 错误信息
const errors = ref({
  name: '',
  apiKey: ''
})

// 表单验证
const isFormValid = computed(() => {
  return form.value.name.trim() && 
         form.value.env.ANTHROPIC_API_KEY.trim() && 
         !errors.value.name && 
         !errors.value.apiKey
})

// 验证表单
const validateForm = () => {
  errors.value = { name: '', apiKey: '' }
  
  if (!form.value.name.trim()) {
    errors.value.name = 'Configuration name is required'
  }
  
  if (!form.value.env.ANTHROPIC_API_KEY.trim()) {
    errors.value.apiKey = 'API Key is required'
  } else if (!form.value.env.ANTHROPIC_API_KEY.startsWith('sk-')) {
    errors.value.apiKey = 'API Key should start with "sk-"'
  }
}

// 处理表单提交
const handleSubmit = () => {
  validateForm()
  
  if (!isFormValid.value) {
    return
  }
  
  // 转换权限列表
  const allowList = allowListText.value
    .split('\n')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    
  const denyList = denyListText.value
    .split('\n')
    .map(item => item.trim())
    .filter(item => item.length > 0)
  
  const configData = {
    ...form.value,
    permissions: {
      allow: allowList,
      deny: denyList
    },
    env: {
      ...form.value.env,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: form.value.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC ? 1 : 0
    }
  }
  
  emit('submit', configData)
}

// 处理覆盖层点击
const handleOverlayClick = () => {
  emit('close')
}

// 监听权限文本变化
watch([allowListText, denyListText], () => {
  // 实时更新权限数组
  form.value.permissions.allow = allowListText.value
    .split('\n')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    
  form.value.permissions.deny = denyListText.value
    .split('\n')
    .map(item => item.trim())
    .filter(item => item.length > 0)
})

// 初始化表单数据
onMounted(() => {
  if (props.config) {
    form.value = {
      name: props.config.name,
      description: props.config.description || '',
      env: { ...props.config.env },
      permissions: { ...props.config.permissions },
      apiKeyHelper: props.config.apiKeyHelper || ''
    }
    
    // 设置权限文本
    allowListText.value = props.config.permissions?.allow?.join('\n') || ''
    denyListText.value = props.config.permissions?.deny?.join('\n') || ''
  }
})

// ESC键关闭模态框
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.config-form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.config-form-modal {
  background-color: var(--card-background);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
  background-color: var(--surface);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: var(--border-light);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
}

.form-section {
  margin-bottom: var(--spacing-xl);
}

.form-section h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-light);
  padding-bottom: var(--spacing-sm);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.textarea {
  min-height: 80px;
  resize: vertical;
}

.input-with-toggle {
  position: relative;
}

.toggle-visibility-btn {
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

.toggle-visibility-btn:hover {
  color: var(--text-primary);
  background-color: var(--surface);
}

.input.error {
  border-color: var(--danger);
}

.error-message {
  display: block;
  margin-top: var(--spacing-xs);
  font-size: 12px;
  color: var(--danger);
}

.form-help {
  display: block;
  margin-top: var(--spacing-xs);
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: 14px;
  font-weight: normal;
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

.permissions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.modal-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-light);
  background-color: var(--surface);
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .config-form-overlay {
    padding: var(--spacing-sm);
  }
  
  .config-form-modal {
    max-height: 95vh;
  }
  
  .permissions-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-footer {
    flex-direction: column-reverse;
  }
  
  .modal-footer .btn {
    width: 100%;
  }
}
</style>