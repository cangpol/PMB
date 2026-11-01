use chrono::{Duration, Utc};
use sha2::{Digest, Sha512};
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::pembayaran::gateway::{
        BoxFuture, CreateTransactionPayload, GatewayChargeResponse, GatewayStatusResponse,
        PaymentGateway,
    },
};

#[derive(Clone)]
pub struct MidtransGateway {
    server_key: String,
    client_key: String,
    is_production: bool,
}

impl MidtransGateway {
    pub fn new(server_key: String, client_key: String, is_production: bool) -> Self {
        Self {
            server_key,
            client_key,
            is_production,
        }
    }

    pub fn base_url(&self) -> &'static str {
        if self.is_production {
            "https://api.midtrans.com/v2"
        } else {
            "https://api.sandbox.midtrans.com/v2"
        }
    }

    pub fn client_key(&self) -> &str {
        &self.client_key
    }
}

impl PaymentGateway for MidtransGateway {
    fn create_transaction<'a>(
        &'a self,
        payload: &'a CreateTransactionPayload,
    ) -> BoxFuture<'a, Result<GatewayChargeResponse, AppError>> {
        Box::pin(async move {
            let ref_id = format!("MIDTRANS-TRX-{}", Uuid::new_v4().simple());
            let expiry = Utc::now() + Duration::hours(payload.expiry_hours as i64);

            let (nomor_va, qr_string, qr_url) = match payload.payment_method.as_str() {
                "VA_BCA" => {
                    let va = format!("70012{:07}", (payload.gross_amount % 1_000_000).abs());
                    (Some(va), None, None)
                }
                "VA_BNI" => {
                    let va = format!("98801{:07}", (payload.gross_amount % 1_000_000).abs());
                    (Some(va), None, None)
                }
                "VA_BRI" => {
                    let va = format!("12801{:07}", (payload.gross_amount % 1_000_000).abs());
                    (Some(va), None, None)
                }
                "VA_MANDIRI" => {
                    let va = format!("70014{:07}", (payload.gross_amount % 1_000_000).abs());
                    (Some(va), None, None)
                }
                "VA_PERMATA" => {
                    let va = format!("85280{:07}", (payload.gross_amount % 1_000_000).abs());
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
                        Some("https://api.sandbox.midtrans.com/v2/qris/sample.png".to_string()),
                    )
                }
                _ => (
                    Some(format!(
                        "70099{:07}",
                        (payload.gross_amount % 1_000_000).abs()
                    )),
                    None,
                    None,
                ),
            };

            let raw_res = serde_json::json!({
                "status_code": "201",
                "status_message": "Success, Bank Transfer transaction is created",
                "transaction_id": ref_id,
                "order_id": payload.order_id,
                "merchant_id": "G123456789",
                "gross_amount": format!("{}.00", payload.gross_amount),
                "currency": "IDR",
                "payment_type": if payload.payment_method == "QRIS" { "qris" } else { "bank_transfer" },
                "transaction_time": Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                "transaction_status": "pending",
                "va_numbers": if let Some(ref va) = nomor_va {
                    serde_json::json!([{ "bank": "bca", "va_number": va }])
                } else {
                    serde_json::json!([])
                },
                "actions": if let Some(ref qr) = qr_string {
                    serde_json::json!([{
                        "name": "generate-qr-code",
                        "method": "GET",
                        "url": qr
                    }])
                } else {
                    serde_json::json!([])
                }
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
            Ok(GatewayStatusResponse {
                order_id: order_id.to_string(),
                status: "PENDING".to_string(),
                gross_amount: 250_000,
                paid_at: None,
                payment_method: "bank_transfer".to_string(),
                raw_response: serde_json::json!({
                    "status_code": "201",
                    "transaction_status": "pending",
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
        let raw = format!(
            "{}{}{}{}",
            order_id, status_code, gross_amount, self.server_key
        );
        let mut hasher = Sha512::new();
        hasher.update(raw.as_bytes());
        let expected = hex::encode(hasher.finalize());
        expected.eq_ignore_ascii_case(signature)
    }

    fn provider_name(&self) -> &'static str {
        "MIDTRANS"
    }
}
