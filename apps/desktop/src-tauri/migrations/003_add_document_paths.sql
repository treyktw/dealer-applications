-- Migration 003: Add document file paths
-- Ensures file_path column exists (may have been added in 001, but this ensures it)

-- Note: file_path was already added in migration 001, but this migration
-- ensures backward compatibility and adds any missing indexes

CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);

-- Add file size and checksum for integrity checking
ALTER TABLE documents ADD COLUMN file_size INTEGER;
ALTER TABLE documents ADD COLUMN file_checksum TEXT; -- SHA-256 hash

