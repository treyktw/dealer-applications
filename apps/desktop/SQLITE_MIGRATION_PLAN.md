# SQLite Migration Plan

## Overview
Migrating from IndexedDB to SQLite for better debuggability, predictability, query power, and sync capabilities.

## Architecture

### Database Location
- **Development**: `apps/desktop/db/dealer.db` (in app root)
- **Production**: `{app_data_dir}/dealer.db` (platform-specific app data directory)

### Document Storage
- **Default**: User's Documents directory → `Documents/Dealer Software/`
- **Custom**: User can choose custom location via settings
- Files stored as: `{documents_path}/{dealId}/{documentId}_{filename}.pdf`

## Implementation Status

### ✅ Completed
1. Added SQLite dependencies (`rusqlite`, `chrono`)
2. Created database module structure (`src-tauri/src/database.rs`)
3. Created SQL migration files (001-003)
4. Updated storage paths for dev/prod
5. Created document storage path logic

### 🚧 In Progress
1. Complete database.rs with all CRUD operations
2. Add Tauri commands to main.rs
3. Create TypeScript service wrappers

### 📋 TODO
1. Complete Vehicle CRUD operations
2. Complete Deal CRUD operations  
3. Complete Document CRUD operations
4. Create IndexedDB → SQLite migration script
5. Update TypeScript services to use Tauri commands
6. Create sync infrastructure (S3 + Convex)
7. Add conflict resolution logic
8. Add backup/restore functionality

## Database Schema

### Tables
- `clients` - Client information
- `vehicles` - Vehicle inventory
- `deals` - Deal records
- `documents` - Document metadata (files stored on disk)
- `settings` - App settings
- `schema_migrations` - Migration tracking
- `sync_log` - Sync operation log

### Key Features
- Foreign key constraints
- Indexes for performance
- WAL mode for concurrency
- Sync versioning for conflict resolution
- Timestamps for all records

## Sync Architecture (Future)

### Components
1. **Local SQLite** - Source of truth locally
2. **S3 Storage** - Document storage (PDFs)
3. **Convex Backend** - Metadata and sync coordination
4. **Sync Engine** - Handles bidirectional sync with conflict resolution

### Sync Flow
1. Local changes tracked via `sync_version` and `synced_at`
2. Periodic sync uploads changes to Convex
3. Convex coordinates with S3 for document sync
4. Download changes from other devices
5. Conflict resolution using last-write-wins or manual merge

## Migration Steps

### Phase 1: Database Setup ✅
- [x] Add SQLite dependencies
- [x] Create database module
- [x] Create migration system
- [x] Set up paths

### Phase 2: CRUD Operations 🚧
- [ ] Complete Client operations
- [ ] Complete Vehicle operations
- [ ] Complete Deal operations
- [ ] Complete Document operations
- [ ] Add Tauri commands

### Phase 3: TypeScript Integration
- [ ] Create Tauri command wrappers
- [ ] Update local-storage services
- [ ] Update all components to use new services
- [ ] Remove IndexedDB code

### Phase 4: Migration Script
- [ ] Export IndexedDB data
- [ ] Import to SQLite
- [ ] Verify data integrity
- [ ] Clean up IndexedDB

### Phase 5: Sync Infrastructure
- [ ] Design sync protocol
- [ ] Implement S3 document sync
- [ ] Implement Convex metadata sync
- [ ] Add conflict resolution
- [ ] Add multi-device support

## Testing Checklist

- [ ] Create client
- [ ] Read client
- [ ] Update client
- [ ] Delete client
- [ ] Search clients
- [ ] Same for vehicles and deals
- [ ] Document storage and retrieval
- [ ] Migration from IndexedDB
- [ ] Sync operations
- [ ] Conflict resolution

## Notes

- SQLite file is visible in `db/` folder during development
- In production, database is in app data directory
- Documents are stored separately on disk (not in database)
- Sync will use Convex for metadata and S3 for file storage
- Backup = copy SQLite file + documents directory

