use axum::{
    Json,
    extract::{FromRequest, Request, rejection::JsonRejection},
};
use serde::de::DeserializeOwned;
use validator::Validate;

use crate::error::AppError;

pub struct ValidatedJson<T>(pub T);

impl<S, T> FromRequest<S> for ValidatedJson<T>
where
    S: Send + Sync,
    T: DeserializeOwned + Validate + 'static,
{
    type Rejection = AppError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        let Json(payload) = Json::<T>::from_request(req, state)
            .await
            .map_err(|err: JsonRejection| AppError::BadRequest(err.to_string()))?;

        if let Err(errors) = payload.validate() {
            let mut messages = Vec::new();
            for (field, err_kind) in errors.field_errors() {
                for err in err_kind {
                    let msg = err
                        .message
                        .as_ref()
                        .map(|m| format!("{field}: {m}"))
                        .unwrap_or_else(|| format!("{field}: data tidak valid"));
                    messages.push(msg);
                }
            }
            return Err(AppError::Validation(messages));
        }

        Ok(ValidatedJson(payload))
    }
}
