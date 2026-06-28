use super::PlatformAdapter;

pub struct Freelancer;

impl PlatformAdapter for Freelancer {
    fn id(&self) -> &'static str {
        "freelancer"
    }

    fn tab_title_hints(&self) -> &'static [&'static str] {
        &["Freelancer", "Messages - Freelancer", "freelancer.com/messages"]
    }

    fn compose_control_name(&self) -> &'static str {
        "Write a message"
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
