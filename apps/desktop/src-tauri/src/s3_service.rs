// src-tauri/src/s3_service.rs
// S3 service for document upload/download sync

use aws_credential_types::Credentials;
use aws_sdk_s3::{Client as S3Client, Config, config::Region};
use log::{error, info};

use crate::aws_config;

/// Get S3 client configured with stored credentials
async fn get_s3_client() -> Result<S3Client, String> {
    let access_key_id = aws_config::get_aws_access_key_id()
        .await?
        .ok_or_else(|| "AWS access key ID not configured".to_string())?;

    let secret_access_key = aws_config::get_aws_secret_access_key()
        .await?
        .ok_or_else(|| "AWS secret access key not configured".to_string())?;

    let region_str = aws_config::get_aws_region()
        .await?
        .unwrap_or_else(|| "us-east-1".to_string());

    let region = Region::new(region_str.clone());

    let credentials = Credentials::new(
        access_key_id,
        secret_access_key,
        None,
        None,
        "dealer-software",
    );

    let config = Config::builder()
        .region(region)
        .credentials_provider(credentials)
        .build();

    let client = S3Client::from_conf(config);

    info!("✅ [S3] S3 client configured for region: {}", region_str);
    Ok(client)
}

/// Get bucket name from secure storage
async fn get_bucket_name() -> Result<String, String> {
    aws_config::get_aws_bucket_name()
        .await?
        .ok_or_else(|| "AWS bucket name not configured".to_string())
}

/// Generate S3 key for standalone document
/// Format: standalone/{userId}/deals/{dealId}/documents/{documentId}_{filename}
fn generate_s3_key(user_id: &str, deal_id: &str, document_id: &str, filename: &str) -> String {
    format!(
        "standalone/{}/deals/{}/documents/{}_{}",
        user_id, deal_id, document_id, filename
    )
}

/// Upload document to S3
#[tauri::command]
pub async fn s3_upload_document(
    user_id: String,
    deal_id: String,
    document_id: String,
    filename: String,
    file_data: Vec<u8>,
) -> Result<String, String> {
    info!("📤 [S3] Uploading document to S3: {}", filename);

    let client = get_s3_client().await?;
    let bucket = get_bucket_name().await?;
    let s3_key = generate_s3_key(&user_id, &deal_id, &document_id, &filename);

    let body = aws_sdk_s3::primitives::ByteStream::from(file_data);

    match client
        .put_object()
        .bucket(&bucket)
        .key(&s3_key)
        .body(body)
        .content_type("application/pdf")
        .send()
        .await
    {
        Ok(_) => {
            info!("✅ [S3] Document uploaded successfully: {}", s3_key);
            Ok(s3_key)
        }
        Err(e) => {
            error!("❌ [S3] Failed to upload document: {}", e);
            Err(format!("Failed to upload document to S3: {}", e))
        }
    }
}

/// Download document from S3
#[tauri::command]
pub async fn s3_download_document(s3_key: String) -> Result<Vec<u8>, String> {
    info!("📥 [S3] Downloading document from S3: {}", s3_key);

    let client = get_s3_client().await?;
    let bucket = get_bucket_name().await?;

    match client
        .get_object()
        .bucket(&bucket)
        .key(&s3_key)
        .send()
        .await
    {
        Ok(response) => {
            let mut data = Vec::new();
            let mut body_stream = response.body;
            while let Some(chunk_result) = body_stream.next().await {
                match chunk_result {
                    Ok(chunk) => data.extend_from_slice(&chunk),
                    Err(e) => {
                        error!("❌ [S3] Error reading response body: {}", e);
                        return Err(format!("Failed to read S3 response: {}", e));
                    }
                }
            }

            info!("✅ [S3] Document downloaded successfully: {} bytes", data.len());
            Ok(data)
        }
        Err(e) => {
            error!("❌ [S3] Failed to download document: {}", e);
            Err(format!("Failed to download document from S3: {}", e))
        }
    }
}

/// Delete document from S3
#[tauri::command]
pub async fn s3_delete_document(s3_key: String) -> Result<(), String> {
    info!("🗑️ [S3] Deleting document from S3: {}", s3_key);

    let client = get_s3_client().await?;
    let bucket = get_bucket_name().await?;

    match client
        .delete_object()
        .bucket(&bucket)
        .key(&s3_key)
        .send()
        .await
    {
        Ok(_) => {
            info!("✅ [S3] Document deleted successfully: {}", s3_key);
            Ok(())
        }
        Err(e) => {
            error!("❌ [S3] Failed to delete document: {}", e);
            Err(format!("Failed to delete document from S3: {}", e))
        }
    }
}

/// Check if document exists in S3
#[tauri::command]
pub async fn s3_document_exists(s3_key: String) -> Result<bool, String> {
    let client = get_s3_client().await?;
    let bucket = get_bucket_name().await?;

    match client
        .head_object()
        .bucket(&bucket)
        .key(&s3_key)
        .send()
        .await
    {
        Ok(_) => Ok(true),
        Err(e) => {
            // Check if error is "NoSuchKey" by checking the error message
            let error_msg = e.to_string();
            if error_msg.contains("NoSuchKey") || error_msg.contains("not found") {
                Ok(false)
            } else {
                error!("❌ [S3] Error checking document existence: {}", e);
                Err(format!("Failed to check document existence: {}", e))
            }
        }
    }
}

