-- CRITICAL SECURITY FIX: Ensure verification_status is properly set
-- This prevents unverified incidents from being served to the public

-- First, check current state
SELECT 
  verification_status,
  verified,
  COUNT(*) as count
FROM incidents 
GROUP BY verification_status, verified
ORDER BY verification_status, verified;

-- Update any incidents where verified=true but verification_status is not 'verified'
-- These should have been updated by add-review-tracking.sql but may not have been
UPDATE incidents 
SET verification_status = 'verified'
WHERE verified = true 
  AND (verification_status IS NULL OR verification_status != 'verified');

-- Update any incidents where verified=false but verification_status is not 'pending'
UPDATE incidents 
SET verification_status = 'pending'
WHERE (verified = false OR verified IS NULL)
  AND (verification_status IS NULL OR verification_status = 'verified');

-- Verify the fix
SELECT 
  verification_status,
  verified,
  COUNT(*) as count
FROM incidents 
GROUP BY verification_status, verified
ORDER BY verification_status, verified;

-- Add NOT NULL constraint to verification_status if not already present
ALTER TABLE incidents 
ALTER COLUMN verification_status SET DEFAULT 'pending',
ALTER COLUMN verification_status SET NOT NULL;
