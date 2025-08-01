mod config;

use config::{ClaudeConfig, read_claude_config, write_claude_config, backup_claude_config, get_claude_config_path};
use serde_json::Value;
use std::collections::HashMap;

#[derive(serde::Serialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

impl<T> ApiResponse<T> {
    fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }
    
    fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message),
        }
    }
}

/// 获取Claude配置文件路径
#[tauri::command]
fn get_config_path() -> ApiResponse<String> {
    match get_claude_config_path() {
        Ok(path) => ApiResponse::success(path.to_string_lossy().to_string()),
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

/// 读取Claude配置
#[tauri::command]
fn read_config() -> ApiResponse<ClaudeConfig> {
    match read_claude_config() {
        Ok(config) => ApiResponse::success(config),
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

/// 写入Claude配置
#[tauri::command]
fn write_config(config: ClaudeConfig) -> ApiResponse<()> {
    match write_claude_config(&config) {
        Ok(_) => ApiResponse::success(()),
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

/// 备份当前配置
#[tauri::command]
fn backup_config() -> ApiResponse<String> {
    match backup_claude_config() {
        Ok(backup_path) => ApiResponse::success(backup_path.to_string_lossy().to_string()),
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

/// 检查配置文件是否存在
#[tauri::command]
fn config_exists() -> ApiResponse<bool> {
    match get_claude_config_path() {
        Ok(path) => ApiResponse::success(path.exists()),
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

/// 测试API连接
#[tauri::command]
async fn test_connection(api_key: String, base_url: Option<String>) -> ApiResponse<bool> {
    // 这里可以添加实际的API连接测试逻辑
    // 目前只是简单验证API密钥格式
    let is_valid = api_key.starts_with("sk-") && api_key.len() > 10;
    ApiResponse::success(is_valid)
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_config_path,
            read_config,
            write_config,
            backup_config,
            config_exists,
            test_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
