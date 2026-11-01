use sqlx::PgPool;
use std::sync::Arc;

use crate::{
    config::AppConfig,
    modules::pembayaran::gateway::{PaymentGateway, create_payment_gateway},
    security::{LogMailSender, MailSender, RateLimiter, SessionStore},
};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub session_store: SessionStore,
    pub config: AppConfig,
    pub rate_limiter: RateLimiter,
    pub mail_sender: Arc<dyn MailSender>,
    pub payment_gateway: Arc<dyn PaymentGateway>,
}

impl AppState {
    pub fn new(db: PgPool, session_store: SessionStore, config: AppConfig) -> Self {
        let payment_gateway = create_payment_gateway(&config);
        Self {
            db,
            session_store,
            config,
            rate_limiter: RateLimiter::new(),
            mail_sender: Arc::new(LogMailSender::new()),
            payment_gateway,
        }
    }

    pub fn with_mail_sender(mut self, mail_sender: Arc<dyn MailSender>) -> Self {
        self.mail_sender = mail_sender;
        self
    }

    pub fn with_payment_gateway(mut self, payment_gateway: Arc<dyn PaymentGateway>) -> Self {
        self.payment_gateway = payment_gateway;
        self
    }
}
