-- Add columns for review locking system
-- Prevents two people from reviewing the same case simultaneously

-- Add lock columns to incidents table
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS locked_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for finding locked cases and checking expiry
CREATE INDEX IF NOT EXISTS idx_incidents_locked_by ON incidents(locked_by);
CREATE INDEX IF NOT EXISTS idx_incidents_lock_expires_at ON incidents(lock_expires_at);

-- Add comments for documentation
COMMENT ON COLUMN incidents.locked_by IS 'User ID of the person currently reviewing this case';
COMMENT ON COLUMN incidents.locked_at IS 'Timestamp when the review lock was acquired';
COMMENT ON COLUMN incidents.lock_expires_at IS 'Timestamp when the lock will auto-expire (default 30 minutes)';
