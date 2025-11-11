# SQLite Migration - Next Steps

## Current Status

### ✅ Completed
1. **SQLite Dependencies**: Added `rusqlite` and `chrono` to Cargo.toml
2. **Database Module**: Created `src-tauri/src/database.rs` with:
   - Database initialization
   - Migration system
   - Client CRUD operations (partial)
3. **Storage Paths**: Updated to use:
   - Dev: `apps/desktop/db/dealer.db`
   - Prod: `{app_data_dir}/dealer.db`
   - Documents: User's Documents directory
4. **SQL Migrations**: Created 3 migration files with schema

### 🚧 Immediate Next Steps

#### 1. Fix Compilation Errors
- Fix `ends_with` method call (PathBuf doesn't have this)
- Complete Client operations
- Add Vehicle, Deal, Document CRUD operations
- Register Tauri commands in `main.rs`

#### 2. Complete Database Operations
The database.rs file needs:
- Complete Vehicle struct and CRUD
- Complete Deal struct and CRUD  
- Complete Document struct and CRUD with file storage
- All operations following the Client pattern

#### 3. Register Commands
Add all database commands to `main.rs` invoke_handler:
```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    // Database commands
    db_create_client,
    db_get_client,
    db_get_all_clients,
    db_update_client,
    db_delete_client,
    db_search_clients,
    // Vehicle commands (to be added)
    // Deal commands (to be added)
    // Document commands (to be added)
])
```

#### 4. Create TypeScript Wrappers
Create new service files that call Tauri commands instead of IndexedDB:
- `apps/desktop/src/lib/sqlite/local-clients-service.ts`
- `apps/desktop/src/lib/sqlite/local-vehicles-service.ts`
- `apps/desktop/src/lib/sqlite/local-deals-service.ts`
- `apps/desktop/src/lib/sqlite/local-documents-service.ts`

#### 5. Migration Script
Create `apps/desktop/src/lib/migration/indexeddb-to-sqlite.ts`:
- Export all IndexedDB data
- Call Tauri commands to import to SQLite
- Verify data integrity
- Optionally clear IndexedDB

#### 6. Update Components
Update all components to use new SQLite services instead of IndexedDB services.

## File Structure

```
apps/desktop/
├── db/                          # SQLite DB location (dev only)
│   └── dealer.db
├── src-tauri/
│   ├── src/
│   │   ├── database.rs          # ✅ Created (needs completion)
│   │   ├── storage.rs           # ✅ Updated
│   │   └── main.rs              # ⚠️ Needs command registration
│   └── migrations/
│       ├── 001_initial_schema.sql    # ✅ Created
│       ├── 002_add_sync_fields.sql   # ✅ Created
│       └── 003_add_document_paths.sql # ✅ Created
└── src/
    └── lib/
        ├── sqlite/              # 📋 To be created
        │   ├── local-clients-service.ts
        │   ├── local-vehicles-service.ts
        │   ├── local-deals-service.ts
        │   └── local-documents-service.ts
        └── migration/           # 📋 To be created
            └── indexeddb-to-sqlite.ts
```

## Sync Architecture (Future Phase)

### Components Needed
1. **S3 Integration**: For document storage
   - Upload PDFs to S3
   - Download PDFs from S3
   - Track S3 keys in database

2. **Convex Sync**: For metadata sync
   - Sync clients, vehicles, deals metadata
   - Track sync state
   - Handle conflicts

3. **Sync Engine**: Orchestrates sync
   - Periodic sync (every N minutes)
   - Manual sync trigger
   - Conflict resolution UI
   - Multi-device support

### Sync Flow
```
Local SQLite → Convex (metadata) → Other Devices
                ↓
              S3 (documents)
```

## Testing Plan

1. **Unit Tests**: Test each CRUD operation
2. **Integration Tests**: Test full workflows
3. **Migration Test**: Test IndexedDB → SQLite migration
4. **Sync Test**: Test sync with Convex/S3
5. **Performance Test**: Test with large datasets (50k+ records)

## Estimated Timeline

- **Phase 1** (Database Setup): ✅ Done
- **Phase 2** (CRUD Operations): 2-3 days
- **Phase 3** (TypeScript Integration): 1-2 days  
- **Phase 4** (Migration Script): 1 day
- **Phase 5** (Sync Infrastructure): 3-5 days

**Total**: ~1-2 weeks for complete migration

