# Advanced Project Settings Plan

## Overview

This document outlines the advanced settings system for customizing forms, workflows, quote requirements, and storage tracking.

## Current State

### What Already Exists
- **Project Settings Table** - Has `settings` JSONB column (mostly unused) + dedicated columns for common flags
- **Record Type Settings** - `guest_form_enabled`, `requires_review`, `requires_validation`
- **Field Visibility Flags** - `show_in_guest_form`, `show_in_review_form`, `show_in_validation_form`, `show_in_public_view`
- **Quote Requirements** - `requires_quote` on field_definitions
- **Storage Tracking** - Full system with plans, subscriptions, usage tracking
- **Settings UI** - 4-tab settings page (General, Tags, Storage, Permissions)

### What's Missing
1. **Per-record-type advanced settings** for quote/source requirements
2. **Role-based bypass permissions** for validation rules
3. **Guest form field selector** (easy way to pick fields from review form)
4. **Quote-to-source linking requirements**
5. **Database usage tracking** (not just file storage)

---

## New Settings Structure

### 1. Record Type Settings (per-type customization)

Add to `record_types` table:
```sql
-- Form settings
guest_form_mode VARCHAR(20) DEFAULT 'custom', -- 'custom', 'mirror_review', 'disabled'
analyst_can_skip_guest_form BOOLEAN DEFAULT true,

-- Quote/Source requirements
require_quotes_for_review BOOLEAN DEFAULT false,
require_sources_for_quotes BOOLEAN DEFAULT false,
allow_quote_requirement_bypass BOOLEAN DEFAULT false,
quote_bypass_roles VARCHAR(100)[] DEFAULT '{}', -- ['admin', 'validator']

-- Validation requirements
require_all_fields_verified BOOLEAN DEFAULT false,
allow_validation_bypass BOOLEAN DEFAULT false,
validation_bypass_roles VARCHAR(100)[] DEFAULT '{}',

-- Settings JSONB for extensibility
type_settings JSONB DEFAULT '{}'
```

### 2. Field Definition Enhancements

Already has `requires_quote`. Add:
```sql
requires_source_for_quote BOOLEAN DEFAULT false, -- Quote must have source
require_verified_for_publish BOOLEAN DEFAULT true, -- Field must be verified to publish
```

### 3. Project Storage Tracking Enhancements

Add database usage tracking to `project_storage_usage`:
```sql
database_bytes BIGINT DEFAULT 0,
record_count INTEGER DEFAULT 0,
field_definition_count INTEGER DEFAULT 0
```

### 4. User Storage Limits

Add to `users` table:
```sql
storage_quota_bytes BIGINT DEFAULT 1073741824, -- 1GB default
total_storage_used BIGINT DEFAULT 0
```

---

## UI Implementation Plan

### Settings Page Tabs (Enhanced)

1. **General** (existing)
   - Name, description
   - Public visibility options

2. **Forms & Workflow** (NEW)
   - Per-record-type settings cards
   - Guest form mode selector
   - Quote/source requirement toggles
   - Bypass role configuration

3. **Tags** (existing)

4. **Storage** (enhanced)
   - File storage usage (existing)
   - Database usage (NEW)
   - Per-user breakdown
   - Record/field counts

5. **Permissions** (existing)
   - Member upload settings

### Record Type Settings Page (NEW)

Located at: `/projects/[slug]/record-types/[type]/settings`

- **Form Settings**
  - Guest form mode radio (Custom / Mirror Review / Disabled)
  - "Select fields for guest form" multi-checkbox
  - "Analysts can skip to review form" toggle

- **Quote Requirements**
  - "All fields require quotes for review" toggle
  - "Per-field quote requirements" (shows when above is off)
  - "Quotes require sources" toggle
  - "Allow bypass for roles" multi-select

- **Validation Requirements**
  - "All fields must be verified" toggle
  - "Allow bypass for roles" multi-select

---

## Database Migration

```sql
-- Migration: 014-advanced-settings.sql

-- Record type enhancements
ALTER TABLE record_types
  ADD COLUMN IF NOT EXISTS guest_form_mode VARCHAR(20) DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS analyst_can_skip_guest_form BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_quotes_for_review BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_sources_for_quotes BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_quote_requirement_bypass BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS quote_bypass_roles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS require_all_fields_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_validation_bypass BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_bypass_roles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS type_settings JSONB DEFAULT '{}';

-- Field definition enhancements
ALTER TABLE field_definitions
  ADD COLUMN IF NOT EXISTS requires_source_for_quote BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_verified_for_publish BOOLEAN DEFAULT true;

-- Database usage tracking
ALTER TABLE project_storage_usage
  ADD COLUMN IF NOT EXISTS database_bytes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS record_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS field_count INTEGER DEFAULT 0;

-- User storage limits
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS storage_quota_bytes BIGINT DEFAULT 1073741824,
  ADD COLUMN IF NOT EXISTS total_storage_used_bytes BIGINT DEFAULT 0;

-- Function to calculate database usage
CREATE OR REPLACE FUNCTION calculate_project_database_usage(p_project_id INTEGER)
RETURNS TABLE(total_bytes BIGINT, record_count INTEGER, field_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (
      SELECT COALESCE(SUM(pg_column_size(r.*)), 0)::BIGINT
      FROM records r WHERE r.project_id = p_project_id AND r.deleted_at IS NULL
    ) + (
      SELECT COALESCE(SUM(pg_column_size(rq.*)), 0)::BIGINT
      FROM record_quotes rq
      JOIN records r ON rq.record_id = r.id
      WHERE r.project_id = p_project_id
    ) + (
      SELECT COALESCE(SUM(pg_column_size(rs.*)), 0)::BIGINT
      FROM record_sources rs
      JOIN records r ON rs.record_id = r.id
      WHERE r.project_id = p_project_id
    ) AS total_bytes,
    (SELECT COUNT(*)::INTEGER FROM records WHERE project_id = p_project_id AND deleted_at IS NULL) AS record_count,
    (SELECT COUNT(*)::INTEGER FROM field_definitions fd 
     JOIN record_types rt ON fd.record_type_id = rt.id 
     WHERE rt.project_id = p_project_id) AS field_count;
END;
$$ LANGUAGE plpgsql;
```

---

## API Endpoints

### New Endpoints

```
GET    /api/projects/[slug]/record-types/[type]/settings
PATCH  /api/projects/[slug]/record-types/[type]/settings

GET    /api/projects/[slug]/usage/database
GET    /api/users/me/storage
```

### Updated Endpoints

```
GET    /api/projects/[slug]/storage  -- Add database usage
PATCH  /api/projects/[slug]/record-types/[type]  -- Add new fields
```

---

## Implementation Priority

### Phase 1: Database & Core (This PR)
1. ✅ Create migration
2. ✅ Update TypeScript types
3. ✅ Update record type API endpoints
4. ✅ Add database usage calculation

### Phase 2: Settings UI
1. Record type settings page
2. Enhanced storage display
3. Guest form field selector

### Phase 3: Enforcement
1. Quote requirement validation in review workflow
2. Source requirement validation
3. Bypass permission checks
4. Validation requirement checks

### Phase 4: Extension Integration
1. Extension respects these settings
2. Shows appropriate forms based on user role
3. Enforces quote/source requirements
