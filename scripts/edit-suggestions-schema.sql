-- Edit Suggestions Schema
-- Allows users to suggest edits to existing cases
-- Requires approval from two different analysts

CREATE TABLE IF NOT EXISTS edit_suggestions (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  suggested_by INTEGER NOT NULL REFERENCES users(id),
  
  -- What's being edited
  field_name VARCHAR(100) NOT NULL,
  current_value TEXT,
  suggested_value TEXT NOT NULL,
  reason TEXT, -- Why they're suggesting this change
  
  -- Review status: pending -> first_review -> approved/rejected
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'first_review', 'approved', 'rejected')),
  
  -- First review
  first_reviewed_by INTEGER REFERENCES users(id),
  first_reviewed_at TIMESTAMP,
  first_review_notes TEXT,
  first_review_decision VARCHAR(20) CHECK (first_review_decision IN ('approve', 'reject')),
  
  -- Second review (only if first approved)
  second_reviewed_by INTEGER REFERENCES users(id),
  second_reviewed_at TIMESTAMP,
  second_review_notes TEXT,
  
  -- Applied tracking
  applied_at TIMESTAMP,
  applied_by INTEGER REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_edit_suggestions_incident ON edit_suggestions(incident_id);
CREATE INDEX IF NOT EXISTS idx_edit_suggestions_status ON edit_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_edit_suggestions_suggested_by ON edit_suggestions(suggested_by);

-- Comments
COMMENT ON TABLE edit_suggestions IS 'User-suggested edits to existing cases requiring two-analyst approval';
COMMENT ON COLUMN edit_suggestions.field_name IS 'The incident field being edited (e.g., victim_name, description, facility_name)';
COMMENT ON COLUMN edit_suggestions.status IS 'pending=awaiting first review, first_review=awaiting second review, approved=accepted and applied, rejected=denied';
