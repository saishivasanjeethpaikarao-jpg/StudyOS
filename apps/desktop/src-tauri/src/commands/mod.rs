mod notifications;
mod settings;

pub use notifications::*;
pub use settings::*;

/// Check if running in desktop environment
#[tauri::command]
pub fn is_desktop() -> bool {
    true
}

/// Open a URL with the system's default handler (HTTP, HTTPS, and mailto schemes only)
#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if !(trimmed.starts_with("https://") || trimmed.starts_with("http://") || trimmed.starts_with("mailto:")) {
        return Err("Invalid URL protocol: only http, https, and mailto schemes are allowed".into());
    }
    open::that(trimmed).map_err(|e| e.to_string())
}
