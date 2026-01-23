-- Migration: 018 - Add conditional visibility support to field groups
-- Purpose: Allow field groups to be shown/hidden based on field values
-- Date: 2026-01-15

-- Add config column to field_groups for conditional visibility
ALTER TABLE field_groups 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Add index for querying config (especially for show_when conditions)
CREATE INDEX IF NOT EXISTS idx_field_groups_config ON field_groups USING gin(config);

-- Comment describing the config structure
COMMENT ON COLUMN field_groups.config IS 'JSONB configuration including show_when: { field: string, operator: string, value: any, value2?: any }';
