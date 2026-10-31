use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::error::AppError;

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

#[derive(Clone, Debug)]
pub struct SentEmail {
    pub to: String,
    pub subject: String,
    pub body: String,
    pub sent_at: chrono::DateTime<chrono::Utc>,
}

pub trait MailSender: Send + Sync {
    fn send_email<'a>(
        &'a self,
        to: &'a str,
        subject: &'a str,
        body: &'a str,
    ) -> BoxFuture<'a, Result<(), AppError>>;

    fn get_sent_emails<'a>(&'a self) -> BoxFuture<'a, Vec<SentEmail>>;
}

#[derive(Clone, Default)]
pub struct LogMailSender {
    sent_emails: Arc<Mutex<Vec<SentEmail>>>,
}

impl LogMailSender {
    pub fn new() -> Self {
        Self {
            sent_emails: Arc::new(Mutex::new(Vec::new())),
        }
    }
}

impl MailSender for LogMailSender {
    fn send_email<'a>(
        &'a self,
        to: &'a str,
        subject: &'a str,
        body: &'a str,
    ) -> BoxFuture<'a, Result<(), AppError>> {
        Box::pin(async move {
            let email = SentEmail {
                to: to.to_string(),
                subject: subject.to_string(),
                body: body.to_string(),
                sent_at: chrono::Utc::now(),
            };

            tracing::info!(
                "📧 [DEV EMAIL DISPATCH] Ke: {} | Subjek: {}\n{}",
                email.to,
                email.subject,
                email.body
            );

            let mut lock = self.sent_emails.lock().await;
            lock.push(email);

            Ok(())
        })
    }

    fn get_sent_emails<'a>(&'a self) -> BoxFuture<'a, Vec<SentEmail>> {
        Box::pin(async move {
            let lock = self.sent_emails.lock().await;
            lock.clone()
        })
    }
}
