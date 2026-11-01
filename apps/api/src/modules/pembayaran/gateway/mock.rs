use chrono::{Duration, Utc};
use sha2::{Digest, Sha512};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::pembayaran::gateway::{
        BoxFuture, CreateTransactionPayload, GatewayChargeResponse, GatewayStatusResponse,
        PaymentGateway,
    },
};

#[derive(Clone)]
pub struct MockGateway {
    secret_key: String,
    status_store: Arc<Mutex<HashMap<String, String>>>,
}

impl MockGateway {
    pub fn new(secret_key: String) -> Self {
        Self {
            secret_key,
            status_store: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn simulate_settlement(&self, order_id: &str) {
        let mut store = self.status_store.lock().await;
        store.insert(order_id.to_string(), "SETTLEMENT".to_string());
    }

    pub async fn simulate_expired(&self, order_id: &str) {
        let mut store = self.status_store.lock().await;
        store.insert(order_id.to_string(), "EXPIRED".to_string());
    }

    pub fn generate_signature(
        &self,
        order_id: &str,
        status_code: &str,
        gross_amount: &str,
    ) -> String {
        let raw = format!(
            "{}{}{}{}",
            order_id, status_code, gross_amount, self.secret_key
        );
        let mut hasher = Sha512::new();
        hasher.update(raw.as_bytes());
        hex::encode(hasher.finalize())
    }
}

impl PaymentGateway for MockGateway {
    fn create_transaction<'a>(
        &'a self,
        payload: &'a CreateTransactionPayload,
    ) -> BoxFuture<'a, Result<GatewayChargeResponse, AppError>> {
        Box::pin(async move {
            let ref_id = format!("MOCK-REF-{}", Uuid::new_v4().simple());
            let expiry = Utc::now() + Duration::hours(payload.expiry_hours as i64);

            let (nomor_va, qr_string, qr_url) = match payload.payment_method.as_str() {
                "VA_BCA" => {
                    let va = format!("88001{:07}", (payload.gross_amount % 1_000_000).abs());
                    (Some(va), None, None)
                }
                "VA_BNI" => {
                    let va = format!("88002{:07}", (payload.gross_amount % 1_000_000).abs());
                    (Some(va), None, None)
                }
                "VA_BRI" => {
                    let va = format!("88003{:07}", (payload.gross_amount % 1_000_000).abs());
                    (Some(va), None, None)
                }
                "VA_MANDIRI" => {
                    let va = format!("88004{:07}", (payload.gross_amount % 1_000_000).abs());
                    (Some(va), None, None)
                }
                "VA_PERMATA" => {
                    let va = format!("88005{:07}", (payload.gross_amount % 1_000_000).abs());
                    (Some(va), None, None)
                }
                "QRIS" => {
                    let qris = format!(
                        "00020101021226600016ID.CO.PIGNATELLI.PMB01189360091800000000000215{}520454115303360540{}5802ID5923UNIV PIGNATELLI TRIPUTRA6009SURAKARTA62070703A016304",
                        payload.order_id, payload.gross_amount
                    );
                    (
                        None,
                        Some(qris),
                        Some("https://api.pignatelli.ac.id/static/qris/sample.png".to_string()),
                    )
                }
                _ => (
                    Some(format!(
                        "88009{:07}",
                        (payload.gross_amount % 1_000_000).abs()
                    )),
                    None,
                    None,
                ),
            };

            // Set initial status to PENDING
            {
                let mut store = self.status_store.lock().await;
                store.insert(payload.order_id.clone(), "PENDING".to_string());
            }

            let raw_res = serde_json::json!({
                "status_code": "201",
                "status_message": "Mock transaction charge successful",
                "transaction_id": ref_id,
                "order_id": payload.order_id,
                "gross_amount": payload.gross_amount.to_string(),
                "payment_type": payload.payment_method,
                "transaction_time": Utc::now().to_rfc3339(),
                "transaction_status": "pending",
                "va_number": nomor_va,
                "qr_string": qr_string,
            });

            Ok(GatewayChargeResponse {
                gateway_reference_id: ref_id,
                payment_method: payload.payment_method.clone(),
                nomor_va,
                qr_string,
                qr_url,
                nominal: payload.gross_amount,
                waktu_berlaku_sampai: expiry,
                raw_response: raw_res,
            })
        })
    }

    fn check_status<'a>(
        &'a self,
        order_id: &'a str,
    ) -> BoxFuture<'a, Result<GatewayStatusResponse, AppError>> {
        Box::pin(async move {
            let store = self.status_store.lock().await;
            let current_status = store
                .get(order_id)
                .cloned()
                .unwrap_or_else(|| "PENDING".to_string());

            let paid_at = if current_status == "SETTLEMENT" {
                Some(Utc::now())
            } else {
                None
            };

            Ok(GatewayStatusResponse {
                order_id: order_id.to_string(),
                status: current_status.clone(),
                gross_amount: 250_000,
                paid_at,
                payment_method: "MOCK_GATEWAY".to_string(),
                raw_response: serde_json::json!({
                    "status_code": if current_status == "SETTLEMENT" { "200" } else { "201" },
                    "transaction_status": current_status.to_lowercase(),
                    "order_id": order_id,
                }),
            })
        })
    }

    fn verify_webhook_signature(
        &self,
        order_id: &str,
        status_code: &str,
        gross_amount: &str,
        signature: &str,
    ) -> bool {
        if signature == "mock_valid_signature" {
            return true;
        }

        let expected = self.generate_signature(order_id, status_code, gross_amount);
        expected.eq_ignore_ascii_case(signature)
    }

    fn provider_name(&self) -> &'static str {
        "MOCK"
    }
}
