use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use uuid::Uuid;

/// Sesi tak dipakai selama ini -> berakhir (default 2 jam).
pub const BATAS_DIAM_DETIK: u64 = 2 * 3600;
/// Umur maksimum sebuah sesi sejak login, seaktif apa pun (default 12 jam).
pub const BATAS_MUTLAK_DETIK: u64 = 12 * 3600;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SessionUser {
    pub user_id: Uuid,
    pub email: String,
    pub role: String,
    pub nama_lengkap: String,
}

#[derive(Clone)]
struct Entri {
    user: SessionUser,
    dibuat: Instant,
    terakhir_dipakai: Instant,
}

/// Penyimpanan sesi di memori server. Sesi hilang saat server dimulai ulang
/// (semua pengguna wajib login lagi) dan berakhir sendiri bila tidak dipakai
/// (`batas_diam`) atau terlalu lama (`batas_mutlak`).
#[derive(Clone)]
pub struct SessionStore {
    memory_store: Arc<RwLock<HashMap<String, Entri>>>,
    batas_diam: Duration,
    batas_mutlak: Duration,
}

impl SessionStore {
    pub fn new() -> Self {
        Self::dengan_batas(
            Duration::from_secs(BATAS_DIAM_DETIK),
            Duration::from_secs(BATAS_MUTLAK_DETIK),
        )
    }

    pub fn dengan_batas(batas_diam: Duration, batas_mutlak: Duration) -> Self {
        Self {
            memory_store: Arc::new(RwLock::new(HashMap::new())),
            batas_diam,
            batas_mutlak,
        }
    }

    fn kedaluwarsa(&self, e: &Entri, sekarang: Instant) -> bool {
        sekarang.duration_since(e.terakhir_dipakai) >= self.batas_diam
            || sekarang.duration_since(e.dibuat) >= self.batas_mutlak
    }

    pub async fn create_session(&self, user: SessionUser) -> String {
        let session_id = Uuid::new_v4().to_string();
        let sekarang = Instant::now();
        let mut store = self.memory_store.write().await;
        store.insert(
            session_id.clone(),
            Entri {
                user,
                dibuat: sekarang,
                terakhir_dipakai: sekarang,
            },
        );
        session_id
    }

    /// Ambil sesi yang masih berlaku dan perpanjang masa diamnya. Sesi yang
    /// sudah kedaluwarsa dihapus dan dianggap tidak ada.
    pub async fn get_session(&self, session_id: &str) -> Option<SessionUser> {
        let sekarang = Instant::now();
        let mut store = self.memory_store.write().await;
        let kedaluwarsa = match store.get(session_id) {
            None => return None,
            Some(e) => self.kedaluwarsa(e, sekarang),
        };
        if kedaluwarsa {
            store.remove(session_id);
            return None;
        }
        let e = store.get_mut(session_id)?;
        e.terakhir_dipakai = sekarang;
        Some(e.user.clone())
    }

    pub async fn destroy_session(&self, session_id: &str) {
        let mut store = self.memory_store.write().await;
        store.remove(session_id);
    }

    pub async fn destroy_sessions_by_user_id(&self, user_id: &Uuid) {
        let mut store = self.memory_store.write().await;
        store.retain(|_, e| e.user.user_id != *user_id);
    }

    /// Buang semua sesi kedaluwarsa (dipanggil berkala agar memori tidak membengkak).
    pub async fn purge_expired(&self) -> usize {
        let sekarang = Instant::now();
        let mut store = self.memory_store.write().await;
        let sebelum = store.len();
        store.retain(|_, e| !self.kedaluwarsa(e, sekarang));
        sebelum - store.len()
    }

    #[cfg(test)]
    async fn jumlah(&self) -> usize {
        self.memory_store.read().await.len()
    }
}

impl Default for SessionStore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pengguna() -> SessionUser {
        SessionUser {
            user_id: Uuid::new_v4(),
            email: "a@contoh.id".into(),
            role: "calon_mahasiswa".into(),
            nama_lengkap: "A".into(),
        }
    }

    #[tokio::test]
    async fn sesi_valid_dapat_dibaca() {
        let s = SessionStore::new();
        let id = s.create_session(pengguna()).await;
        assert!(s.get_session(&id).await.is_some());
        assert!(s.get_session("tidak-ada").await.is_none());
    }

    #[tokio::test]
    async fn sesi_berakhir_bila_tidak_dipakai() {
        let s = SessionStore::dengan_batas(Duration::from_millis(80), Duration::from_secs(60));
        let id = s.create_session(pengguna()).await;
        tokio::time::sleep(Duration::from_millis(120)).await;
        assert!(
            s.get_session(&id).await.is_none(),
            "sesi diam harus berakhir"
        );
        assert_eq!(s.jumlah().await, 0, "sesi kedaluwarsa harus dihapus");
    }

    #[tokio::test]
    async fn pemakaian_memperpanjang_masa_diam() {
        let s = SessionStore::dengan_batas(Duration::from_millis(150), Duration::from_secs(60));
        let id = s.create_session(pengguna()).await;
        for _ in 0..4 {
            tokio::time::sleep(Duration::from_millis(80)).await;
            assert!(
                s.get_session(&id).await.is_some(),
                "sesi aktif harus tetap hidup"
            );
        }
    }

    #[tokio::test]
    async fn sesi_berakhir_setelah_batas_mutlak_walau_aktif() {
        let s = SessionStore::dengan_batas(Duration::from_secs(60), Duration::from_millis(150));
        let id = s.create_session(pengguna()).await;
        tokio::time::sleep(Duration::from_millis(90)).await;
        assert!(s.get_session(&id).await.is_some());
        tokio::time::sleep(Duration::from_millis(90)).await;
        assert!(
            s.get_session(&id).await.is_none(),
            "umur mutlak harus ditegakkan"
        );
    }

    #[tokio::test]
    async fn purge_membuang_sesi_kedaluwarsa_saja() {
        let s = SessionStore::dengan_batas(Duration::from_millis(80), Duration::from_secs(60));
        let lama = s.create_session(pengguna()).await;
        tokio::time::sleep(Duration::from_millis(120)).await;
        let baru = s.create_session(pengguna()).await;
        assert_eq!(s.purge_expired().await, 1);
        assert!(s.get_session(&lama).await.is_none());
        assert!(s.get_session(&baru).await.is_some());
    }

    #[tokio::test]
    async fn destroy_berdasarkan_pengguna() {
        let s = SessionStore::new();
        let u = pengguna();
        let a = s.create_session(u.clone()).await;
        let b = s.create_session(u.clone()).await;
        let lain = s.create_session(pengguna()).await;
        s.destroy_sessions_by_user_id(&u.user_id).await;
        assert!(s.get_session(&a).await.is_none());
        assert!(s.get_session(&b).await.is_none());
        assert!(s.get_session(&lain).await.is_some());
    }
}
