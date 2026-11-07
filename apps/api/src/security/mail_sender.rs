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

/// Pengirim email nyata melalui SMTP (STARTTLS atau TLS langsung).
#[derive(Clone)]
pub struct SmtpMailSender {
    transport: lettre::AsyncSmtpTransport<lettre::Tokio1Executor>,
    from: lettre::message::Mailbox,
}

impl SmtpMailSender {
    pub fn new(cfg: &crate::config::SmtpConfig) -> Result<Self, String> {
        use lettre::transport::smtp::authentication::Credentials;
        use lettre::{AsyncSmtpTransport, Tokio1Executor};

        let builder = if cfg.tls_langsung {
            AsyncSmtpTransport::<Tokio1Executor>::relay(&cfg.host)
        } else {
            AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&cfg.host)
        }
        .map_err(|e| format!("Host SMTP tidak valid: {e}"))?
        .port(cfg.port);
        let builder = if cfg.username.is_empty() {
            builder
        } else {
            builder.credentials(Credentials::new(cfg.username.clone(), cfg.password.clone()))
        };
        let from = cfg
            .from
            .parse()
            .map_err(|e| format!("SMTP_FROM tidak valid: {e}"))?;
        Ok(Self {
            transport: builder.build(),
            from,
        })
    }
}

impl MailSender for SmtpMailSender {
    fn send_email<'a>(
        &'a self,
        to: &'a str,
        subject: &'a str,
        body: &'a str,
    ) -> BoxFuture<'a, Result<(), AppError>> {
        Box::pin(async move {
            use lettre::AsyncTransport;
            let tujuan = to.parse().map_err(|e| {
                AppError::BadRequest(format!("Alamat email tujuan tidak valid: {e}"))
            })?;
            let pesan = lettre::Message::builder()
                .from(self.from.clone())
                .to(tujuan)
                .subject(subject)
                .header(lettre::message::header::ContentType::TEXT_PLAIN)
                .body(body.to_string())
                .map_err(|e| AppError::Internal(format!("Gagal menyusun email: {e}")))?;
            self.transport
                .send(pesan)
                .await
                .map_err(|e| AppError::Internal(format!("Gagal mengirim email via SMTP: {e}")))?;
            Ok(())
        })
    }

    fn get_sent_emails<'a>(&'a self) -> BoxFuture<'a, Vec<SentEmail>> {
        Box::pin(async { Vec::new() })
    }
}
