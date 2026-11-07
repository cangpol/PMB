use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

/// Mencatat aktivitas perubahan data krusial oleh staf/admin ke tabel `audit_logs`.
///
/// Skema tabel (migrasi init): `user_id, action, entity_type, entity_id (teks), details_json (teks)`.
/// Kegagalan menulis audit tidak menggagalkan aksi utama, tetapi dicatat sebagai peringatan
/// agar tidak lagi hilang tanpa jejak.
pub async fn record_audit_log(
    db: &PgPool,
    user_id: Option<Uuid>,
    action: &str,
    entity_name: &str,
    entity_id: Option<Uuid>,
    payload_before: Option<serde_json::Value>,
    payload_after: Option<serde_json::Value>,
) -> Result<(), AppError> {
    let details = serde_json::json!({
        "before": payload_before,
        "after": payload_after,
    });

    if let Err(err) = sqlx::query(
        "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(user_id)
    .bind(action)
    .bind(entity_name)
    .bind(entity_id.map(|id| id.to_string()).unwrap_or_default())
    .bind(details.to_string())
    .execute(db)
    .await
    {
        tracing::warn!(action, entity_name, error = %err, "Gagal menulis audit_logs");
    }

    Ok(())
}
