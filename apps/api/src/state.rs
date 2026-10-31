use sqlx::PgPool;
use std::sync::Arc;

use crate::{
    config::AppConfig,
    security::{LogMailSender, MailSender, RateLimiter, SessionStore},
};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub session_store: SessionStore,
    pub config: AppConfig,
    pub rate_limiter: RateLimiter,
    pub mail_sender: Arc<dyn MailSender>,
}

impl AppState {
    pub fn new(db: PgPool, session_store: SessionStore, config: AppConfig) -> Self {
        Self {
            db,
            session_store,
            config,
            rate_limiter: RateLimiter::new(),
            mail_sender: Arc::new(LogMailSender::new()),
        }
    }

    pub fn with_mail_sender(mut self, mail_sender: Arc<dyn MailSender>) -> Self {
        self.mail_sender = mail_sender;
        self
    }
}
