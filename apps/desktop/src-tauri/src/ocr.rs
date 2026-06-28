//! Read client messages from the focused platform browser tab (Windows OCR).

use crate::platforms::{adapter_for, detect_platform_from_title};
use std::path::PathBuf;
use std::process::Command;

const MIN_OCR_CHARS: usize = 40;

fn script_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("scripts").join("capture_ocr.ps1")
}

/// Read visible text from the foreground window via screenshot + Windows OCR.
pub fn read_foreground_text() -> Option<String> {
    #[cfg(not(target_os = "windows"))]
    return None;

    #[cfg(target_os = "windows")]
    {
        let script = script_path();
        if !script.exists() {
            return None;
        }
        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                &script.to_string_lossy(),
            ])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if text.len() < MIN_OCR_CHARS {
            return None;
        }
        Some(text)
    }
}

fn simulate_enabled() -> bool {
    std::env::var("GIGSTER_SIMULATE_OCR")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

fn simulated_sample(platform: &str) -> String {
    match platform {
        "fiverr" => {
            "Client: Hi! I need a logo and landing page for my startup. Budget $500. Can you help?"
        }
        "freelancer" => {
            "Client: Hello, looking for a web developer to rebuild our company site. About 6 pages."
        }
        _ => {
            "Client: Hi, I need a 5-page business website for my consulting firm. Budget around $800."
        }
    }
    .to_string()
}

/// Returns (platform, client_name, thread_text) when a new/changed message thread is detected.
pub fn scrape_tab_ocr(platform: &str, poll_count: u64) -> Option<(String, String, String)> {
    let adapter = adapter_for(platform);
    let platform_id = adapter.id().to_string();

    let title = crate::rpa::get_active_window_title().unwrap_or_default();
    let title_matches = detect_platform_from_title(&title) == Some(adapter.id());

    if let Some(text) = read_foreground_text() {
        if title_matches || text.to_lowercase().contains(platform) {
            let client = crate::rpa::extract_client_name(&text, platform);
            return Some((platform_id, client, text));
        }
    }

    if simulate_enabled() && poll_count > 0 && poll_count % 5 == 0 {
        let sample = simulated_sample(platform);
        return Some((
            platform_id,
            format!("Simulated {} Client", adapter.id()),
            sample,
        ));
    }

    None
}
