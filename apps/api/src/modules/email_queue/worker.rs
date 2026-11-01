use sqlx::PgPool;
use std::sync::Arc;
use tokio::time::{Duration, sleep};
use tracing::{error, info};

use super::repository::EmailQueueRepository;
use crate::security::MailSender;

/// Worker asinkron di latar belakang yang memproses antrean email secara teratur
pub async fn start_email_worker(pool: PgPool, mail_sender: Arc<dyn MailSender>) {
    let repo = EmailQueueRepository::new(pool);
    info!("Background worker antrean email PMB telah aktif");

    loop {
        // Ambil maksimal 10 pekerjaan email yang menunggu pengiriman
        match repo.fetch_pending(10).await {
            Ok(jobs) => {
                for job in jobs {
                    match mail_sender
                        .send_email(&job.to_email, &job.subject, &job.body_html)
                        .await
                    {
                        Ok(_) => {
                            if let Err(e) = repo.mark_sent(job.id).await {
                                error!("Gagal memperbarui status email terkirim: {:?}", e);
                            }
                        }
                        Err(e) => {
                            error!("Gagal mengirim email ke {}: {:?}", job.to_email, e);
                            let _ = repo.mark_failed(job.id, &e.to_string()).await;
                        }
                    }
                }
            }
            Err(e) => {
                error!("Gagal mengambil antrean email dari database: {:?}", e);
            }
        }

        // Istirahat sejenak sebelum memeriksa antrean berikutnya
        sleep(Duration::from_secs(5)).await;
    }
}
