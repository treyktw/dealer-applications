// src-tauri/src/database.rs
//
// SQLite database module for standalone operation
// Handles schema, migrations, and all database operations

use chrono::Utc;
use log::info;
use rusqlite::{params, Connection, Result as SqlResult, Row};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use std::fs;

use crate::storage::get_app_data_dir;

// Database connection wrapper
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    /// Get database path (internal helper)
    fn get_db_path() -> SqlResult<PathBuf> {
        #[cfg(debug_assertions)]
        {
            // Development: use db/ folder in app root
            let mut db_path = std::env::current_exe()
                .map_err(|e| rusqlite::Error::InvalidPath(format!("Failed to get current exe: {}", e).into()))?;
            
            // Navigate to app root
            while db_path.file_name().and_then(|n| n.to_str()) != Some("dealer-software") {
                if !db_path.pop() {
                    break;
                }
            }
            
            // If we're in src-tauri/target, go up to src-tauri
            if db_path.file_name().and_then(|n| n.to_str()) == Some("target") {
                db_path.pop();
            }
            
            // Go up to app root
            db_path.pop();
            db_path.push("db");
            
            // Create directory if it doesn't exist
            if !db_path.exists() {
                fs::create_dir_all(&db_path)
                    .map_err(|e| rusqlite::Error::InvalidPath(format!("Failed to create db directory: {}", e).into()))?;
            }
            
            Ok(db_path.join("dealer.db"))
        }
        
        #[cfg(not(debug_assertions))]
        {
            // Production: use app data directory
            let data_dir = get_app_data_dir()
                .map_err(|e| rusqlite::Error::InvalidPath(format!("Failed to get app data dir: {}", e).into()))?;
            let db_path = data_dir.join("dealer.db");
            
            // Ensure parent directory exists
            if let Some(parent) = db_path.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent)
                        .map_err(|e| rusqlite::Error::InvalidPath(format!("Failed to create db directory: {}", e).into()))?;
                }
            }
            
            Ok(db_path)
        }
    }
    
    /// Initialize database connection
    pub fn init() -> SqlResult<Self> {
        let db_path = Self::get_db_path()?;
        
        info!("Opening SQLite database at: {}", db_path.display());
        
        let conn = Connection::open(&db_path)?;
        
        // Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON", [])?;
        
        // Enable WAL mode for better concurrency
        // PRAGMA journal_mode returns a value, so we need to use query_row
        let _journal_mode: String = conn.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))?;
        
        let db = Database {
            conn: Arc::new(Mutex::new(conn)),
        };
        
        // Run migrations
        db.migrate()?;
        
        Ok(db)
    }
    
    /// Run database migrations
    fn migrate(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        
        // Create migrations table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            )",
            [],
        )?;
        
        // Get current version
        let current_version: i32 = conn
            .query_row(
                "SELECT MAX(version) FROM schema_migrations",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);
        
        info!("Current database version: {}", current_version);
        
        // Migration 1: Initial schema
        if current_version < 1 {
            info!("Running migration 1: Initial schema");
            conn.execute_batch(include_str!("../migrations/001_initial_schema.sql"))?;
            
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?)",
                params![Utc::now().to_rfc3339()],
            )?;
        }
        
        // Migration 2: Add sync fields
        if current_version < 2 {
            info!("Running migration 2: Add sync fields");
            conn.execute_batch(include_str!("../migrations/002_add_sync_fields.sql"))?;
            
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (2, ?)",
                params![Utc::now().to_rfc3339()],
            )?;
        }
        
        // Migration 3: Add document file paths
        if current_version < 3 {
            info!("Running migration 3: Add document file paths");
            conn.execute_batch(include_str!("../migrations/003_add_document_paths.sql"))?;
            
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (3, ?)",
                params![Utc::now().to_rfc3339()],
            )?;
        }
        
        // Migration 5: Add user_id for user isolation
        if current_version < 5 {
            info!("Running migration 5: Add user_id to all tables");
            conn.execute_batch(include_str!("../migrations/005_add_user_id.sql"))?;
            
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (5, ?)",
                params![Utc::now().to_rfc3339()],
            )?;
        }
        
        // Migration 4: Add images column to vehicles table
        if current_version < 4 {
            info!("Running migration 4: Add images column to vehicles");
            conn.execute_batch(include_str!("../migrations/004_add_vehicle_images.sql"))?;
            
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (4, ?)",
                params![Utc::now().to_rfc3339()],
            )?;
        }
        
        info!("✅ Database migrations complete");
        Ok(())
    }
    
    /// Get database connection (for internal use)
    fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().unwrap()
    }
}

// Singleton database instance
static DB: once_cell::sync::OnceCell<Database> = once_cell::sync::OnceCell::new();

/// Initialize database (called during Tauri startup)
pub fn init_database() -> SqlResult<()> {
    DB.get_or_try_init(Database::init)
        .map_err(|e| rusqlite::Error::InvalidPath(format!("Failed to init database: {}", e).into()))?;
    Ok(())
}

/// Get or initialize database instance
pub fn get_db() -> SqlResult<&'static Database> {
    DB.get_or_try_init(Database::init)
        .map_err(|e| rusqlite::Error::InvalidPath(format!("Failed to init database: {}", e).into()))
}

// ============================================================================
// CLIENT OPERATIONS
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Client {
    pub id: String,
    pub user_id: Option<String>,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub drivers_license: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub synced_at: Option<i64>,
}

impl Client {
    fn from_row(row: &Row) -> SqlResult<Self> {
        // Handle both old schema (13 columns) and new schema (14 columns with user_id)
        let column_count = row.as_ref().column_count();
        let user_id = if column_count > 13 {
            row.get(13).ok()
        } else {
            None
        };
        
        Ok(Client {
            id: row.get(0)?,
            first_name: row.get(1)?,
            last_name: row.get(2)?,
            email: row.get(3)?,
            phone: row.get(4)?,
            address: row.get(5)?,
            city: row.get(6)?,
            state: row.get(7)?,
            zip_code: row.get(8)?,
            drivers_license: row.get(9)?,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
            synced_at: row.get(12)?,
            user_id,
        })
    }
}

#[tauri::command]
pub fn db_create_client(client: Client, user_id: Option<String>) -> Result<Client, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    conn.execute(
        "INSERT INTO clients (
            id, user_id, first_name, last_name, email, phone, address, city, state, zip_code,
            drivers_license, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            client.id,
            user_id_value,
            client.first_name,
            client.last_name,
            client.email,
            client.phone,
            client.address,
            client.city,
            client.state,
            client.zip_code,
            client.drivers_license,
            client.created_at,
            client.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    info!("✅ Client created: {} for user: {}", client.id, user_id_value);
    Ok(Client {
        user_id: Some(user_id_value.clone()),
        ..client
    })
}

#[tauri::command]
pub fn db_get_client(id: String, user_id: Option<String>) -> Result<Option<Client>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT * FROM clients WHERE id = ?1 AND user_id = ?2")
        .map_err(|e| e.to_string())?;
    
    match stmt.query_row(params![id, user_id_value], Client::from_row) {
        Ok(client) => Ok(Some(client)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn db_get_all_clients(user_id: Option<String>) -> Result<Vec<Client>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT * FROM clients WHERE user_id = ?1 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let clients = stmt
        .query_map(params![user_id_value], Client::from_row)
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(clients)
}

#[tauri::command]
pub fn db_update_client(id: String, updates: Value, user_id: Option<String>) -> Result<Client, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    // Get existing client (must belong to this user)
    let mut client: Client = db_get_client(id.clone(), Some(user_id_value.clone()))?
        .ok_or_else(|| "Client not found or access denied".to_string())?;
    
    // Apply updates
    if let Some(first_name) = updates.get("first_name").and_then(|v| v.as_str()) {
        client.first_name = first_name.to_string();
    }
    if let Some(last_name) = updates.get("last_name").and_then(|v| v.as_str()) {
        client.last_name = last_name.to_string();
    }
    if let Some(email) = updates.get("email").and_then(|v| v.as_str()) {
        client.email = Some(email.to_string());
    }
    if let Some(phone) = updates.get("phone").and_then(|v| v.as_str()) {
        client.phone = Some(phone.to_string());
    }
    // ... add other fields
    
    client.updated_at = chrono::Utc::now().timestamp_millis();
    
    conn.execute(
        "UPDATE clients SET
            first_name = ?2, last_name = ?3, email = ?4, phone = ?5,
            address = ?6, city = ?7, state = ?8, zip_code = ?9,
            drivers_license = ?10, updated_at = ?11
        WHERE id = ?1 AND user_id = ?12",
        params![
            client.id,
            client.first_name,
            client.last_name,
            client.email,
            client.phone,
            client.address,
            client.city,
            client.state,
            client.zip_code,
            client.drivers_license,
            client.updated_at,
            user_id_value,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(client)
}

#[tauri::command]
pub fn db_delete_client(id: String, user_id: Option<String>) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    conn.execute("DELETE FROM clients WHERE id = ?1 AND user_id = ?2", params![id, user_id_value])
        .map_err(|e| e.to_string())?;
    
    info!("✅ Client deleted: {} for user: {}", id, user_id_value);
    Ok(())
}

#[tauri::command]
pub fn db_search_clients(query: String, user_id: Option<String>) -> Result<Vec<Client>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    let search = format!("%{}%", query);
    let mut stmt = conn
        .prepare(
            "SELECT * FROM clients WHERE user_id = ?1 AND (
                first_name LIKE ?2 OR
                last_name LIKE ?2 OR
                email LIKE ?2 OR
                phone LIKE ?2
            ) ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    
    let clients = stmt
        .query_map(params![user_id_value, search], Client::from_row)
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(clients)
}

// ============================================================================
// VEHICLE OPERATIONS
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vehicle {
    pub id: String,
    pub vin: String,
    pub stock_number: Option<String>,
    pub year: i32,
    pub make: String,
    pub model: String,
    pub trim: Option<String>,
    pub body: Option<String>,
    pub doors: Option<i32>,
    pub transmission: Option<String>,
    pub engine: Option<String>,
    pub cylinders: Option<i32>,
    pub title_number: Option<String>,
    pub mileage: i32,
    pub color: Option<String>,
    pub price: f64,
    pub cost: Option<f64>,
    pub status: String,
    pub description: Option<String>,
    pub images: Option<String>, // JSON array
    pub created_at: i64,
    pub updated_at: i64,
    pub synced_at: Option<i64>,
}

impl Vehicle {
    fn from_row(row: &Row) -> SqlResult<Self> {
        Ok(Vehicle {
            id: row.get(0)?,
            vin: row.get(1)?,
            stock_number: row.get(2)?,
            year: row.get(3)?,
            make: row.get(4)?,
            model: row.get(5)?,
            trim: row.get(6)?,
            body: row.get(7)?,
            doors: row.get(8)?,
            transmission: row.get(9)?,
            engine: row.get(10)?,
            cylinders: row.get(11)?,
            title_number: row.get(12)?,
            mileage: row.get(13)?,
            color: row.get(14)?,
            price: row.get(15)?,
            cost: row.get(16)?,
            status: row.get(17)?,
            description: row.get(18)?,
            images: row.get(19)?,
            created_at: row.get(20)?,
            updated_at: row.get(21)?,
            synced_at: row.get(22)?,
        })
    }
}

#[tauri::command]
pub fn db_create_vehicle(vehicle: Vehicle) -> Result<Vehicle, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    // Check if VIN already exists
    let mut check_stmt = conn
        .prepare("SELECT id FROM vehicles WHERE vin = ?1")
        .map_err(|e| e.to_string())?;
    
    let existing: Result<String, _> = check_stmt.query_row(params![vehicle.vin], |row| row.get(0));
    if existing.is_ok() {
        return Err(format!("Vehicle with VIN {} already exists", vehicle.vin));
    }
    
    conn.execute(
        "INSERT INTO vehicles (
            id, vin, stock_number, year, make, model, trim, body, doors,
            transmission, engine, cylinders, title_number, mileage, color,
            price, cost, status, description, images, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)",
        params![
            vehicle.id,
            vehicle.vin,
            vehicle.stock_number,
            vehicle.year,
            vehicle.make,
            vehicle.model,
            vehicle.trim,
            vehicle.body,
            vehicle.doors,
            vehicle.transmission,
            vehicle.engine,
            vehicle.cylinders,
            vehicle.title_number,
            vehicle.mileage,
            vehicle.color,
            vehicle.price,
            vehicle.cost,
            vehicle.status,
            vehicle.description,
            vehicle.images,
            vehicle.created_at,
            vehicle.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    info!("✅ Vehicle created: {}", vehicle.id);
    Ok(vehicle)
}

#[tauri::command]
pub fn db_get_vehicle(id: String) -> Result<Option<Vehicle>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    // Explicitly list columns to ensure correct order (images was added later)
    let mut stmt = conn
        .prepare(
            "SELECT id, vin, stock_number, year, make, model, trim, body, doors,
             transmission, engine, cylinders, title_number, mileage, color,
             price, cost, status, description, images, created_at, updated_at, synced_at
             FROM vehicles WHERE id = ?1"
        )
        .map_err(|e| e.to_string())?;
    
    match stmt.query_row(params![id], Vehicle::from_row) {
        Ok(vehicle) => Ok(Some(vehicle)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn db_get_all_vehicles(user_id: Option<String>) -> Result<Vec<Vehicle>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    // Explicitly list columns to ensure correct order (images was added later via migration)
    let mut stmt = conn
        .prepare(
            "SELECT id, vin, stock_number, year, make, model, trim, body, doors,
             transmission, engine, cylinders, title_number, mileage, color,
             price, cost, status, description, images, created_at, updated_at, synced_at
             FROM vehicles WHERE user_id = ?1 ORDER BY created_at DESC"
        )
        .map_err(|e| e.to_string())?;
    
    let vehicles = stmt
        .query_map(params![user_id_value], Vehicle::from_row)
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(vehicles)
}

#[tauri::command]
pub fn db_get_vehicle_by_vin(vin: String) -> Result<Option<Vehicle>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    // Explicitly list columns to ensure correct order
    let mut stmt = conn
        .prepare(
            "SELECT id, vin, stock_number, year, make, model, trim, body, doors,
             transmission, engine, cylinders, title_number, mileage, color,
             price, cost, status, description, images, created_at, updated_at, synced_at
             FROM vehicles WHERE vin = ?1"
        )
        .map_err(|e| e.to_string())?;
    
    match stmt.query_row(params![vin], Vehicle::from_row) {
        Ok(vehicle) => Ok(Some(vehicle)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn db_get_vehicle_by_stock(stock_number: String) -> Result<Option<Vehicle>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    // Explicitly list columns to ensure correct order
    let mut stmt = conn
        .prepare(
            "SELECT id, vin, stock_number, year, make, model, trim, body, doors,
             transmission, engine, cylinders, title_number, mileage, color,
             price, cost, status, description, images, created_at, updated_at, synced_at
             FROM vehicles WHERE stock_number = ?1"
        )
        .map_err(|e| e.to_string())?;
    
    match stmt.query_row(params![stock_number], Vehicle::from_row) {
        Ok(vehicle) => Ok(Some(vehicle)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn db_update_vehicle(id: String, updates: Value) -> Result<Vehicle, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let mut vehicle: Vehicle = db_get_vehicle(id.clone())?
        .ok_or_else(|| "Vehicle not found".to_string())?;
    
    // Apply updates from JSON
    if let Some(vin) = updates.get("vin").and_then(|v| v.as_str()) {
        vehicle.vin = vin.to_string();
    }
    if let Some(stock_number) = updates.get("stock_number").and_then(|v| v.as_str()) {
        vehicle.stock_number = Some(stock_number.to_string());
    }
    if let Some(year) = updates.get("year").and_then(|v| v.as_i64()) {
        vehicle.year = year as i32;
    }
    if let Some(make) = updates.get("make").and_then(|v| v.as_str()) {
        vehicle.make = make.to_string();
    }
    if let Some(model) = updates.get("model").and_then(|v| v.as_str()) {
        vehicle.model = model.to_string();
    }
    if let Some(trim) = updates.get("trim").and_then(|v| v.as_str()) {
        vehicle.trim = Some(trim.to_string());
    }
    if let Some(body) = updates.get("body").and_then(|v| v.as_str()) {
        vehicle.body = Some(body.to_string());
    }
    if let Some(doors) = updates.get("doors").and_then(|v| v.as_i64()) {
        vehicle.doors = Some(doors as i32);
    }
    if let Some(transmission) = updates.get("transmission").and_then(|v| v.as_str()) {
        vehicle.transmission = Some(transmission.to_string());
    }
    if let Some(engine) = updates.get("engine").and_then(|v| v.as_str()) {
        vehicle.engine = Some(engine.to_string());
    }
    if let Some(cylinders) = updates.get("cylinders").and_then(|v| v.as_i64()) {
        vehicle.cylinders = Some(cylinders as i32);
    }
    if let Some(title_number) = updates.get("title_number").and_then(|v| v.as_str()) {
        vehicle.title_number = Some(title_number.to_string());
    }
    if let Some(mileage) = updates.get("mileage").and_then(|v| v.as_i64()) {
        vehicle.mileage = mileage as i32;
    }
    if let Some(color) = updates.get("color").and_then(|v| v.as_str()) {
        vehicle.color = Some(color.to_string());
    }
    if let Some(price) = updates.get("price").and_then(|v| v.as_f64()) {
        vehicle.price = price;
    }
    if let Some(cost) = updates.get("cost").and_then(|v| v.as_f64()) {
        vehicle.cost = Some(cost);
    }
    if let Some(status) = updates.get("status").and_then(|v| v.as_str()) {
        vehicle.status = status.to_string();
    }
    if let Some(description) = updates.get("description").and_then(|v| v.as_str()) {
        vehicle.description = Some(description.to_string());
    }
    if let Some(images) = updates.get("images") {
        vehicle.images = Some(serde_json::to_string(images).map_err(|e| e.to_string())?);
    }
    
    vehicle.updated_at = Utc::now().timestamp_millis();
    
    conn.execute(
        "UPDATE vehicles SET
            vin = ?2, stock_number = ?3, year = ?4, make = ?5, model = ?6,
            trim = ?7, body = ?8, doors = ?9, transmission = ?10, engine = ?11,
            cylinders = ?12, title_number = ?13, mileage = ?14, color = ?15,
            price = ?16, cost = ?17, status = ?18, description = ?19,
            images = ?20, updated_at = ?21
        WHERE id = ?1",
        params![
            vehicle.id,
            vehicle.vin,
            vehicle.stock_number,
            vehicle.year,
            vehicle.make,
            vehicle.model,
            vehicle.trim,
            vehicle.body,
            vehicle.doors,
            vehicle.transmission,
            vehicle.engine,
            vehicle.cylinders,
            vehicle.title_number,
            vehicle.mileage,
            vehicle.color,
            vehicle.price,
            vehicle.cost,
            vehicle.status,
            vehicle.description,
            vehicle.images,
            vehicle.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(vehicle)
}

#[tauri::command]
pub fn db_delete_vehicle(id: String) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    conn.execute("DELETE FROM vehicles WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    
    info!("✅ Vehicle deleted: {}", id);
    Ok(())
}

#[tauri::command]
pub fn db_search_vehicles(query: String) -> Result<Vec<Vehicle>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let search = format!("%{}%", query);
    // Explicitly list columns to ensure correct order
    let mut stmt = conn
        .prepare(
            "SELECT id, vin, stock_number, year, make, model, trim, body, doors,
             transmission, engine, cylinders, title_number, mileage, color,
             price, cost, status, description, images, created_at, updated_at, synced_at
             FROM vehicles WHERE
                make LIKE ?1 OR
                model LIKE ?1 OR
                vin LIKE ?1 OR
                stock_number LIKE ?1
            ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    
    let vehicles = stmt
        .query_map(params![search], Vehicle::from_row)
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(vehicles)
}

#[tauri::command]
pub fn db_get_vehicles_by_status(status: String) -> Result<Vec<Vehicle>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    // Explicitly list columns to ensure correct order
    let mut stmt = conn
        .prepare(
            "SELECT id, vin, stock_number, year, make, model, trim, body, doors,
             transmission, engine, cylinders, title_number, mileage, color,
             price, cost, status, description, images, created_at, updated_at, synced_at
             FROM vehicles WHERE status = ?1 ORDER BY created_at DESC"
        )
        .map_err(|e| e.to_string())?;
    
    let vehicles = stmt
        .query_map(params![status], Vehicle::from_row)
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(vehicles)
}

// ============================================================================
// DEAL OPERATIONS
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Deal {
    pub id: String,
    pub user_id: Option<String>,
    pub r#type: String,
    pub client_id: String,
    pub vehicle_id: String,
    pub status: String,
    pub total_amount: f64,
    pub sale_date: Option<i64>,
    pub sale_amount: Option<f64>,
    pub sales_tax: Option<f64>,
    pub doc_fee: Option<f64>,
    pub trade_in_value: Option<f64>,
    pub down_payment: Option<f64>,
    pub financed_amount: Option<f64>,
    pub document_ids: String, // JSON array
    pub cobuyer_data: Option<String>, // JSON object
    pub created_at: i64,
    pub updated_at: i64,
    pub synced_at: Option<i64>,
}

impl Deal {
    fn from_row(row: &Row) -> SqlResult<Self> {
        // user_id was added via migration, so it's at the end (after synced_at)
        // Column order: id, type, client_id, vehicle_id, status, total_amount, sale_date, sale_amount,
        // sales_tax, doc_fee, trade_in_value, down_payment, financed_amount, document_ids, cobuyer_data,
        // created_at, updated_at, synced_at, user_id
        Ok(Deal {
            id: row.get(0)?,
            r#type: row.get(1)?,
            client_id: row.get(2)?,
            vehicle_id: row.get(3)?,
            status: row.get(4)?,
            total_amount: row.get(5)?,
            sale_date: row.get(6)?,
            sale_amount: row.get(7)?,
            sales_tax: row.get(8)?,
            doc_fee: row.get(9)?,
            trade_in_value: row.get(10)?,
            down_payment: row.get(11)?,
            financed_amount: row.get(12)?,
            document_ids: row.get(13)?,
            cobuyer_data: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
            synced_at: row.get(17)?,
            user_id: row.get(18).ok(), // user_id is optional and at the end
        })
    }
}

#[tauri::command]
pub fn db_create_deal(deal: Deal, user_id: Option<String>) -> Result<Deal, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    conn.execute(
        "INSERT INTO deals (
            id, user_id, type, client_id, vehicle_id, status, total_amount,
            sale_date, sale_amount, sales_tax, doc_fee, trade_in_value,
            down_payment, financed_amount, document_ids, cobuyer_data,
            created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
        params![
            deal.id,
            user_id_value,
            deal.r#type,
            deal.client_id,
            deal.vehicle_id,
            deal.status,
            deal.total_amount,
            deal.sale_date,
            deal.sale_amount,
            deal.sales_tax,
            deal.doc_fee,
            deal.trade_in_value,
            deal.down_payment,
            deal.financed_amount,
            deal.document_ids,
            deal.cobuyer_data,
            deal.created_at,
            deal.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    info!("✅ Deal created: {}", deal.id);
    Ok(deal)
}

#[tauri::command]
pub fn db_get_deal(id: String, user_id: Option<String>) -> Result<Option<Deal>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT * FROM deals WHERE id = ?1 AND user_id = ?2")
        .map_err(|e| e.to_string())?;
    
    match stmt.query_row(params![id, user_id_value], Deal::from_row) {
        Ok(deal) => Ok(Some(deal)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn db_get_all_deals(user_id: Option<String>) -> Result<Vec<Deal>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT * FROM deals WHERE user_id = ?1 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let deals = stmt
        .query_map(params![user_id_value], Deal::from_row)
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(deals)
}

#[tauri::command]
pub fn db_get_deals_by_client(client_id: String, user_id: Option<String>) -> Result<Vec<Deal>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT * FROM deals WHERE client_id = ?1 AND user_id = ?2 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let deals = stmt
        .query_map(params![client_id, user_id_value], Deal::from_row)
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(deals)
}

#[tauri::command]
pub fn db_get_deals_by_vehicle(vehicle_id: String, user_id: Option<String>) -> Result<Vec<Deal>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT * FROM deals WHERE vehicle_id = ?1 AND user_id = ?2 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let deals = stmt
        .query_map(params![vehicle_id, user_id_value], Deal::from_row)
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(deals)
}

#[tauri::command]
pub fn db_get_deals_by_status(status: String, user_id: Option<String>) -> Result<Vec<Deal>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT * FROM deals WHERE status = ?1 AND user_id = ?2 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let deals = stmt
        .query_map(params![status, user_id_value], Deal::from_row)
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(deals)
}

#[tauri::command]
pub fn db_update_deal(id: String, updates: Value, user_id: Option<String>) -> Result<Deal, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    let mut deal: Deal = db_get_deal(id.clone(), Some(user_id_value.clone()))?
        .ok_or_else(|| "Deal not found or access denied".to_string())?;
    
    // Apply updates
    if let Some(r#type) = updates.get("type").and_then(|v| v.as_str()) {
        deal.r#type = r#type.to_string();
    }
    if let Some(status) = updates.get("status").and_then(|v| v.as_str()) {
        deal.status = status.to_string();
    }
    if let Some(total_amount) = updates.get("total_amount").and_then(|v| v.as_f64()) {
        deal.total_amount = total_amount;
    }
    if let Some(sale_date) = updates.get("sale_date").and_then(|v| v.as_i64()) {
        deal.sale_date = Some(sale_date);
    }
    if let Some(sale_amount) = updates.get("sale_amount").and_then(|v| v.as_f64()) {
        deal.sale_amount = Some(sale_amount);
    }
    if let Some(sales_tax) = updates.get("sales_tax").and_then(|v| v.as_f64()) {
        deal.sales_tax = Some(sales_tax);
    }
    if let Some(doc_fee) = updates.get("doc_fee").and_then(|v| v.as_f64()) {
        deal.doc_fee = Some(doc_fee);
    }
    if let Some(trade_in_value) = updates.get("trade_in_value").and_then(|v| v.as_f64()) {
        deal.trade_in_value = Some(trade_in_value);
    }
    if let Some(down_payment) = updates.get("down_payment").and_then(|v| v.as_f64()) {
        deal.down_payment = Some(down_payment);
    }
    if let Some(financed_amount) = updates.get("financed_amount").and_then(|v| v.as_f64()) {
        deal.financed_amount = Some(financed_amount);
    }
    if let Some(document_ids) = updates.get("document_ids") {
        deal.document_ids = serde_json::to_string(document_ids).map_err(|e| e.to_string())?;
    }
    if let Some(cobuyer_data) = updates.get("cobuyer_data") {
        deal.cobuyer_data = Some(serde_json::to_string(cobuyer_data).map_err(|e| e.to_string())?);
    }
    
    deal.updated_at = Utc::now().timestamp_millis();
    
    conn.execute(
        "UPDATE deals SET
            type = ?2, status = ?3, total_amount = ?4, sale_date = ?5,
            sale_amount = ?6, sales_tax = ?7, doc_fee = ?8, trade_in_value = ?9,
            down_payment = ?10, financed_amount = ?11, document_ids = ?12,
            cobuyer_data = ?13, updated_at = ?14
        WHERE id = ?1 AND user_id = ?15",
        params![
            deal.id,
            deal.r#type,
            deal.status,
            deal.total_amount,
            deal.sale_date,
            deal.sale_amount,
            deal.sales_tax,
            deal.doc_fee,
            deal.trade_in_value,
            deal.down_payment,
            deal.financed_amount,
            deal.document_ids,
            deal.cobuyer_data,
            deal.updated_at,
            user_id_value,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(deal)
}

#[tauri::command]
pub fn db_delete_deal(id: String) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    conn.execute("DELETE FROM deals WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    
    info!("✅ Deal deleted: {}", id);
    Ok(())
}

#[tauri::command]
pub fn db_search_deals(query: String, user_id: Option<String>) -> Result<Vec<Deal>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    let search = format!("%{}%", query);
    let mut stmt = conn
        .prepare(
            "SELECT * FROM deals WHERE user_id = ?1 AND (
                id LIKE ?2 OR
                type LIKE ?2 OR
                status LIKE ?2
            ) ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    
    let deals = stmt
        .query_map(params![user_id_value, search], Deal::from_row)
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(deals)
}

#[tauri::command]
pub fn db_get_deals_stats(user_id: Option<String>) -> Result<serde_json::Value, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let user_id_value = user_id.as_ref().ok_or_else(|| "User ID is required".to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT status, COUNT(*), SUM(total_amount) FROM deals WHERE user_id = ?1 GROUP BY status")
        .map_err(|e| e.to_string())?;
    
    let mut by_status: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    let mut total_amount = 0.0;
    let mut total_count = 0;
    
    let rows = stmt
        .query_map(params![user_id_value], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, Option<f64>>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    for (status, count, amount) in rows {
        by_status.insert(status.clone(), serde_json::json!(count));
        total_count += count;
        if let Some(amt) = amount {
            total_amount += amt;
        }
    }
    
    Ok(serde_json::json!({
        "total": total_count,
        "byStatus": by_status,
        "totalAmount": total_amount,
        "averageAmount": if total_count > 0 { total_amount / total_count as f64 } else { 0.0 },
    }))
}

// ============================================================================
// DOCUMENT OPERATIONS
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Document {
    pub id: String,
    pub deal_id: String,
    pub r#type: String,
    pub filename: String,
    pub file_path: String, // Path to PDF file on disk
    pub file_size: Option<i64>,
    pub file_checksum: Option<String>, // SHA-256 hash
    pub created_at: i64,
    pub updated_at: i64,
    pub synced_at: Option<i64>,
}

impl Document {
    fn from_row(row: &Row) -> SqlResult<Self> {
        Ok(Document {
            id: row.get(0)?,
            deal_id: row.get(1)?,
            r#type: row.get(2)?,
            filename: row.get(3)?,
            file_path: row.get(4)?,
            file_size: row.get(5)?,
            file_checksum: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            synced_at: row.get(9)?,
        })
    }
}

#[tauri::command]
pub fn db_create_document(document: Document) -> Result<Document, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    conn.execute(
        "INSERT INTO documents (
            id, deal_id, type, filename, file_path, file_size, file_checksum,
            created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            document.id,
            document.deal_id,
            document.r#type,
            document.filename,
            document.file_path,
            document.file_size,
            document.file_checksum,
            document.created_at,
            document.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    info!("✅ Document created: {}", document.id);
    Ok(document)
}

#[tauri::command]
pub fn db_get_document(id: String) -> Result<Option<Document>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    // Explicitly list columns to match Document::from_row order
    let mut stmt = conn
        .prepare(
            "SELECT id, deal_id, type, filename, file_path, file_size, file_checksum, 
             created_at, updated_at, synced_at 
             FROM documents WHERE id = ?1"
        )
        .map_err(|e| e.to_string())?;
    
    match stmt.query_row(params![id], Document::from_row) {
        Ok(doc) => Ok(Some(doc)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn db_get_documents_by_deal(deal_id: String) -> Result<Vec<Document>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    // Explicitly list columns to match Document::from_row order:
    // from_row expects: id, deal_id, type, filename, file_path, file_size, file_checksum, created_at, updated_at, synced_at
    // Table has: id, deal_id, type, filename, file_path, created_at, updated_at, synced_at, file_size, file_checksum
    // So we need to reorder: id, deal_id, type, filename, file_path, file_size, file_checksum, created_at, updated_at, synced_at
    let mut stmt = conn
        .prepare(
            "SELECT id, deal_id, type, filename, file_path, file_size, file_checksum, 
             created_at, updated_at, synced_at 
             FROM documents WHERE deal_id = ?1 ORDER BY created_at DESC"
        )
        .map_err(|e| e.to_string())?;
    
    let documents = stmt
        .query_map(params![deal_id], Document::from_row)
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    info!("✅ Retrieved {} documents for deal {}", documents.len(), deal_id);
    Ok(documents)
}

#[tauri::command]
pub fn db_update_document(id: String, updates: Value) -> Result<Document, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let mut document: Document = db_get_document(id.clone())?
        .ok_or_else(|| "Document not found".to_string())?;
    
    if let Some(filename) = updates.get("filename").and_then(|v| v.as_str()) {
        document.filename = filename.to_string();
    }
    if let Some(file_path) = updates.get("file_path").and_then(|v| v.as_str()) {
        document.file_path = file_path.to_string();
    }
    if let Some(file_size) = updates.get("file_size").and_then(|v| v.as_i64()) {
        document.file_size = Some(file_size);
    }
    if let Some(file_checksum) = updates.get("file_checksum").and_then(|v| v.as_str()) {
        document.file_checksum = Some(file_checksum.to_string());
    }
    
    document.updated_at = Utc::now().timestamp_millis();
    
    conn.execute(
        "UPDATE documents SET
            filename = ?2, file_path = ?3, file_size = ?4,
            file_checksum = ?5, updated_at = ?6
        WHERE id = ?1",
        params![
            document.id,
            document.filename,
            document.file_path,
            document.file_size,
            document.file_checksum,
            document.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(document)
}

#[tauri::command]
pub fn db_delete_document(id: String) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    // Get document to delete file (will be handled by TypeScript wrapper)
    // Just delete from database here
    
    conn.execute("DELETE FROM documents WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    
    info!("✅ Document deleted: {}", id);
    Ok(())
}

/// Clear all data from the database (development/testing only)
/// WARNING: This will delete ALL data from all tables
#[tauri::command]
pub fn db_clear_all_data() -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    info!("🗑️ Clearing all data from database...");
    
    // Delete in order to respect foreign key constraints:
    // 1. Documents (CASCADE will handle it, but explicit is better)
    // 2. Deals (has RESTRICT foreign keys, so must delete before clients/vehicles)
    // 3. Vehicles
    // 4. Clients
    // 5. Settings (optional - keeping for now)
    // 6. Sync log (if exists)
    
    conn.execute("DELETE FROM documents", [])
        .map_err(|e| e.to_string())?;
    info!("✅ Cleared documents");
    
    conn.execute("DELETE FROM deals", [])
        .map_err(|e| e.to_string())?;
    info!("✅ Cleared deals");
    
    conn.execute("DELETE FROM vehicles", [])
        .map_err(|e| e.to_string())?;
    info!("✅ Cleared vehicles");
    
    conn.execute("DELETE FROM clients", [])
        .map_err(|e| e.to_string())?;
    info!("✅ Cleared clients");
    
    // Optionally clear settings (commented out to preserve app settings)
    // conn.execute("DELETE FROM settings", [])
    //     .map_err(|e| e.to_string())?;
    
    // Clear sync log if it exists
    let _ = conn.execute("DELETE FROM sync_log", []);
    
    info!("✅ All data cleared from database");
    Ok(())
}

/// Get a setting value by key
#[tauri::command]
pub fn db_get_setting(key: String) -> Result<Option<String>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;
    
    match stmt.query_row(params![key], |row| row.get::<_, String>(0)) {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Set a setting value
#[tauri::command]
pub fn db_set_setting(key: String, value: String) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.conn();
    
    let now = Utc::now().timestamp_millis();
    
    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
        params![key, value, now],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

