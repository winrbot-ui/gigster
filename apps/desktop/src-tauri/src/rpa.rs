//! UI Automation — focus platform tab, open threads, send replies, leave conversation.

use crate::platforms::adapter_for;
use std::thread;
use std::time::Duration;

const THREAD_LEAVE_WAIT_SECS: u64 = 120;

#[cfg(target_os = "windows")]
mod win {
    use std::process::{Command, Stdio};

    pub fn active_window_title() -> Option<String> {
        let script = r#"
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class GigsterFg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int count);
  public static string Title() {
    var sb = new StringBuilder(512);
    GetWindowText(GetForegroundWindow(), sb, 512);
    return sb.ToString();
  }
}
"@
[GigsterFg]::Title()
"#;
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", script])
            .output()
            .ok()?;
        let title = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if title.is_empty() {
            None
        } else {
            Some(title)
        }
    }

    pub fn run_send_keys(keys: &str) -> Result<(), String> {
        let escaped = keys.replace('\'', "''");
        let script = format!(
            "Add-Type -AssemblyName System.Windows.Forms; \
             Start-Sleep -Milliseconds 300; \
             [System.Windows.Forms.SendKeys]::SendWait('{escaped}');"
        );
        let status = Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err("SendKeys failed".into())
        }
    }

    pub fn paste_and_send(draft: &str) -> Result<(), String> {
        let escaped = draft.replace('\'', "''");
        let script = format!(
            "Set-Clipboard -Value @'\n{escaped}\n'@; \
             Add-Type -AssemblyName System.Windows.Forms; \
             Start-Sleep -Milliseconds 400; \
             [System.Windows.Forms.SendKeys]::SendWait('^v'); \
             Start-Sleep -Milliseconds 500; \
             [System.Windows.Forms.SendKeys]::SendWait('{{ENTER}}');"
        );
        let status = Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err("Paste/send failed".into())
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod win {
    pub fn active_window_title() -> Option<String> {
        None
    }
    pub fn run_send_keys(_keys: &str) -> Result<(), String> {
        Err("RPA requires Windows".into())
    }
    pub fn paste_and_send(_draft: &str) -> Result<(), String> {
        Err("RPA requires Windows".into())
    }
}

pub fn get_active_window_title() -> Option<String> {
    win::active_window_title()
}

pub fn platform_window_active(platform: &str) -> bool {
    let title = get_active_window_title().unwrap_or_default().to_lowercase();
    title.contains(platform)
        || (platform == "upwork" && title.contains("upwork"))
        || (platform == "fiverr" && title.contains("fiverr"))
        || (platform == "freelancer" && title.contains("freelancer"))
}

/// Best-effort client name from OCR thread (first "from X" or line after Client:).
pub fn extract_client_name(text: &str, _platform: &str) -> String {
    for line in text.lines().take(20) {
        let lower = line.to_lowercase();
        if lower.starts_with("client:") || lower.starts_with("buyer:") {
            let rest = line.split(':').nth(1).unwrap_or("").trim();
            if !rest.is_empty() && rest.len() < 60 {
                return rest.to_string();
            }
        }
    }
    "Client".to_string()
}

/// Open the latest unread thread when inbox list is focused (Enter on selected row).
pub fn open_latest_thread(platform: &str) -> Result<(), String> {
    if !platform_window_active(platform) {
        return Err(format!(
            "Focus your {platform} messages tab in the browser first"
        ));
    }
    let adapter = adapter_for(platform);
    thread::sleep(Duration::from_millis(400));
    win::run_send_keys(adapter.open_thread_keys())?;
    thread::sleep(Duration::from_millis(800));
    Ok(())
}

pub fn leave_conversation(platform: &str) -> Result<(), String> {
    let adapter = adapter_for(platform);
    thread::sleep(Duration::from_millis(300));
    win::run_send_keys(adapter.leave_thread_keys())?;
    Ok(())
}

/// After auto-send: wait up to 2 minutes; leave thread if client did not reply (OCR unchanged).
pub fn wait_then_leave_if_no_reply(
    platform: &str,
    baseline_hash: u64,
    current_text_fn: impl Fn() -> Option<String>,
    hash_fn: impl Fn(&str) -> u64,
    should_cancel: impl Fn() -> bool,
) -> String {
    let wait_secs = THREAD_LEAVE_WAIT_SECS;
    for _ in 0..wait_secs {
        if should_cancel() {
            return "Left wait — monitor stopped".into();
        }
        thread::sleep(Duration::from_secs(1));
        if let Some(text) = current_text_fn() {
            if hash_fn(&text) != baseline_hash {
                return "Client replied — staying in thread".into();
            }
        }
    }
    match leave_conversation(platform) {
        Ok(()) => format!("No reply in {wait_secs}s — left conversation"),
        Err(e) => format!("No reply in {wait_secs}s — leave failed: {e}"),
    }
}

/// Paste draft into compose box and press Enter to send.
pub fn auto_send_reply(draft: &str, platform: &str) -> Result<String, String> {
    if draft.trim().is_empty() {
        return Err("Empty draft".into());
    }
    if !platform_window_active(platform) {
        let title = get_active_window_title().unwrap_or_default();
        return Err(format!(
            "Active window '{title}' is not {platform}. Focus the conversation tab."
        ));
    }
    thread::sleep(Duration::from_millis(800));
    win::paste_and_send(draft)?;
    Ok(format!("Auto-sent on {platform}"))
}
