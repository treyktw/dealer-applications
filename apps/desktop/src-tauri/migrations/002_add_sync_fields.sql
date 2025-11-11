-- Migration 002: Add sync fields
-- Adds sync metadata for conflict resolution and multi-device sync

-- Add sync fields to clients
ALTER TABLE clients ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE clients ADD COLUMN sync_conflict TEXT; -- JSON object for conflict resolution

-- Add sync fields to vehicles
ALTER TABLE vehicles ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE vehicles ADD COLUMN sync_conflict TEXT;

-- Add sync fields to deals
ALTER TABLE deals ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE deals ADD COLUMN sync_conflict TEXT;

-- Add sync fields to documents
ALTER TABLE documents ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN sync_conflict TEXT;

-- Create sync log table for tracking sync operations
CREATE TABLE IF NOT EXISTS sync_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'client', 'vehicle', 'deal', 'document'
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'create', 'update', 'delete'
    sync_direction TEXT NOT NULL, -- 'upload', 'download'
    synced_at INTEGER NOT NULL,
    success INTEGER NOT NULL DEFAULT 1, -- 1 for success, 0 for failure
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_synced ON sync_log(synced_at DESC);

