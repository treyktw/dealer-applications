# IndexedDB → SQLite Migration Guide

## Overview
This document tracks the migration from IndexedDB to SQLite for all data storage.

## Migration Status

### ✅ Completed
- SQLite database module created
- SQLite CRUD operations implemented
- TypeScript service wrappers created
- Database initialized in Rust during Tauri startup

### 🚧 In Progress
- Updating components to use SQLite services
- Moving session storage to Rust secure storage
- Removing IndexedDB code

### 📋 TODO
- Update all route components
- Remove IndexedDB initialization
- Update type imports
- Test migration script

## Component Updates Needed

### Routes to Update
1. `routes/standalone/deals/index.tsx` - Use SQLite services
2. `routes/standalone/deals/new/client-vehicle.tsx` - Use SQLite services
3. `routes/standalone/deals/new/details.tsx` - Use SQLite services
4. `routes/standalone/deals/$dealId/index.tsx` - Use SQLite services
5. `routes/standalone/deals/$dealId/documents.tsx` - Use SQLite services
6. `routes/standalone/clients/$clientId/index.tsx` - Use SQLite services
7. `routes/standalone/vehicles/$vehicleId/index.tsx` - Use SQLite services
8. `routes/standalone/index.tsx` - Use SQLite services
9. `lib/providers/WizardProvider.tsx` - Update type imports

## Import Changes

### Old (IndexedDB)
```typescript
import { createClient } from "@/lib/local-storage/local-clients-service";
import { createVehicle } from "@/lib/local-storage/local-vehicles-service";
import { createDeal } from "@/lib/local-storage/local-deals-service";
import type { LocalClient, LocalVehicle, LocalDeal } from "@/lib/local-storage/db";
```

### New (SQLite)
```typescript
import { createClient } from "@/lib/sqlite/local-clients-service";
import { createVehicle } from "@/lib/sqlite/local-vehicles-service";
import { createDeal } from "@/lib/sqlite/local-deals-service";
import type { LocalClient, LocalVehicle, LocalDeal } from "@/lib/sqlite/local-clients-service"; // Types exported from services
```

## Session Storage Migration

### Current (localStorage)
```typescript
localStorage.setItem("standalone_session_token", token);
const token = localStorage.getItem("standalone_session_token");
```

### New (Rust Secure Storage)
```typescript
await invoke("store_secure", { key: "standalone_session_token", value: token });
const token = await invoke<string | null>("retrieve_secure", { key: "standalone_session_token" });
```

## Data Type Differences

### Field Name Mapping
- IndexedDB uses camelCase: `firstName`, `lastName`, `clientId`
- SQLite uses snake_case: `first_name`, `last_name`, `client_id`
- TypeScript wrappers handle the conversion automatically

