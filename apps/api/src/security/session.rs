use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SessionUser {
    pub user_id: Uuid,
    pub email: String,
    pub role: String,
    pub nama_lengkap: String,
}

#[derive(Clone)]
pub struct SessionStore {
    memory_store: Arc<RwLock<HashMap<String, SessionUser>>>,
}

impl SessionStore {
    pub fn new() -> Self {
        Self {
            memory_store: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn create_session(&self, user: SessionUser) -> String {
        let session_id = Uuid::new_v4().to_string();
        let mut store = self.memory_store.write().await;
        store.insert(session_id.clone(), user);
        session_id
    }

    pub async fn get_session(&self, session_id: &str) -> Option<SessionUser> {
        let store = self.memory_store.read().await;
        store.get(session_id).cloned()
    }

    pub async fn destroy_session(&self, session_id: &str) {
        let mut store = self.memory_store.write().await;
        store.remove(session_id);
    }

    pub async fn destroy_sessions_by_user_id(&self, user_id: &Uuid) {
        let mut store = self.memory_store.write().await;
        store.retain(|_, u| u.user_id != *user_id);
    }
}

impl Default for SessionStore {
    fn default() -> Self {
        Self::new()
    }
}
