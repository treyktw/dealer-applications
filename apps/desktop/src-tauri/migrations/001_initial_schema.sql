-- Migration 001: Initial schema
-- Creates all base tables for deals, clients, vehicles, and documents

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    drivers_license TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_clients_created ON clients(created_at DESC);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    vin TEXT NOT NULL UNIQUE,
    stock_number TEXT,
    year INTEGER NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    trim TEXT,
    body TEXT,
    doors INTEGER,
    transmission TEXT,
    engine TEXT,
    cylinders INTEGER,
    title_number TEXT,
    mileage INTEGER NOT NULL,
    color TEXT,
    price REAL NOT NULL,
    cost REAL,
    status TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_stock ON vehicles(stock_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_created ON vehicles(created_at DESC);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    client_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    status TEXT NOT NULL,
    total_amount REAL NOT NULL,
    sale_date INTEGER,
    sale_amount REAL,
    sales_tax REAL,
    doc_fee REAL,
    trade_in_value REAL,
    down_payment REAL,
    financed_amount REAL,
    document_ids TEXT, -- JSON array of document IDs
    cobuyer_data TEXT, -- JSON object
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_deals_client ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_vehicle ON deals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_date ON deals(sale_date DESC);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    deal_id TEXT NOT NULL,
    type TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path to PDF file on disk
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_deal ON documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL, -- JSON value
    updated_at INTEGER NOT NULL
);

