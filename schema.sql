-- BrainSAIT Identity Verification Database Schema
-- OID: 1.3.6.1.4.1.61026.5 (Database Schema)

-- Users table for identity verification tracking
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oid TEXT UNIQUE NOT NULL, -- BrainSAIT OID for the user
    stripe_verification_id TEXT UNIQUE,
    email TEXT,
    country_code TEXT NOT NULL, -- SA, SD, US
    verification_type TEXT NOT NULL, -- document, id_number
    verification_status TEXT DEFAULT 'pending', -- pending, verified, failed, requires_input
    risk_score INTEGER DEFAULT 0,
    device_fingerprint TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME,
    metadata TEXT -- JSON metadata
);

-- Saudi Arabia specific data (NPHIES integration)
CREATE TABLE IF NOT EXISTS saudi_healthcare (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nphies_id TEXT NOT NULL,
    facility_code TEXT,
    facility_name_ar TEXT,
    facility_name_en TEXT,
    practitioner_id TEXT,
    practitioner_name_ar TEXT,
    practitioner_name_en TEXT,
    insurance_status TEXT, -- active, suspended, expired
    coverage_details TEXT, -- JSON
    validation_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Sudan National Identity data
CREATE TABLE IF NOT EXISTS sudan_national_id (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    national_id TEXT NOT NULL,
    citizen_name_ar TEXT,
    citizen_name_en TEXT,
    wilaya_code TEXT,
    wilaya_name_ar TEXT,
    wilaya_name_en TEXT,
    ministry_code TEXT,
    ministry_access TEXT, -- JSON array of accessible ministries
    citizenship_status TEXT, -- citizen, resident, visitor
    service_eligibility TEXT, -- JSON
    validation_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Neural integration context
CREATE TABLE IF NOT EXISTS neural_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_oid TEXT NOT NULL,
    context_type TEXT NOT NULL, -- verification, healthcare, national, neural
    context_data TEXT NOT NULL, -- JSON
    obsidian_sync_status TEXT DEFAULT 'pending', -- pending, synced, failed
    mcp_connection_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Security incidents and monitoring
CREATE TABLE IF NOT EXISTS security_incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_oid TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    incident_type TEXT NOT NULL, -- csp_violation, high_risk_verification, script_injection
    risk_score INTEGER,
    incident_data TEXT NOT NULL, -- JSON
    source_ip TEXT,
    user_agent TEXT,
    blocked BOOLEAN DEFAULT FALSE,
    resolved BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Verification sessions for tracking
CREATE TABLE IF NOT EXISTS verification_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_oid TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    stripe_session_id TEXT UNIQUE,
    session_status TEXT DEFAULT 'created', -- created, processing, completed, failed
    country_context TEXT, -- SA, SD, US
    neural_sync_enabled BOOLEAN DEFAULT TRUE,
    real_time_monitoring BOOLEAN DEFAULT TRUE,
    attempt_count INTEGER DEFAULT 1,
    max_attempts INTEGER DEFAULT 3,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    session_data TEXT, -- JSON
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Regional facilities (Saudi healthcare facilities)
CREATE TABLE IF NOT EXISTS healthcare_facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_code TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    facility_type TEXT, -- hospital, clinic, pharmacy
    wilaya TEXT,
    city_ar TEXT,
    city_en TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    nphies_certified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sudan administrative divisions
CREATE TABLE IF NOT EXISTS sudan_wilayas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wilaya_code TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    capital_ar TEXT,
    capital_en TEXT,
    population INTEGER,
    area_km2 INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sudan government ministries
CREATE TABLE IF NOT EXISTS sudan_ministries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ministry_code TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    ministry_type TEXT, -- health, education, interior, etc.
    services_offered TEXT, -- JSON array
    digital_services_available BOOLEAN DEFAULT TRUE,
    contact_info TEXT, -- JSON
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Document storage tracking
CREATE TABLE IF NOT EXISTS document_storage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT UNIQUE NOT NULL,
    session_oid TEXT NOT NULL,
    document_type TEXT NOT NULL, -- identity_document, supporting_document, neural_data
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    country_code TEXT,
    storage_path TEXT NOT NULL,
    upload_status TEXT DEFAULT 'uploaded', -- uploaded, processing, verified, deleted
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analytics and metrics
CREATE TABLE IF NOT EXISTS verification_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_date DATE NOT NULL,
    country_code TEXT NOT NULL,
    total_verifications INTEGER DEFAULT 0,
    successful_verifications INTEGER DEFAULT 0,
    failed_verifications INTEGER DEFAULT 0,
    fraud_attempts_blocked INTEGER DEFAULT 0,
    average_risk_score REAL DEFAULT 0.0,
    neural_sync_success_rate REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_oid ON users (oid);
CREATE INDEX IF NOT EXISTS idx_users_stripe_id ON users (stripe_verification_id);
CREATE INDEX IF NOT EXISTS idx_users_country ON users (country_code);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (verification_status);
CREATE INDEX IF NOT EXISTS idx_sessions_oid ON verification_sessions (session_oid);
CREATE INDEX IF NOT EXISTS idx_sessions_stripe ON verification_sessions (stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_neural_context_user ON neural_context (user_id);
CREATE INDEX IF NOT EXISTS idx_neural_context_session ON neural_context (session_oid);
CREATE INDEX IF NOT EXISTS idx_security_incidents_type ON security_incidents (incident_type);
CREATE INDEX IF NOT EXISTS idx_security_incidents_date ON security_incidents (created_at);
CREATE INDEX IF NOT EXISTS idx_metrics_date_country ON verification_metrics (metric_date, country_code);
CREATE INDEX IF NOT EXISTS idx_document_storage_session ON document_storage (session_oid);
CREATE INDEX IF NOT EXISTS idx_document_storage_type ON document_storage (document_type);