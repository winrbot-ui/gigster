use super::PlatformAdapter;

pub struct Upwork;

impl PlatformAdapter for Upwork {
    fn id(&self) -> &'static str {
        "upwork"
    }

    fn tab_title_hints(&self) -> &'static [&'static str] {
        &["Upwork", "Messages - Upwork", "upwork.com/ab/messages"]
    }

    fn compose_control_name(&self) -> &'static str {
        "Message"
    }

    fn send_button_name(&self) -> &'static str {
        "Send"
    }

    fn open_thread_keys(&self) -> &'static str {
        "{ENTER}"
    }

    fn leave_thread_keys(&self) -> &'static str {
        "{ESC}"
    }
}
