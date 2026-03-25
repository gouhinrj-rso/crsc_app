-- 001_initial.sql
-- Initial schema for CRSC Filing Assistant (SQLite)
-- Single-user desktop app — no user_id columns

CREATE TABLE IF NOT EXISTS personal_information (
    id TEXT PRIMARY KEY,
    first_name TEXT,
    middle_initial TEXT,
    last_name TEXT,
    ssn_encrypted TEXT,
    date_of_birth TEXT,
    email TEXT,
    phone TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS military_service (
    id TEXT PRIMARY KEY,
    branch TEXT,
    service_number TEXT,
    retired_rank TEXT,
    retirement_date TEXT,
    years_of_service INTEGER,
    retirement_type TEXT,
    dd214_uploaded INTEGER DEFAULT 0,
    retirement_orders_uploaded INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS va_disability_info (
    id TEXT PRIMARY KEY,
    va_file_number TEXT,
    current_va_rating INTEGER,
    va_decision_date TEXT,
    has_va_waiver INTEGER DEFAULT 0,
    receives_crdp INTEGER DEFAULT 0,
    code_sheet_uploaded INTEGER DEFAULT 0,
    decision_letter_uploaded INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS disability_claims (
    id TEXT PRIMARY KEY,
    disability_title TEXT,
    disability_code TEXT,
    body_part_affected TEXT,
    date_awarded_by_va TEXT,
    initial_rating_percentage INTEGER,
    current_rating_percentage INTEGER,
    combat_related_code TEXT,
    unit_of_assignment TEXT,
    location_of_injury TEXT,
    description_of_event TEXT,
    received_purple_heart INTEGER DEFAULT 0,
    has_secondary_conditions INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS secondary_conditions (
    id TEXT PRIMARY KEY,
    primary_claim_id TEXT REFERENCES disability_claims(id) ON DELETE CASCADE,
    disability_code TEXT,
    description TEXT,
    percentage INTEGER,
    date_awarded TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    document_type TEXT,
    file_name TEXT,
    file_path TEXT,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at TEXT DEFAULT (datetime('now')),
    verified INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_history (
    id TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS packet_status (
    id TEXT PRIMARY KEY,
    step_name TEXT,
    step_status TEXT DEFAULT 'not_started',
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Default packet status rows
INSERT OR IGNORE INTO packet_status (id, step_name, step_status) VALUES ('step_eligibility', 'eligibility', 'not_started');
INSERT OR IGNORE INTO packet_status (id, step_name, step_status) VALUES ('step_personal_info', 'personal_info', 'not_started');
INSERT OR IGNORE INTO packet_status (id, step_name, step_status) VALUES ('step_military_service', 'military_service', 'not_started');
INSERT OR IGNORE INTO packet_status (id, step_name, step_status) VALUES ('step_va_disability', 'va_disability', 'not_started');
INSERT OR IGNORE INTO packet_status (id, step_name, step_status) VALUES ('step_disability_claims', 'disability_claims', 'not_started');
INSERT OR IGNORE INTO packet_status (id, step_name, step_status) VALUES ('step_documents', 'documents', 'not_started');
INSERT OR IGNORE INTO packet_status (id, step_name, step_status) VALUES ('step_review', 'review', 'not_started');
INSERT OR IGNORE INTO packet_status (id, step_name, step_status) VALUES ('step_download', 'download', 'not_started');
