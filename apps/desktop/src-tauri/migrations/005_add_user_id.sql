-- Migration 005: Add user_id to all tables for user isolation
-- Ensures each user can only see their own data

-- Add user_id to clients
ALTER TABLE clients ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);

-- Add user_id to vehicles
ALTER TABLE vehicles ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);

-- Add user_id to deals
ALTER TABLE deals ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_deals_user ON deals(user_id);

-- Add user_id to documents
ALTER TABLE documents ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);

-- Update existing records: Set user_id to NULL for now (will be set on next sync/create)
-- In production, you may want to migrate existing data to a default user

