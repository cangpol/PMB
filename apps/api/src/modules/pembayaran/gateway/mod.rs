use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use crate::{config::AppConfig, error::AppError};

pub mod midtrans;
pub mod mock;

pub use midtrans::MidtransGateway;
pub use mock::MockGateway;

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CustomerDetails {
    pub name: String,
    pub email: String,
    pub phone: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateTransactionPayload {
    pub order_id: String,
    pub gross_amount: i64,
    pub payment_method: String, // 'VA_BCA', 'VA_BNI', 'VA_BRI', 'VA_MANDIRI', 'VA_PERMATA', 'QRIS'
    pub customer_details: CustomerDetails,
    pub expiry_hours: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GatewayChargeResponse {
    pub gateway_reference_id: String,
    pub payment_method: String,
    pub nomor_va: Option<String>,
    pub qr_string: Option<String>,
    pub qr_url: Option<String>,
    pub nominal: i64,
    pub waktu_berlaku_sampai: DateTime<Utc>,
    pub raw_response: serde_json::Value,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GatewayStatusResponse {
    pub order_id: String,
    pub status: String, // 'PENDING', 'SETTLEMENT', 'EXPIRED', 'FAILED'
    pub gross_amount: i64,
    pub paid_at: Option<DateTime<Utc>>,
    pub payment_method: String,
    pub raw_response: serde_json::Value,
}

pub trait PaymentGateway: Send + Sync {
    fn create_transaction<'a>(
        &'a self,
        payload: &'a CreateTransactionPayload,
    ) -> BoxFuture<'a, Result<GatewayChargeResponse, AppError>>;

    fn check_status<'a>(
        &'a self,
        order_id: &'a str,
    ) -> BoxFuture<'a, Result<GatewayStatusResponse, AppError>>;

    fn verify_webhook_signature(
        &self,
        order_id: &str,
        status_code: &str,
        gross_amount: &str,
        signature: &str,
    ) -> bool;

    fn provider_name(&self) -> &'static str;
}

pub fn create_payment_gateway(config: &AppConfig) -> Arc<dyn PaymentGateway> {
    match config.payment_gateway_provider.to_lowercase().as_str() {
        "midtrans" => Arc::new(MidtransGateway::new(
            config.midtrans_server_key.clone(),
            config.midtrans_client_key.clone(),
            config.midtrans_is_production,
        )),
        _ => Arc::new(MockGateway::new(config.mock_payment_secret.clone())),
    }
}
