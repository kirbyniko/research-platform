-- Add columns for guest submission tracking
-- Run this migration to support guest incident submissions

-- Add submitter_ip column for tracking guest submissions
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS submitter_ip VARCHAR(45);

-- Add index for finding guest submissions
CREATE INDEX IF NOT EXISTS idx_incidents_submitter_role ON incidents(submitter_role);
CREATE INDEX IF NOT EXISTS idx_incidents_verification_status ON incidents(verification_status);

-- Update any existing records with null submitter_role to 'unknown'
UPDATE incidents 
SET submitter_role = 'unknown' 
WHERE submitter_role IS NULL AND submitted_by IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN incidents.submitter_ip IS 'IP address for guest submissions (null for authenticated users)';
COMMENT ON COLUMN incidents.submitter_role IS 'Role of submitter: guest, user, editor, analyst, admin';
