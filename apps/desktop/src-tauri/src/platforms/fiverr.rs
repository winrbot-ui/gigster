use super::PlatformAdapter;

pub struct Fiverr;

impl PlatformAdapter for Fiverr {
    fn id(&self) -> &'static str {
        "fiverr"
    }

    fn tab_title_hints(&self) -> &'static [&'static str] {
        &["Fiverr", "Inbox - Fiverr", "fiverr.com/inbox"]
    }

    fn compose_control_name(&self) -> &'static str {
        "Type a message"
    }

    fn send_button_name(&self) -> &'static str {
        "Send message"
    }

    fn open_thread_keys(&self) -> &'static str {
        "{ENTER}"
    }

    fn leave_thread_keys(&self) -> &'static str {
        "{ESC}{ESC}"
    }
}
