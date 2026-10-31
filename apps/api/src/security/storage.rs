use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use utoipa::ToSchema;

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone, Debug)]
pub struct StorageService {
    pub endpoint: String,
    pub access_key: String,
    pub secret_key: String,
    pub bucket: String,
    pub region: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PresignedUploadResponse {
    pub upload_url: String,
    pub file_key: String,
    pub expires_in_seconds: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PresignedDownloadResponse {
    pub download_url: String,
    pub file_key: String,
    pub expires_in_seconds: u64,
}

impl StorageService {
    pub fn new(endpoint: String, access_key: String, secret_key: String, bucket: String) -> Self {
        Self {
            endpoint: endpoint.trim_end_matches('/').to_string(),
            access_key,
            secret_key,
            bucket,
            region: "us-east-1".to_string(),
        }
    }

    /// Menghasilkan AWS SigV4 Presigned URL untuk unggah file langsung (PUT) dari klien ke MinIO
    pub fn generate_presigned_put_url(
        &self,
        object_key: &str,
        expires_seconds: u64,
    ) -> PresignedUploadResponse {
        let clean_key = object_key.trim_start_matches('/');
        let now = Utc::now();
        let url = self.sign_url("PUT", clean_key, expires_seconds, now);

        PresignedUploadResponse {
            upload_url: url,
            file_key: clean_key.to_string(),
            expires_in_seconds: expires_seconds,
        }
    }

    /// Menghasilkan AWS SigV4 Presigned URL untuk unduh/pratinjau file privat (GET) dari MinIO
    pub fn generate_presigned_get_url(
        &self,
        object_key: &str,
        expires_seconds: u64,
    ) -> PresignedDownloadResponse {
        let clean_key = object_key.trim_start_matches('/');
        let now = Utc::now();
        let url = self.sign_url("GET", clean_key, expires_seconds, now);

        PresignedDownloadResponse {
            download_url: url,
            file_key: clean_key.to_string(),
            expires_in_seconds: expires_seconds,
        }
    }

    fn sign_url(
        &self,
        method: &str,
        object_key: &str,
        expires_seconds: u64,
        datetime: DateTime<Utc>,
    ) -> String {
        let date_stamp = datetime.format("%Y%m%d").to_string();
        let amz_date = datetime.format("%Y%m%dT%H%M%SZ").to_string();

        // Ekstrak host dari endpoint (contoh: http://localhost:9000 -> localhost:9000)
        let host = self
            .endpoint
            .trim_start_matches("http://")
            .trim_start_matches("https://")
            .split('/')
            .next()
            .unwrap_or("localhost:9000");

        let credential_scope = format!("{}/{}/s3/aws4_request", date_stamp, self.region);
        let credential_param = format!("{}/{}", self.access_key, credential_scope);

        // Encoding aman URL untuk parameter query AWS SigV4
        let encoded_credential = credential_param.replace('/', "%2F");

        let canonical_uri = format!("/{}/{}", self.bucket, object_key);

        // Query string harus diurutkan secara alfabetis berdasarkan kunci
        let canonical_query_string = format!(
            "X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential={}&X-Amz-Date={}&X-Amz-Expires={}&X-Amz-SignedHeaders=host",
            encoded_credential, amz_date, expires_seconds
        );

        let canonical_headers = format!("host:{}\n", host);
        let signed_headers = "host";
        let payload_hash = "UNSIGNED-PAYLOAD";

        let canonical_request = format!(
            "{}\n{}\n{}\n{}\n{}\n{}",
            method,
            canonical_uri,
            canonical_query_string,
            canonical_headers,
            signed_headers,
            payload_hash
        );

        let mut hasher = Sha256::new();
        hasher.update(canonical_request.as_bytes());
        let canonical_request_hash = hex::encode(hasher.finalize());

        let string_to_sign = format!(
            "AWS4-HMAC-SHA256\n{}\n{}\n{}",
            amz_date, credential_scope, canonical_request_hash
        );

        // Turunan Kunci Penandatanganan AWS SigV4
        let signing_key = self.get_signature_key(&date_stamp);
        let mut mac =
            HmacSha256::new_from_slice(&signing_key).expect("HMAC can take key of any size");
        mac.update(string_to_sign.as_bytes());
        let signature = hex::encode(mac.finalize().into_bytes());

        format!(
            "{}{}?{}&X-Amz-Signature={}",
            self.endpoint, canonical_uri, canonical_query_string, signature
        )
    }

    fn get_signature_key(&self, date_stamp: &str) -> Vec<u8> {
        let k_secret = format!("AWS4{}", self.secret_key);
        let k_date = hmac_sha256(k_secret.as_bytes(), date_stamp.as_bytes());
        let k_region = hmac_sha256(&k_date, self.region.as_bytes());
        let k_service = hmac_sha256(&k_region, b"s3");
        hmac_sha256(&k_service, b"aws4_request")
    }
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
    let mut mac = HmacSha256::new_from_slice(key).expect("HMAC can take key of any size");
    mac.update(data);
    mac.finalize().into_bytes().to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_presigned_put_and_get() {
        let storage = StorageService::new(
            "http://localhost:9000".to_string(),
            "minioadmin".to_string(),
            "minioadmin".to_string(),
            "pmb-berkas".to_string(),
        );

        let put_res = storage.generate_presigned_put_url("berkas/test/foto.jpg", 900);
        assert!(
            put_res
                .upload_url
                .contains("http://localhost:9000/pmb-berkas/berkas/test/foto.jpg")
        );
        assert!(
            put_res
                .upload_url
                .contains("X-Amz-Algorithm=AWS4-HMAC-SHA256")
        );
        assert!(put_res.upload_url.contains("X-Amz-Signature="));
        assert_eq!(put_res.file_key, "berkas/test/foto.jpg");

        let get_res = storage.generate_presigned_get_url("berkas/test/foto.jpg", 900);
        assert!(
            get_res
                .download_url
                .contains("http://localhost:9000/pmb-berkas/berkas/test/foto.jpg")
        );
        assert!(
            get_res
                .download_url
                .contains("X-Amz-Algorithm=AWS4-HMAC-SHA256")
        );
        assert!(get_res.download_url.contains("X-Amz-Signature="));
    }
}
