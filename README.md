# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

开发一个动态切换 Claude Code 环境变量的工具，支持用户在不同模型供应商服务之间快速切换配置。采用现代化 UI 设计，遵循 iOS 设计原则。

## MVP 版本功能需求

### 1. 配置文件管理

- 支持多套 Claude Code 配置文件的存储和切换
- 配置文件格式遵循 Claude Code 标准：

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "sk-xxx",
    "ANTHROPIC_BASE_URL": "https://xxx",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
  },
  "permissions": {
    "allow": [],
    "deny": []
  },
  "apiKeyHelper": "echo 'xxx'"
}
```

### 2. 跨平台路径处理

- Windows: `%APPDATA%\.claude\settings.json`
- macOS: `~/.claude/settings.json`
- Linux: `~/.claude/settings.json`

### 3. 现代化用户界面

- 配置文件的增删改查
- 快速切换不同配置方案
- 安全的 API Key 输入和管理
- 配置方案的命名、导入导出功能
- **支持多主题切换**（浅色/深色/自动）
- **遵循 iOS 设计原则**：简洁、优雅、直观

### 4. 基础功能

- 配置连接测试和验证
- 配置文件备份与恢复
- 导入导出功能

## 技术架构

### 推荐技术栈：Tauri + Vue3 + TypeScript

- **Tauri**：轻量级跨平台桌面应用框架
- **Vue3**：现代前端框架，组合式 API
- **TypeScript**：类型安全
- **Pinia**：状态管理
- **Vite**：快速构建工具

### 核心模块设计

1. **配置管理模块** (`src/stores/config.ts`)

   - 配置文件读写和验证
   - 配置方案管理
   - 配置切换逻辑

2. **UI 组件模块** (`src/components/`)

   - 配置卡片组件
   - 表单输入组件
   - 主题切换组件

3. **路径解析模块** (`src/utils/path.ts`)

   - 跨平台配置文件路径处理
   - 环境检测和路径生成

4. **安全模块** (`src-tauri/src/keychain.rs`)
   - API Key 安全存储（系统密钥链集成）
   - 敏感信息加密处理

## UI 设计规范

### iOS 设计原则实现

- **简洁性**：清晰的层次结构，最小化视觉干扰
- **一致性**：统一的组件样式和交互模式
- **反馈性**：清晰的状态反馈和动画效果
- **可访问性**：支持键盘导航和屏幕阅读器

### 主题配色方案

```css
/* 浅色主题 */
--primary: #007aff; /* iOS蓝 */
--secondary: #34c759; /* iOS绿 */
--accent: #ff9500; /* iOS橙 */
--background: #ffffff;
--surface: #f2f2f7;
--text-primary: #000000;
--text-secondary: #8e8e93;

/* 深色主题 */
--primary: #0a84ff;
--secondary: #30d158;
--accent: #ff9f0a;
--background: #000000;
--surface: #1c1c1e;
--text-primary: #ffffff;
--text-secondary: #8e8e93;
```

### 组件设计要求

- **卡片组件**：圆角 12px，微妙阴影，悬停动效
- **按钮**：遵循 iOS 按钮样式，支持主要/次要/危险状态
- **输入框**：清晰边框，聚焦状态有蓝色边框
- **开关切换**：iOS 风格的滑动开关
- **加载状态**：优雅的骨架屏或 Loading 动画

## 项目结构

```
claude-switch/
├── src-tauri/              # Rust后端
│   ├── src/
│   │   ├── config.rs       # 配置文件操作
│   │   ├── keychain.rs     # 系统密钥链
│   │   ├── path.rs         # 路径处理
│   │   └── main.rs         # 入口文件
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                    # Vue前端
│   ├── components/         # UI组件
│   │   ├── ConfigCard.vue
│   │   ├── ConfigForm.vue
│   │   ├── ThemeToggle.vue
│   │   └── StatusBadge.vue
│   ├── views/             # 页面组件
│   │   ├── Home.vue
│   │   ├── Settings.vue
│   │   └── About.vue
│   ├── stores/            # Pinia状态管理
│   │   ├── config.ts
│   │   └── theme.ts
│   ├── utils/             # 工具函数
│   │   ├── validation.ts
│   │   └── constants.ts
│   ├── styles/            # 样式文件
│   │   ├── variables.css
│   │   ├── themes.css
│   │   └── components.css
│   ├── App.vue
│   └── main.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 开发阶段规划

### 阶段 1：核心功能开发

- [x] 项目初始化和基础架构
- [ ] 配置文件 CRUD 操作
- [ ] 跨平台路径处理
- [ ] 基础 UI 组件开发
- [ ] 主题切换功能

### 阶段 2：功能完善

- [ ] API Key 安全存储
- [ ] 配置连接测试
- [ ] 导入导出功能
- [ ] 错误处理和用户反馈

### 阶段 3：UI 优化和测试（

- [ ] UI 动效和交互优化
- [ ] 跨平台测试
- [ ] 性能优化
- [ ] 用户体验测试

## 开发命令

```bash
# 项目初始化
pnpm create tauri-app claude-switch --template vue-ts
cd claude-switch

# 安装依赖
pnpm install
pnpm add pinia @vueuse/core lucide-vue-next

# 开发环境启动 (Vite热重载 + Tauri)
pnpm tauri dev

# 构建应用 (跨平台打包)
pnpm tauri build

# 构建特定平台
pnpm tauri build -- --target x86_64-pc-windows-msvc     # Windows
pnpm tauri build -- --target x86_64-apple-darwin        # macOS Intel
pnpm tauri build -- --target aarch64-apple-darwin       # macOS M1/M2
pnpm tauri build -- --target x86_64-unknown-linux-gnu   # Linux

# 代码检查
pnpm lint

# 类型检查
pnpm type-check

# 依赖更新
pnpm update
```

## 关键技术实现要点

### 配置文件操作（Rust 端）

- 使用 `serde_json` 进行 JSON 序列化
- 使用 `dirs` crate 获取系统目录
- 使用 `keyring` crate 集成系统密钥链

### 主题切换实现

- CSS 变量动态切换
- 系统主题检测（prefers-color-scheme）
- 主题偏好持久化存储

### 安全考虑

- API Key 通过系统密钥链存储，不存储在配置文件中
- 配置文件权限控制（仅当前用户可读写）
- 敏感信息在内存中的生命周期管理
