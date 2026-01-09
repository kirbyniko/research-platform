-- Role-Based Access Control Schema
-- Roles: guest, user, analyst, admin

-- Add role to users table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
    END IF;
END $$;

-- Create enum type for roles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('guest', 'user', 'analyst', 'admin');
    END IF;
END $$;

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash of the key
    key_prefix VARCHAR(8) NOT NULL,         -- First 8 chars for identification (e.g., "ice_abc1")
    name VARCHAR(100) NOT NULL,             -- User-friendly name
    permissions JSONB DEFAULT '["submit"]', -- Array of permissions
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- Case verifications tracking
CREATE TABLE IF NOT EXISTS case_verifications (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL,               -- References incidents
    verified_by INTEGER REFERENCES users(id),
    verification_number INTEGER NOT NULL,    -- 1 = first verification, 2 = second
    verification_type VARCHAR(50) NOT NULL,  -- 'data_accuracy', 'source_verification', 'legal_review'
    notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(case_id, verification_number)    -- Each case can only have one first and one second verification
);

CREATE INDEX IF NOT EXISTS idx_case_verifications_case_id ON case_verifications(case_id);

-- Add verification status to incidents
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incidents' AND column_name = 'verification_status') THEN
        ALTER TABLE incidents ADD COLUMN verification_status VARCHAR(20) DEFAULT 'pending';
        -- Values: 'pending', 'first_review', 'verified', 'published'
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incidents' AND column_name = 'first_verified_by') THEN
        ALTER TABLE incidents ADD COLUMN first_verified_by INTEGER REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incidents' AND column_name = 'first_verified_at') THEN
        ALTER TABLE incidents ADD COLUMN first_verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incidents' AND column_name = 'second_verified_by') THEN
        ALTER TABLE incidents ADD COLUMN second_verified_by INTEGER REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incidents' AND column_name = 'second_verified_at') THEN
        ALTER TABLE incidents ADD COLUMN second_verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incidents' AND column_name = 'submitted_by') THEN
        ALTER TABLE incidents ADD COLUMN submitted_by INTEGER REFERENCES users(id);
    END IF;
END $$;

-- Guest submissions table (for unverified guest data)
CREATE TABLE IF NOT EXISTS guest_submissions (
    id SERIAL PRIMARY KEY,
    submission_data JSONB NOT NULL,
    ip_address VARCHAR(45),
    email VARCHAR(255),                     -- Optional contact email
    status VARCHAR(20) DEFAULT 'pending',   -- 'pending', 'reviewed', 'accepted', 'rejected'
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_submissions_status ON guest_submissions(status);

-- Comments
COMMENT ON TABLE api_keys IS 'API keys for extension authentication';
COMMENT ON TABLE case_verifications IS 'Tracks case verification history';
COMMENT ON TABLE guest_submissions IS 'Holds guest submissions pending review';
COMMENT ON COLUMN users.role IS 'User role: guest, user, analyst, admin';
COMMENT ON COLUMN incidents.verification_status IS 'pending, first_review, verified, published';
