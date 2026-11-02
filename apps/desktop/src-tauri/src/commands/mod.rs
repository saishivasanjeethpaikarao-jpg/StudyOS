mod notifications;
mod settings;

pub use notifications::*;
pub use settings::*;

/// Check if running in desktop environment
#[tauri::command]
pub fn is_desktop() -> bool {
    true
}

/// Open a URL with the system's default handler
#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}
