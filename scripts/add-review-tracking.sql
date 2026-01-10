-- Add review tracking columns to incidents table
-- Supports two-analyst review workflow before publication

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS first_review_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS first_review_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS second_review_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS second_review_at TIMESTAMP;

-- Update existing verified incidents to have both reviews completed
UPDATE incidents 
SET 
  verification_status = 'verified',
  first_review_at = updated_at,
  second_review_at = updated_at
WHERE verified = true;

-- Update unverified incidents to pending
UPDATE incidents 
SET verification_status = 'pending'
WHERE verified = false OR verified IS NULL;

-- Add check constraint for verification_status values
ALTER TABLE incidents 
DROP CONSTRAINT IF EXISTS incidents_verification_status_check;

ALTER TABLE incidents 
ADD CONSTRAINT incidents_verification_status_check 
CHECK (verification_status IN ('pending', 'first_review', 'verified'));

-- Create index for querying by verification status
CREATE INDEX IF NOT EXISTS idx_incidents_verification_status ON incidents(verification_status);
CREATE INDEX IF NOT EXISTS idx_incidents_first_review_by ON incidents(first_review_by);
CREATE INDEX IF NOT EXISTS idx_incidents_second_review_by ON incidents(second_review_by);

COMMENT ON COLUMN incidents.verification_status IS 'Workflow: pending -> first_review -> verified';
COMMENT ON COLUMN incidents.first_review_by IS 'User ID of first analyst who reviewed';
COMMENT ON COLUMN incidents.first_review_at IS 'Timestamp of first review submission';
COMMENT ON COLUMN incidents.second_review_by IS 'User ID of second analyst who reviewed';
COMMENT ON COLUMN incidents.second_review_at IS 'Timestamp of second review, publishes incident';
