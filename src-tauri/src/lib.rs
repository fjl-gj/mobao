use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};

// ---------- 数据结构 ----------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChapterEntry {
    pub name: String,
    pub relative_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VolumeEntry {
    pub name: String,
    pub chapters: Vec<ChapterEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NovelStructure {
    pub mode: String,
    pub prologue: Option<ChapterEntry>,
    pub volumes: Vec<VolumeEntry>,
    pub root_chapters: Vec<ChapterEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

// ---------- 命令实现 ----------

fn is_prologue(name: &str) -> bool {
    let lower = name.to_lowercase().replace(".md", "").replace(".txt", "");
    lower == "小序" || lower == "序章" || lower == "楔子" || lower == "prologue"
}

fn is_text_file(name: &str) -> bool {
    name.ends_with(".md") || name.ends_with(".txt")
}

fn is_ignored_dir(name: &str) -> bool {
    name.starts_with(".") || name == "assets"
}

fn resolve_in_root(root_path: &str, relative_path: &str) -> Result<PathBuf, String> {
    let relative = Path::new(relative_path);
    for component in relative.components() {
        match component {
            Component::Normal(_) | Component::CurDir => {}
            _ => return Err("路径不能包含越界或绝对路径片段".into()),
        }
    }
    Ok(Path::new(root_path).join(relative))
}

/// 扫描小说目录，返回完整结构
#[tauri::command]
fn scan_novel_directory(root_path: String) -> Result<NovelStructure, String> {
    let root = Path::new(&root_path);
    if !root.exists() {
        return Err("目录不存在".into());
    }
    if !root.is_dir() {
        return Err("路径不是目录".into());
    }

    let mut entries = fs::read_dir(root)
        .map_err(|e| format!("读取目录失败: {}", e))?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .collect::<Vec<_>>();

    entries.sort_by(|a, b| a.file_name().cmp(&b.file_name()));

    let mut prologue: Option<ChapterEntry> = None;
    let mut volumes: Vec<VolumeEntry> = Vec::new();
    let mut root_chapters: Vec<ChapterEntry> = Vec::new();

    // 先检查小序
    for path in &entries {
        if path.is_file() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if is_text_file(name) && is_prologue(name) {
                    prologue = Some(ChapterEntry {
                        name: name.to_string(),
                        relative_path: name.to_string(),
                    });
                    break;
                }
            }
        }
    }

    let has_subdirs = entries.iter().any(|p| {
        p.is_dir()
            && p.file_name()
                .and_then(|n| n.to_str())
                .map(|name| !is_ignored_dir(name))
                .unwrap_or(false)
    });

    if has_subdirs {
        // 有分卷模式
        for path in &entries {
            if path.is_dir() {
                if let Some(dir_name) = path.file_name().and_then(|n| n.to_str()) {
                    if is_ignored_dir(dir_name) {
                        continue;
                    }

                    let mut chapter_entries: Vec<ChapterEntry> = Vec::new();
                    let mut chapter_paths = fs::read_dir(path)
                        .map_err(|e| format!("读取分卷目录失败: {}", e))?
                        .filter_map(|e| e.ok())
                        .map(|e| e.path())
                        .filter(|p| p.is_file() && is_text_file(p.file_name().and_then(|n| n.to_str()).unwrap_or("")))
                        .collect::<Vec<_>>();
                    chapter_paths.sort_by(|a, b| a.file_name().cmp(&b.file_name()));

                    for ch_path in &chapter_paths {
                        if let Some(ch_name) = ch_path.file_name().and_then(|n| n.to_str()) {
                            if is_prologue(ch_name) {
                                continue;
                            }
                            let rel = format!("{}/{}", dir_name, ch_name);
                            chapter_entries.push(ChapterEntry {
                                name: ch_name.to_string(),
                                relative_path: rel,
                            });
                        }
                    }

                    volumes.push(VolumeEntry {
                        name: dir_name.to_string(),
                        chapters: chapter_entries,
                    });
                }
            }
        }
    } else {
        // 扁平模式：根目录下所有 .md/.txt 作为章节
        for path in &entries {
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if !is_text_file(name) || is_prologue(name) {
                        continue;
                    }
                    root_chapters.push(ChapterEntry {
                        name: name.to_string(),
                        relative_path: name.to_string(),
                    });
                }
            }
        }
    }

    Ok(NovelStructure {
        mode: if has_subdirs { "volume".into() } else { "flat".into() },
        prologue,
        volumes,
        root_chapters,
    })
}

/// 创建新章节文件
#[tauri::command]
fn create_chapter(root_path: String, volume_relative_path: String, file_name: String) -> Result<String, String> {
    let dir = resolve_in_root(&root_path, &volume_relative_path)?;
    if !dir.exists() {
        return Err("分卷目录不存在".into());
    }

    let safe_name = sanitize_filename(&file_name);
    let file_path = dir.join(format!("{}.md", safe_name));

    if file_path.exists() {
        return Err("文件已存在".into());
    }

    let content = format!("# {}\n\n", file_name);
    fs::write(&file_path, content)
        .map_err(|e| format!("创建文件失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// 重命名章节文件
#[tauri::command]
fn rename_chapter(root_path: String, old_relative_path: String, new_name: String) -> Result<String, String> {
    let old = resolve_in_root(&root_path, &old_relative_path)?;
    if !old.exists() {
        return Err("原文件不存在".into());
    }

    let parent = old.parent().ok_or("无法获取父目录")?;
    let safe_name = sanitize_filename(&new_name);
    let ext = old.extension().and_then(|e| e.to_str()).unwrap_or("md");
    let new_path = parent.join(format!("{}.{}", safe_name, ext));

    fs::rename(old, &new_path).map_err(|e| format!("重命名失败: {}", e))?;

    Ok(new_path.to_string_lossy().to_string())
}

/// 删除章节文件
#[tauri::command]
fn delete_chapter(root_path: String, relative_path: String) -> Result<(), String> {
    let file = resolve_in_root(&root_path, &relative_path)?;
    if !file.exists() {
        return Err("文件不存在".into());
    }
    fs::remove_file(file).map_err(|e| format!("删除文件失败: {}", e))
}

/// 创建分卷目录
#[tauri::command]
fn create_volume(root_path: String, volume_name: String) -> Result<String, String> {
    let root = Path::new(&root_path);
    let safe_name = sanitize_filename(&volume_name);
    let dir = root.join(&safe_name);

    fs::create_dir_all(&dir).map_err(|e| format!("创建分卷目录失败: {}", e))?;

    Ok(dir.to_string_lossy().to_string())
}

/// 重命名分卷目录
#[tauri::command]
fn rename_volume(root_path: String, volume_relative_path: String, new_name: String) -> Result<String, String> {
    let old = resolve_in_root(&root_path, &volume_relative_path)?;
    if !old.exists() {
        return Err("原目录不存在".into());
    }

    let parent = old.parent().ok_or("无法获取父目录")?;
    let safe_name = sanitize_filename(&new_name);
    let new_path = parent.join(&safe_name);

    fs::rename(old, &new_path).map_err(|e| format!("重命名目录失败: {}", e))?;

    Ok(new_path.to_string_lossy().to_string())
}

/// 删除分卷目录
#[tauri::command]
fn delete_volume(root_path: String, volume_relative_path: String) -> Result<(), String> {
    let dir = resolve_in_root(&root_path, &volume_relative_path)?;
    if !dir.exists() {
        return Err("目录不存在".into());
    }
    fs::remove_dir_all(dir).map_err(|e| format!("删除目录失败: {}", e))
}

/// 读取文本文件（自动检测 UTF-8/GBK）
#[tauri::command]
fn read_text_file(root_path: String, relative_path: String) -> Result<String, String> {
    let file_path = resolve_in_root(&root_path, &relative_path)?;
    let bytes = fs::read(file_path).map_err(|e| format!("读取文件失败: {}", e))?;

    // 优先 UTF-8
    if let Ok(text) = String::from_utf8(bytes.clone()) {
        return Ok(text);
    }

    // 尝试 GBK 解码
    let (cow, _, _) = encoding_rs::GBK.decode(&bytes); // 三元组解构
    Ok(cow.into_owned()) // Cow -> String，避免借用问题
}

/// 写入文本文件（UTF-8）
#[tauri::command]
fn write_text_file(root_path: String, relative_path: String, content: String) -> Result<(), String> {
    let file_path = resolve_in_root(&root_path, &relative_path)?;
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    fs::write(file_path, &content).map_err(|e| format!("写入文件失败: {}", e))
}

/// 列出目录内容
#[tauri::command]
fn list_directory(root_path: String, relative_path: String) -> Result<Vec<FileInfo>, String> {
    let dir = resolve_in_root(&root_path, &relative_path)?;
    if !dir.is_dir() {
        return Err("不是有效目录".into());
    }

    let mut entries: Vec<FileInfo> = fs::read_dir(dir)
        .map_err(|e| format!("读取目录失败: {}", e))?
        .filter_map(|e| e.ok())
        .map(|e| {
            let path = e.path();
            let meta = fs::metadata(&path).ok();
            FileInfo {
                name: path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string(),
                path: path.to_string_lossy().to_string(),
                is_dir: path.is_dir(),
                size: meta.map(|m| m.len()).unwrap_or(0),
            }
        })
        .collect();

    entries.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.name.cmp(&b.name)
        }
    });

    Ok(entries)
}

fn sanitize_filename(name: &str) -> String {
    let invalid_chars = ['\\', '/', ':', '*', '?', '"', '<', '>', '|'];
    name.chars()
        .filter(|c| !invalid_chars.contains(c))
        .collect::<String>()
        .trim()
        .to_string()
}

// ---------- 应用入口 ----------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            scan_novel_directory,
            create_chapter,
            rename_chapter,
            delete_chapter,
            create_volume,
            rename_volume,
            delete_volume,
            read_text_file,
            write_text_file,
            list_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
