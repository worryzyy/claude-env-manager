use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use anyhow::{Result, Context};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeConfig {
    pub env: HashMap<String, serde_json::Value>,
    pub permissions: Permissions,
    #[serde(rename = "apiKeyHelper")]
    pub api_key_helper: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permissions {
    pub allow: Vec<String>,
    pub deny: Vec<String>,
}

impl Default for Permissions {
    fn default() -> Self {
        Self {
            allow: vec![],
            deny: vec![],
        }
    }
}

impl Default for ClaudeConfig {
    fn default() -> Self {
        let mut env = HashMap::new();
        env.insert("ANTHROPIC_API_KEY".to_string(), serde_json::Value::String("".to_string()));
        env.insert("ANTHROPIC_BASE_URL".to_string(), serde_json::Value::String("https://api.anthropic.com".to_string()));
        env.insert("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC".to_string(), serde_json::Value::Number(serde_json::Number::from(0)));

        Self {
            env,
            permissions: Permissions::default(),
            api_key_helper: None,
        }
    }
}

/// 获取Claude配置文件路径
pub fn get_claude_config_path() -> Result<PathBuf> {
    let home_dir = dirs::home_dir()
        .context("无法获取用户主目录")?;
    
    #[cfg(target_os = "windows")]
    let config_dir = dirs::config_dir()
        .context("无法获取配置目录")?;
    
    #[cfg(not(target_os = "windows"))]
    let config_dir = home_dir.clone();
    
    let claude_dir = config_dir.join(".claude");
    let config_path = claude_dir.join("settings.json");
    
    // 确保目录存在
    if !claude_dir.exists() {
        fs::create_dir_all(&claude_dir)
            .context("无法创建.claude目录")?;
    }
    
    Ok(config_path)
}

/// 读取Claude配置文件
pub fn read_claude_config() -> Result<ClaudeConfig> {
    let config_path = get_claude_config_path()?;
    
    if !config_path.exists() {
        // 如果文件不存在，返回默认配置
        return Ok(ClaudeConfig::default());
    }
    
    let content = fs::read_to_string(&config_path)
        .with_context(|| format!("无法读取配置文件: {}", config_path.display()))?;
    
    let config: ClaudeConfig = serde_json::from_str(&content)
        .with_context(|| format!("无法解析配置文件: {}", config_path.display()))?;
    
    Ok(config)
}

/// 写入Claude配置文件
pub fn write_claude_config(config: &ClaudeConfig) -> Result<()> {
    let config_path = get_claude_config_path()?;
    
    let content = serde_json::to_string_pretty(config)
        .context("无法序列化配置")?;
    
    fs::write(&config_path, content)
        .with_context(|| format!("无法写入配置文件: {}", config_path.display()))?;
    
    Ok(())
}

/// 备份当前配置文件
pub fn backup_claude_config() -> Result<PathBuf> {
    let config_path = get_claude_config_path()?;
    
    if !config_path.exists() {
        return Err(anyhow::anyhow!("配置文件不存在，无法备份"));
    }
    
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let backup_path = config_path.parent()
        .unwrap()
        .join(format!("settings_backup_{}.json", timestamp));
    
    fs::copy(&config_path, &backup_path)
        .with_context(|| format!("无法备份配置文件到: {}", backup_path.display()))?;
    
    Ok(backup_path)
}