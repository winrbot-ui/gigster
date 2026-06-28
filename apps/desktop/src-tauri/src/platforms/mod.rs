//! Platform adapters for Upwork, Fiverr, and Freelancer message tabs.

mod freelancer;
mod fiverr;
mod upwork;

pub trait PlatformAdapter: Send + Sync {
    fn id(&self) -> &'static str;
    fn tab_title_hints(&self) -> &'static [&'static str];
    fn compose_control_name(&self) -> &'static str;
    fn send_button_name(&self) -> &'static str;
    /// SendKeys sequence to open selected inbox row / latest thread.
    fn open_thread_keys(&self) -> &'static str;
    /// SendKeys to return to inbox list after send.
    fn leave_thread_keys(&self) -> &'static str;
}

pub fn adapter_for(platform: &str) -> Box<dyn PlatformAdapter> {
    match platform.to_lowercase().as_str() {
        "fiverr" => Box::new(fiverr::Fiverr),
        "freelancer" => Box::new(freelancer::Freelancer),
        _ => Box::new(upwork::Upwork),
    }
}

pub fn detect_platform_from_title(title: &str) -> Option<&'static str> {
    let lower = title.to_lowercase();
    if lower.contains("fiverr") {
        return Some("fiverr");
    }
    if lower.contains("freelancer") {
        return Some("freelancer");
    }
    if lower.contains("upwork") {
        return Some("upwork");
    }
    None
}
