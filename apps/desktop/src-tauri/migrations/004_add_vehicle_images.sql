-- Migration 004: Add images column to vehicles table
-- Stores JSON array of image URLs/paths

ALTER TABLE vehicles ADD COLUMN images TEXT;

