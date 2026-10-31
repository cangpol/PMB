use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;

use crate::error::AppError;

#[derive(Clone, Default)]
pub struct RateLimiter {
    // Menyimpan riwayat timestamp permintaan per kunci (IP / identifier)
    records: Arc<RwLock<HashMap<String, Vec<Instant>>>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            records: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Memeriksa apakah permintaan melampaui batas frekuensi
    pub async fn check_rate_limit(
        &self,
        key: &str,
        max_attempts: usize,
        window_seconds: u64,
    ) -> Result<(), AppError> {
        let now = Instant::now();
        let window = Duration::from_secs(window_seconds);
        let mut map = self.records.write().await;

        let timestamps = map.entry(key.to_string()).or_default();

        // Buang riwayat di luar jendela waktu
        timestamps.retain(|&t| now.duration_since(t) < window);

        if timestamps.len() >= max_attempts {
            return Err(AppError::TooManyRequests(format!(
                "Terlalu banyak percobaan pada endpoint ini. Maksimal {} kali per {} detik. Silakan coba lagi nanti.",
                max_attempts, window_seconds
            )));
        }

        // Catat percobaan saat ini
        timestamps.push(now);
        Ok(())
    }
}
