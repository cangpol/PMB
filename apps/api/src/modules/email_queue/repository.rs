use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone, Debug, sqlx::FromRow)]
pub struct AntreanEmail {
    pub id: Uuid,
    pub to_email: String,
    pub to_name: String,
    pub subject: String,
    pub body_text: String,
    pub body_html: String,
    pub tipe_notifikasi: String,
    pub pendaftar_id: Option<Uuid>,
    pub status: String,
    pub attempts: i32,
    pub max_attempts: i32,
    pub error_message: Option<String>,
}

#[derive(Clone)]
pub struct EmailQueueRepository {
    pool: PgPool,
}

impl EmailQueueRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Memasukkan notifikasi email ke antrean (non-blocking)
    pub async fn enqueue(
        &self,
        to_email: &str,
        to_name: &str,
        subject: &str,
        body_text: &str,
        body_html: &str,
        tipe_notifikasi: &str,
        pendaftar_id: Option<Uuid>,
    ) -> Result<Uuid, sqlx::Error> {
        let rec = sqlx::query_scalar::<_, Uuid>(
            "INSERT INTO antrean_email (to_email, to_name, subject, body_text, body_html, tipe_notifikasi, pendaftar_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
             RETURNING id"
        )
        .bind(to_email)
        .bind(to_name)
        .bind(subject)
        .bind(body_text)
        .bind(body_html)
        .bind(tipe_notifikasi)
        .bind(pendaftar_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(rec)
    }

    /// Mengambil sejumlah email berstatus PENDING untuk diproses
    pub async fn fetch_pending(&self, limit: i64) -> Result<Vec<AntreanEmail>, sqlx::Error> {
        sqlx::query_as::<_, AntreanEmail>(
            "SELECT id, to_email, to_name, subject, body_text, body_html, tipe_notifikasi, pendaftar_id, status, attempts, max_attempts, error_message
             FROM antrean_email
             WHERE status = 'PENDING' AND attempts < max_attempts
             ORDER BY created_at ASC
             LIMIT $1"
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await
    }

    /// Menandai email berhasil terkirim
    pub async fn mark_sent(&self, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE antrean_email
             SET status = 'SENT', processed_at = NOW(), error_message = NULL
             WHERE id = $1",
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Menandai email gagal dan menambah counter attempts
    pub async fn mark_failed(&self, id: Uuid, error_msg: &str) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE antrean_email
             SET attempts = attempts + 1,
                 status = CASE WHEN attempts + 1 >= max_attempts THEN 'FAILED' ELSE 'PENDING' END,
                 error_message = $2,
                 processed_at = NOW()
             WHERE id = $1",
        )
        .bind(id)
        .bind(error_msg)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
