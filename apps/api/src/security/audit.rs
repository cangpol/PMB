use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

/// Mencatat aktivitas perubahan data krusial oleh staf/admin ke tabel audit_logs
pub async fn record_audit_log(
    db: &PgPool,
    user_id: Option<Uuid>,
    action: &str,
    entity_name: &str,
    entity_id: Option<Uuid>,
    payload_before: Option<serde_json::Value>,
    payload_after: Option<serde_json::Value>,
) -> Result<(), AppError> {
    let _ = sqlx::query(
        "INSERT INTO audit_logs (user_id, action, entity_name, entity_id, payload_before, payload_after)
         VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(user_id)
    .bind(action)
    .bind(entity_name)
    .bind(entity_id)
    .bind(payload_before)
    .bind(payload_after)
    .execute(db)
    .await;

    Ok(())
}
