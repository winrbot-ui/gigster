mod ocr;
mod platforms;
mod rpa;

use rand::Rng;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::State;

const MIN_DELAY_MIN: u64 = 3;
const MAX_DELAY_MIN: u64 = 45;

#[derive(Default, Clone, Serialize)]
struct MonitorState {
    running: bool,
    auto_mode: bool,
    interval_secs: u64,
    delay_minutes: u64,
    last_event: String,
    last_client_text: String,
    last_draft: String,
    poll_count: u64,
    pending_auto_send: bool,
}

#[derive(Default, Clone, Serialize, Deserialize)]
struct AppConfig {
    api_url: String,
    jwt_token: String,
    project_id: String,
    platform: String,
    client_name: String,
}

struct AppState {
    monitor: Mutex<MonitorState>,
    config: Mutex<AppConfig>,
    cancel_auto_send: Arc<Mutex<bool>>,
    last_thread_hash: Mutex<u64>,
}

fn hash_text(s: &str) -> u64 {
    s.bytes().fold(0u64, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u64))
}

fn random_delay_minutes() -> u64 {
    rand::thread_rng().gen_range(MIN_DELAY_MIN..=MAX_DELAY_MIN)
}

fn post_notification(config: &AppConfig, platform: &str, client_name: &str, mode: &str) -> String {
    if config.api_url.is_empty() || config.jwt_token.is_empty() {
        return "Skipped notification — set API URL and JWT".into();
    }
    let client = match reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
    {
        Ok(c) => c,
        Err(e) => return format!("HTTP client error: {e}"),
    };
    let url = format!("{}/notifications/message", config.api_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "platform": platform,
        "client_name": client_name,
        "mode": mode,
    });
    match client
        .post(&url)
        .header("Authorization", format!("Bearer {}", config.jwt_token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
    {
        Ok(resp) if resp.status().is_success() => {
            format!("Telegram alarm sent for {client_name} on {platform}")
        }
        Ok(resp) => format!("Notification failed: HTTP {}", resp.status()),
        Err(e) => format!("Notification error: {e}"),
    }
}

fn sync_auto_settings(config: &AppConfig, enabled: bool, disclaimer: bool, delay: u64) {
    if config.api_url.is_empty() || config.jwt_token.is_empty() {
        return;
    }
    let client = match reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
    {
        Ok(c) => c,
        Err(_) => return,
    };
    let url = format!("{}/desktop/auto-settings", config.api_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "enabled": enabled,
        "disclaimer_accepted": disclaimer,
        "delay_minutes": delay,
    });
    let _ = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", config.jwt_token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send();
}

fn fetch_draft(
    config: &AppConfig,
    ocr_text: &str,
    mode: &str,
    delay_min: u64,
) -> Result<serde_json::Value, String> {
    if config.api_url.is_empty() || config.jwt_token.is_empty() {
        return Err("Set API URL and JWT token first".into());
    }
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;
    let url = format!("{}/desktop/draft", config.api_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "project_id": config.project_id,
        "ocr_text": ocr_text,
        "mode": mode,
        "auto_delay_minutes": delay_min,
    });
    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", config.jwt_token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("Draft failed: HTTP {}", resp.status()));
    }
    resp.json().map_err(|e| e.to_string())
}

fn handle_new_message(
    state: Arc<AppState>,
    config: AppConfig,
    platform: String,
    client_name: String,
    thread_text: String,
    auto_mode: bool,
) {
    let mode = if auto_mode { "auto" } else { "manual" };
    let event_msg = post_notification(&config, &platform, &client_name, mode);

    let _ = rpa::open_latest_thread(&platform);

    let delay_min = if auto_mode {
        random_delay_minutes()
    } else {
        15
    };

    {
        let mut monitor = state.monitor.lock().unwrap();
        if auto_mode {
            monitor.delay_minutes = delay_min;
        }
    }

    match fetch_draft(&config, &thread_text, mode, delay_min) {
        Ok(data) => {
            let draft = data
                .get("draft")
                .and_then(|d| d.as_str())
                .unwrap_or("")
                .to_string();
            {
                let mut monitor = state.monitor.lock().unwrap();
                monitor.last_client_text = thread_text.clone();
                monitor.last_draft = draft.clone();
            }

            if auto_mode {
                {
                    let mut monitor = state.monitor.lock().unwrap();
                    monitor.last_event = format!(
                        "{event_msg} · Auto: draft ready · sending in {delay_min} min"
                    );
                }
                schedule_auto_send(state, draft, platform, delay_min, thread_text);
            } else {
                let mut monitor = state.monitor.lock().unwrap();
                monitor.last_event = format!(
                    "{event_msg} · Manual: draft ready — copy below, paste in chat, Send"
                );
            }
        }
        Err(e) => {
            let mut monitor = state.monitor.lock().unwrap();
            monitor.last_client_text = thread_text;
            monitor.last_event = format!("{event_msg} · Draft error: {e}");
        }
    }
}

fn schedule_auto_send(
    state: Arc<AppState>,
    draft: String,
    platform: String,
    delay_min: u64,
    thread_text: String,
) {
    *state.cancel_auto_send.lock().unwrap() = false;
    let baseline_hash = hash_text(&thread_text);
    let cancel = state.cancel_auto_send.clone();

    thread::spawn(move || {
        let secs = delay_min * 60;
        {
            let mut monitor = state.monitor.lock().unwrap();
            monitor.pending_auto_send = true;
        }

        for _ in 0..secs {
            if *cancel.lock().unwrap() || !state.monitor.lock().unwrap().running {
                let mut monitor = state.monitor.lock().unwrap();
                monitor.pending_auto_send = false;
                monitor.last_event = "Auto send cancelled".into();
                return;
            }
            thread::sleep(Duration::from_secs(1));
        }

        let send_result = rpa::auto_send_reply(&draft, &platform);
        let mut monitor = state.monitor.lock().unwrap();
        monitor.pending_auto_send = false;
        monitor.last_draft = draft;

        match send_result {
            Ok(msg) => {
                monitor.last_event = msg.clone();
                drop(monitor);
                let leave_msg = rpa::wait_then_leave_if_no_reply(
                    &platform,
                    baseline_hash,
                    ocr::read_foreground_text,
                    hash_text,
                    || *cancel.lock().unwrap() || !state.monitor.lock().unwrap().running,
                );
                state.monitor.lock().unwrap().last_event =
                    format!("{msg} · {leave_msg}");
            }
            Err(e) => {
                monitor.last_event = format!("Auto send failed: {e}");
            }
        }
    });
}

fn run_monitor_loop(state: Arc<AppState>) {
    thread::spawn(move || loop {
        let (running, auto_mode, interval_secs, platform) = {
            let monitor = state.monitor.lock().unwrap();
            let config = state.config.lock().unwrap();
            (
                monitor.running,
                monitor.auto_mode,
                monitor.interval_secs,
                config.platform.clone(),
            )
        };

        if !running {
            thread::sleep(Duration::from_secs(1));
            continue;
        }

        let poll_count = {
            let mut monitor = state.monitor.lock().unwrap();
            monitor.poll_count += 1;
            monitor.poll_count
        };

        if !rpa::platform_window_active(&platform) {
            let mut monitor = state.monitor.lock().unwrap();
            if monitor.poll_count % 4 == 0 {
                monitor.last_event = format!(
                    "Waiting — focus your {platform} messages tab in the browser"
                );
            }
            thread::sleep(Duration::from_secs(interval_secs.max(15)));
            continue;
        }

        if let Some((detected_platform, client_name, ocr_text)) =
            ocr::scrape_tab_ocr(&platform, poll_count)
        {
            let thread_hash = hash_text(&ocr_text);
            let is_new = {
                let mut last = state.last_thread_hash.lock().unwrap();
                if *last == thread_hash {
                    false
                } else {
                    *last = thread_hash;
                    true
                }
            };

            if is_new {
                let config = state.config.lock().unwrap().clone();
                handle_new_message(
                    state.clone(),
                    config,
                    detected_platform,
                    client_name,
                    ocr_text,
                    auto_mode,
                );
            }
        }

        thread::sleep(Duration::from_secs(interval_secs.max(15)));
    });
}

#[tauri::command]
fn get_monitor_state(state: State<'_, Arc<AppState>>) -> MonitorState {
    state.monitor.lock().unwrap().clone()
}

#[tauri::command]
fn get_config(state: State<'_, Arc<AppState>>) -> AppConfig {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
fn set_config(
    api_url: String,
    jwt_token: String,
    project_id: String,
    platform: String,
    client_name: String,
    state: State<'_, Arc<AppState>>,
) -> Result<String, String> {
    let mut config = state.config.lock().unwrap();
    *config = AppConfig {
        api_url,
        jwt_token,
        project_id,
        platform,
        client_name,
    };
    Ok("Configuration saved".into())
}

#[tauri::command]
fn start_tab_monitor(
    auto_mode: bool,
    interval_secs: u64,
    disclaimer_accepted: bool,
    delay_minutes: Option<u64>,
    state: State<'_, Arc<AppState>>,
) -> Result<String, String> {
    if auto_mode && !disclaimer_accepted {
        return Err("Accept the disclaimer before enabling Auto mode.".into());
    }

    *state.cancel_auto_send.lock().unwrap() = false;
    *state.last_thread_hash.lock().unwrap() = 0;

    let delay = delay_minutes
        .unwrap_or(15)
        .clamp(MIN_DELAY_MIN, MAX_DELAY_MIN);

    let config = state.config.lock().unwrap().clone();
    if auto_mode {
        sync_auto_settings(&config, true, true, delay);
    }

    let mut monitor = state.monitor.lock().unwrap();
    monitor.running = true;
    monitor.auto_mode = auto_mode;
    monitor.interval_secs = interval_secs.max(15).min(30);
    monitor.delay_minutes = delay;

    Ok(if auto_mode {
        format!(
            "Auto: watches {platform} tab · reads new messages · replies · leaves after 2 min if no answer",
            platform = config.platform
        )
    } else {
        format!(
            "Manual: watches {platform} tab · reads messages · draft appears here for you to send",
            platform = config.platform
        )
    })
}

#[tauri::command]
fn stop_tab_monitor(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    *state.cancel_auto_send.lock().unwrap() = true;
    let mut monitor = state.monitor.lock().unwrap();
    monitor.running = false;
    monitor.pending_auto_send = false;
    Ok("Tab monitor stopped".into())
}

#[tauri::command]
fn copy_draft_to_clipboard(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    let draft = state.monitor.lock().unwrap().last_draft.clone();
    if draft.is_empty() {
        return Err("No draft yet — wait for a new client message".into());
    }
    #[cfg(target_os = "windows")]
    {
        let escaped = draft.replace('\'', "''");
        let script = format!("Set-Clipboard -Value @'\n{escaped}\n'@");
        let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .status();
    }
    Ok(draft)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = Arc::new(AppState {
        monitor: Mutex::new(MonitorState::default()),
        config: Mutex::new(AppConfig::default()),
        cancel_auto_send: Arc::new(Mutex::new(false)),
        last_thread_hash: Mutex::new(0),
    });

    run_monitor_loop(app_state.clone());

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_monitor_state,
            get_config,
            set_config,
            start_tab_monitor,
            stop_tab_monitor,
            copy_draft_to_clipboard,
        ])
        .run(tauri::generate_context!())
        .expect("error running Gigster desktop");
}
