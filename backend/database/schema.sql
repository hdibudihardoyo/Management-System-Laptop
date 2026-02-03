-- QC Laptop Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('leader', 'staff')),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Laptops table
CREATE TABLE IF NOT EXISTS laptops (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    model VARCHAR(100),
    brand VARCHAR(50),
    specifications JSONB,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'dalam_qc', 'lulus_qc', 'perlu_perbaikan')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QC Records table  
CREATE TABLE IF NOT EXISTS qc_records (
    id SERIAL PRIMARY KEY,
    laptop_id INTEGER REFERENCES laptops(id) ON DELETE CASCADE,
    qc_user_id INTEGER REFERENCES users(id),
    qc_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    overall_status VARCHAR(20) DEFAULT 'pending' CHECK (overall_status IN ('pending', 'pass', 'fail')),
    notes TEXT,
    qc_name VARCHAR(100),
    qc_room VARCHAR(50),
    qc_line VARCHAR(50),
    qc_table VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QC Checklist Items table
CREATE TABLE IF NOT EXISTS qc_checklist_items (
    id SERIAL PRIMARY KEY,
    qc_record_id INTEGER REFERENCES qc_records(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('hardware', 'software')),
    item_name VARCHAR(255) NOT NULL,
    is_checked BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'pass', 'fail')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    qc_record_id INTEGER REFERENCES qc_records(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    description TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- History Logs table
CREATE TABLE IF NOT EXISTS history_logs (
    id SERIAL PRIMARY KEY,
    laptop_id INTEGER REFERENCES laptops(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    action_type VARCHAR(50),
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_laptops_serial ON laptops(serial_number);
CREATE INDEX IF NOT EXISTS idx_laptops_status ON laptops(status);
CREATE INDEX IF NOT EXISTS idx_qc_records_laptop ON qc_records(laptop_id);
CREATE INDEX IF NOT EXISTS idx_qc_records_date ON qc_records(qc_date);
CREATE INDEX IF NOT EXISTS idx_history_laptop ON history_logs(laptop_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON history_logs(created_at);

-- Migration: Update role constraint and add columns
DO $$
BEGIN
    -- Drop old role constraint and add new one
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('leader', 'staff'));
    
    -- Add QC officer info columns if not exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qc_records' AND column_name='qc_name') THEN
        ALTER TABLE qc_records ADD COLUMN qc_name VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qc_records' AND column_name='qc_room') THEN
        ALTER TABLE qc_records ADD COLUMN qc_room VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qc_records' AND column_name='qc_line') THEN
        ALTER TABLE qc_records ADD COLUMN qc_line VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qc_records' AND column_name='qc_table') THEN
        ALTER TABLE qc_records ADD COLUMN qc_table VARCHAR(50);
    END IF;
END $$;

-- Remove action_type constraint
ALTER TABLE history_logs DROP CONSTRAINT IF EXISTS history_logs_action_type_check;

-- Update existing roles
UPDATE users SET role = 'leader' WHERE role = 'admin';
UPDATE users SET role = 'staff' WHERE role = 'qc';
