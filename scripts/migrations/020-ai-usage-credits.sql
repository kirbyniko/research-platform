-- Migration: 020 - AI Usage Tracking & Credits System
-- Purpose: Rate limit AI template generation and enable prepaid credits
-- Date: 2026-01-24

-- =====================================================
-- AI USAGE TRACKING
-- =====================================================
-- Track all AI generation requests per user for rate limiting

CREATE TABLE IF NOT EXISTS ai_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- What type of AI operation
  operation_type VARCHAR(50) NOT NULL DEFAULT 'template_generation',
  
  -- Which model was used
  model_name VARCHAR(100),
  
  -- Token counts (for cost tracking)
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  
  -- Did it use credits or free tier?
  credits_used INTEGER DEFAULT 0,
  was_free_tier BOOLEAN DEFAULT true,
  
  -- Request metadata
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  record_type_id INTEGER REFERENCES record_types(id) ON DELETE SET NULL,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  response_time_ms INTEGER
);

-- Index for rate limiting queries (requests per user per time period)
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_time 
  ON ai_usage(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_operation 
  ON ai_usage(operation_type, created_at DESC);

-- =====================================================
-- USER CREDITS
-- =====================================================
-- Track prepaid AI credits per user

CREATE TABLE IF NOT EXISTS user_credits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Current balance (in "credits" - 1 credit = 1 AI request)
  balance INTEGER DEFAULT 0,
  
  -- Lifetime stats
  total_purchased INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREDIT TRANSACTIONS
-- =====================================================
-- Audit log of all credit changes

CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Transaction type: 'purchase', 'usage', 'refund', 'bonus', 'admin_adjustment'
  transaction_type VARCHAR(50) NOT NULL,
  
  -- Positive for additions, negative for usage
  amount INTEGER NOT NULL,
  
  -- Balance after this transaction
  balance_after INTEGER NOT NULL,
  
  -- Payment reference (for purchases)
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  
  -- What was this credit used for? (for usage transactions)
  ai_usage_id INTEGER REFERENCES ai_usage(id) ON DELETE SET NULL,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user 
  ON credit_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_stripe 
  ON credit_transactions(stripe_payment_intent_id) 
  WHERE stripe_payment_intent_id IS NOT NULL;

-- =====================================================
-- RATE LIMIT SETTINGS
-- =====================================================
-- Configurable rate limits per tier

CREATE TABLE IF NOT EXISTS rate_limit_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  
  -- Limits per time window
  requests_per_hour INTEGER DEFAULT 5,
  requests_per_day INTEGER DEFAULT 20,
  requests_per_month INTEGER DEFAULT 100,
  
  -- Is this a paid tier?
  requires_credits BOOLEAN DEFAULT false,
  credits_per_request INTEGER DEFAULT 1,
  
  -- Description
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO rate_limit_tiers (name, requests_per_hour, requests_per_day, requests_per_month, requires_credits, credits_per_request, description)
VALUES 
  ('free', 3, 10, 50, false, 0, 'Free tier - limited AI template generation'),
  ('basic', 10, 50, 500, true, 1, 'Basic paid tier - 1 credit per request'),
  ('pro', 50, 200, 2000, true, 1, 'Pro tier - higher limits, same credit cost'),
  ('unlimited', 1000, 10000, 100000, true, 1, 'Unlimited tier - very high limits')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- USER TIER ASSIGNMENT
-- =====================================================
-- Which tier each user is on

ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- =====================================================
-- TRIGGER: Update credits timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_credits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_credits_updated_at ON user_credits;
CREATE TRIGGER user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_user_credits_timestamp();
